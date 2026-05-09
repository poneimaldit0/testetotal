import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { RelatorioFluxoCaixa, MovimentacaoFluxoCaixa } from '@/types/financeiro';

export const useFluxoCaixa = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const buscarFluxoCaixa = async (
    dataInicio: string,
    dataFim: string,
    incluirPagas: boolean = true,
    incluirEntradasFuturas: boolean = true,
    statusSelecionados: string[] = []
  ): Promise<RelatorioFluxoCaixa | null> => {
    setLoading(true);
    
    try {
      // Buscar saldo inicial das contas bancárias ativas
      const { data: contasBancarias, error: erroContas } = await supabase
        .from('contas_bancarias')
        .select('saldo_atual')
        .eq('ativa', true);

      if (erroContas) {
        console.error('Erro ao buscar contas bancárias:', erroContas);
        throw erroContas;
      }

      const saldoInicial = contasBancarias?.reduce((acc, conta) => 
        acc + Number(conta.saldo_atual || 0), 0
      ) || 0;

      // Buscar dados usando a função SQL
      const { data: movimentacoesData, error } = await supabase.rpc(
        'relatorio_fluxo_caixa',
        {
          p_data_inicio: dataInicio,
          p_data_fim: dataFim,
          p_incluir_pagas: incluirPagas,
          p_status_filtros: statusSelecionados.length > 0 ? statusSelecionados : null
        }
      );

      if (error) {
        console.error('Erro ao buscar fluxo de caixa:', error);
        throw error;
      }

      if (!movimentacoesData) {
        return {
          periodo: { inicio: dataInicio, fim: dataFim },
          saldo_inicial: saldoInicial,
          saldo_final: saldoInicial,
          movimentacoes: [],
          totais: {
            total_entradas: 0,
            total_saidas: 0,
            saldo_liquido: 0,
            entradas_pendentes: 0,
            saidas_pendentes: 0
          },
          resumo_categorias: []
        };
      }

      // Processar movimentações
      const hoje = new Date().toISOString().split('T')[0];
      let movimentacoes: MovimentacaoFluxoCaixa[] = movimentacoesData.map((item: any) => ({
        id: item.id,
        data_vencimento: item.data_vencimento,
        tipo: item.tipo,
        descricao: item.descricao,
        cliente_fornecedor: item.cliente_fornecedor,
        categoria: item.categoria,
        subcategoria: item.subcategoria,
        valor_original: Number(item.valor_original),
        valor_pago: Number(item.valor_pago || 0),
        valor_recebido: Number(item.valor_recebido || 0),
        status: item.status,
        saldo_acumulado: 0, // Será calculado depois
        origem: item.origem,
        email: item.email,
        telefone: item.telefone
      }));

      // Filtrar entradas futuras se necessário
      if (!incluirEntradasFuturas) {
        movimentacoes = movimentacoes.filter(mov => 
          !(mov.tipo === 'entrada' && mov.status === 'pendente' && mov.data_vencimento > hoje)
        );
      }

      // Calcular saldo acumulado
      let saldoAcumulado = saldoInicial;
      movimentacoes = movimentacoes.map((item) => {
        const valorMovimentacao = item.tipo === 'entrada' 
          ? (item.valor_recebido > 0 ? item.valor_recebido : item.valor_original)
          : -(item.valor_pago > 0 ? item.valor_pago : item.valor_original);
        
        // Para contas pendentes, considera o valor original
        const valorParaSaldo = item.status === 'pendente' 
          ? (item.tipo === 'entrada' ? item.valor_original : -item.valor_original)
          : valorMovimentacao;
        
        saldoAcumulado += valorParaSaldo;

        return {
          ...item,
          saldo_acumulado: saldoAcumulado
        };
      });

      // Calcular totais
      const entradas = movimentacoes.filter(m => m.tipo === 'entrada');
      const saidas = movimentacoes.filter(m => m.tipo === 'saida');

      const totalEntradas = entradas.reduce((acc, item) => 
        acc + (item.valor_recebido > 0 ? item.valor_recebido : item.valor_original), 0
      );
      
      const totalSaidas = saidas.reduce((acc, item) => 
        acc + (item.valor_pago > 0 ? item.valor_pago : item.valor_original), 0
      );

      const entradasPendentes = entradas
        .filter(m => m.status === 'pendente')
        .reduce((acc, item) => acc + item.valor_original, 0);

      const saidasPendentes = saidas
        .filter(m => m.status === 'pendente')
        .reduce((acc, item) => acc + item.valor_original, 0);

      // Resumo por categorias com subcategorias
      const categoriasMap = new Map<string, { 
        tipo: 'entrada' | 'saida'; 
        valor_total: number; 
        quantidade: number;
        subcategorias: Map<string, { valor_total: number; quantidade: number }>;
      }>();
      
      movimentacoes.forEach(mov => {
        const categoria = mov.categoria || 'Sem categoria';
        const subcategoria = mov.subcategoria || 'Sem apropriação';
        const key = `${categoria}-${mov.tipo}`;
        
        const valor = mov.tipo === 'entrada' 
          ? (mov.valor_recebido > 0 ? mov.valor_recebido : mov.valor_original)
          : (mov.valor_pago > 0 ? mov.valor_pago : mov.valor_original);
        
        // Atualizar categoria principal
        const atual = categoriasMap.get(key) || { 
          tipo: mov.tipo, 
          valor_total: 0, 
          quantidade: 0,
          subcategorias: new Map()
        };
        
        atual.valor_total += valor;
        atual.quantidade += 1;
        
        // Atualizar subcategoria
        const subcatAtual = atual.subcategorias.get(subcategoria) || { valor_total: 0, quantidade: 0 };
        subcatAtual.valor_total += valor;
        subcatAtual.quantidade += 1;
        atual.subcategorias.set(subcategoria, subcatAtual);
        
        categoriasMap.set(key, atual);
      });

      const resumo_categorias = Array.from(categoriasMap.entries()).map(([key, dados]) => ({
        categoria: key.split('-')[0],
        tipo: dados.tipo,
        valor_total: dados.valor_total,
        quantidade: dados.quantidade,
        subcategorias: Array.from(dados.subcategorias.entries()).map(([sub, subDados]) => ({
          subcategoria: sub,
          valor_total: subDados.valor_total,
          quantidade: subDados.quantidade
        }))
      }));

      return {
        periodo: { inicio: dataInicio, fim: dataFim },
        saldo_inicial: saldoInicial,
        saldo_final: saldoAcumulado,
        movimentacoes,
        totais: {
          total_entradas: totalEntradas,
          total_saidas: totalSaidas,
          saldo_liquido: totalEntradas - totalSaidas,
          entradas_pendentes: entradasPendentes,
          saidas_pendentes: saidasPendentes
        },
        resumo_categorias
      };

    } catch (error: any) {
      console.error('Erro detalhado:', error);
      toast({
        title: "Erro ao buscar fluxo de caixa",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    buscarFluxoCaixa
  };
};