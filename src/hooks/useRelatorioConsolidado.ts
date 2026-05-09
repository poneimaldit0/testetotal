import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { RelatorioFluxoCaixa } from '@/types/financeiro';

interface FiltrosExport {
  dataInicio: string;
  dataFim: string;
  incluirPagas: boolean;
  incluirRecebidas: boolean;
  incluirPendentes: boolean;
  busca: string;
}

export const useRelatorioConsolidado = () => {
  const [loading, setLoading] = useState(false);
  const [relatorio, setRelatorio] = useState<RelatorioFluxoCaixa | null>(null);
  const { toast } = useToast();

  const buscarRelatorio = async (
    dataInicio: string,
    dataFim: string,
    statusSelecionados: string[] = [],
    busca: string = ''
  ): Promise<void> => {
    setLoading(true);
    
    try {
      // Usar a função SQL existente do fluxo de caixa
      const { data: movimentacoesData, error } = await supabase.rpc(
        'relatorio_fluxo_caixa',
        {
          p_data_inicio: dataInicio,
          p_data_fim: dataFim,
          p_incluir_pagas: true, // Sempre incluir todas para filtrar depois
          p_status_filtros: statusSelecionados.length > 0 ? statusSelecionados : null
        }
      );

      if (error) {
        console.error('Erro ao buscar relatório consolidado:', error);
        throw error;
      }

      if (!movimentacoesData) {
        setRelatorio({
          periodo: { inicio: dataInicio, fim: dataFim },
          saldo_inicial: 0,
          saldo_final: 0,
          movimentacoes: [],
          totais: {
            total_entradas: 0,
            total_saidas: 0,
            saldo_liquido: 0,
            entradas_pendentes: 0,
            saidas_pendentes: 0
          },
          resumo_categorias: []
        });
        return;
      }

      // Processar e filtrar movimentações
      let movimentacoes = movimentacoesData.map((item: any) => ({
        id: item.id,
        data_vencimento: item.data_vencimento,
        tipo: item.tipo,
        descricao: item.descricao,
        cliente_fornecedor: item.cliente_fornecedor,
        categoria: item.categoria,
        subcategoria: item.subcategoria || 'Sem apropriação',
        valor_original: Number(item.valor_original),
        valor_pago: Number(item.valor_pago || 0),
        valor_recebido: Number(item.valor_recebido || 0),
        status: item.status,
        saldo_acumulado: 0, // Será calculado se necessário
        origem: item.origem,
        email: item.email,
        telefone: item.telefone
      }));

      // Aplicar filtro de busca se fornecido
      if (busca) {
        const buscaLower = busca.toLowerCase();
        movimentacoes = movimentacoes.filter((mov: any) =>
          mov.descricao.toLowerCase().includes(buscaLower) ||
          mov.cliente_fornecedor.toLowerCase().includes(buscaLower) ||
          mov.categoria.toLowerCase().includes(buscaLower)
        );
      }

      // Calcular totais
      const entradas = movimentacoes.filter((m: any) => m.tipo === 'entrada');
      const saidas = movimentacoes.filter((m: any) => m.tipo === 'saida');

      const totalEntradas = entradas.reduce((acc: number, item: any) => 
        acc + (item.valor_recebido > 0 ? item.valor_recebido : item.valor_original), 0
      );
      
      const totalSaidas = saidas.reduce((acc: number, item: any) => 
        acc + (item.valor_pago > 0 ? item.valor_pago : item.valor_original), 0
      );

      const entradasPendentes = entradas
        .filter((m: any) => m.status === 'pendente')
        .reduce((acc: number, item: any) => acc + item.valor_original, 0);

      const saidasPendentes = saidas
        .filter((m: any) => m.status === 'pendente')
        .reduce((acc: number, item: any) => acc + item.valor_original, 0);

      setRelatorio({
        periodo: { inicio: dataInicio, fim: dataFim },
        saldo_inicial: 0,
        saldo_final: totalEntradas - totalSaidas,
        movimentacoes,
        totais: {
          total_entradas: totalEntradas,
          total_saidas: totalSaidas,
          saldo_liquido: totalEntradas - totalSaidas,
          entradas_pendentes: entradasPendentes,
          saidas_pendentes: saidasPendentes
        },
        resumo_categorias: []
      });

      toast({
        title: "Relatório carregado",
        description: `Encontradas ${movimentacoes.length} movimentações no período`,
      });

    } catch (error: any) {
      console.error('Erro detalhado:', error);
      toast({
        title: "Erro ao carregar relatório",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
      setRelatorio(null);
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = async (
    relatorioData: RelatorioFluxoCaixa,
    filtros: FiltrosExport
  ): Promise<void> => {
    try {
      setLoading(true);
      
      // Criar dados para o Excel
      const dadosExcel = relatorioData.movimentacoes.map(mov => ({
        'Data': format(parseISO(mov.data_vencimento + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }),
        'Tipo': mov.tipo === 'entrada' ? 'Entrada' : 'Saída',
        'Descrição': mov.descricao,
        'Cliente/Fornecedor': mov.cliente_fornecedor,
        'Categoria': mov.categoria,
        'Subcategoria': mov.subcategoria,
        'Valor Original': mov.valor_original,
        'Valor Pago': mov.valor_pago,
        'Valor Recebido': mov.valor_recebido,
        'Valor Efetivo': mov.tipo === 'entrada' 
          ? (mov.valor_recebido > 0 ? mov.valor_recebido : mov.valor_original)
          : (mov.valor_pago > 0 ? mov.valor_pago : mov.valor_original),
        'Status': mov.status,
        'Email': mov.email || '',
        'Telefone': mov.telefone || ''
      }));

      // Criar workbook e worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dadosExcel);

      // Adicionar resumo no topo
      const resumo = [
        ['RELATÓRIO FINANCEIRO CONSOLIDADO'],
        [''],
        ['Período:', `${format(parseISO(filtros.dataInicio + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })} a ${format(parseISO(filtros.dataFim + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}`],
        ['Total de Registros:', relatorioData.movimentacoes.length],
        [''],
        ['RESUMO FINANCEIRO:'],
        ['Total Entradas:', relatorioData.totais.total_entradas],
        ['Total Saídas:', relatorioData.totais.total_saidas],
        ['Saldo Líquido:', relatorioData.totais.saldo_liquido],
        [''],
        ['MOVIMENTAÇÕES:']
      ];

      // Inserir resumo no início da planilha
      XLSX.utils.sheet_add_aoa(ws, resumo, { origin: 'A1' });
      
      // Ajustar a posição dos dados
      const dadosComResumo = XLSX.utils.json_to_sheet(dadosExcel);
      XLSX.utils.sheet_add_json(ws, dadosExcel, { origin: 'A12', skipHeader: false });

      // Formatação das colunas
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      ws['!cols'] = [
        { wch: 12 }, // Data
        { wch: 10 }, // Tipo
        { wch: 40 }, // Descrição
        { wch: 30 }, // Cliente/Fornecedor
        { wch: 20 }, // Categoria
        { wch: 20 }, // Subcategoria
        { wch: 15 }, // Valor Original
        { wch: 15 }, // Valor Pago
        { wch: 15 }, // Valor Recebido
        { wch: 15 }, // Valor Efetivo
        { wch: 12 }, // Status
        { wch: 30 }, // Email
        { wch: 15 }  // Telefone
      ];

      // Adicionar a planilha ao workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Relatório Consolidado');

      // Gerar nome do arquivo
      const nomeArquivo = `relatorio-consolidado-${format(parseISO(filtros.dataInicio + 'T12:00:00'), 'yyyy-MM-dd')}-a-${format(parseISO(filtros.dataFim + 'T12:00:00'), 'yyyy-MM-dd')}.xlsx`;

      // Fazer download
      XLSX.writeFile(wb, nomeArquivo);

      toast({
        title: "Exportação concluída",
        description: "Arquivo Excel baixado com sucesso!",
      });

    } catch (error: any) {
      console.error('Erro ao exportar Excel:', error);
      toast({
        title: "Erro na exportação",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    relatorio,
    buscarRelatorio,
    exportarExcel
  };
};