import * as XLSX from 'xlsx';
import type { FornecedorExperiencia, ResumoExperienciaFornecedor } from '@/types/relatorios';

export const exportarExperienciaFornecedorExcel = (
  fornecedores: FornecedorExperiencia[],
  resumo: ResumoExperienciaFornecedor
): boolean => {
  try {
    const formatarStatusContrato = (status: string) => {
      const mapa: Record<string, string> = {
        'ativo': 'Ativo',
        'vencendo': 'Vencendo',
        'vencido': 'Vencido',
        'sem_prazo': 'Sem Prazo',
        'inativo': 'Inativo',
        'sem_prazo_inativo': 'Sem Prazo (Inativo)'
      };
      return mapa[status] || status;
    };

    const formatarNivelAlerta = (nivel: string) => {
      const mapa: Record<string, string> = {
        'critico': 'Crítico',
        'atencao': 'Atenção',
        'ok': 'Saudável',
        'marco': 'Marco'
      };
      return mapa[nivel] || nivel;
    };

    const formatarData = (data: string | null) => {
      if (!data) return '-';
      try {
        return new Date(data).toLocaleDateString('pt-BR');
      } catch {
        return data;
      }
    };

    const dadosPlanilha = fornecedores.map(f => ({
      'Nome': f.nome,
      'Empresa': f.empresa,
      'E-mail': f.email,
      'Telefone': f.telefone,
      'Nível Alerta': formatarNivelAlerta(f.nivel_alerta),
      'Status Contrato': formatarStatusContrato(f.status_contrato),
      'Dias Inativo': f.dias_inativo,
      'Dias na Plataforma': f.dias_plataforma,
      'Orçamentos Abertos': f.orcamentos_abertos,
      'Total Inscrições': f.total_inscricoes,
      'Propostas Enviadas': f.propostas_enviadas,
      'Taxa Conversão (%)': f.taxa_conversao,
      'Data Cadastro': formatarData(f.data_cadastro),
      'Término Contrato': formatarData(f.data_termino_contrato),
      'Ação Sugerida': f.acao_sugerida.titulo
    }));

    const ws = XLSX.utils.json_to_sheet(dadosPlanilha);

    ws['!cols'] = [
      { wch: 30 },
      { wch: 35 },
      { wch: 30 },
      { wch: 15 },
      { wch: 12 },
      { wch: 18 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 15 },
      { wch: 18 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 45 },
    ];

    const resumoData = [
      ['Resumo - Experiência do Fornecedor'],
      [''],
      ['Ação Urgente (Críticos)', resumo.criticos],
      ['Requer Atenção', resumo.atencao],
      ['Saudáveis', resumo.saudaveis],
      ['Total Ativos', resumo.total_ativos],
      [''],
      ['Data de Exportação', new Date().toLocaleString('pt-BR')],
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
    wsResumo['!cols'] = [{ wch: 30 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fornecedores');
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    const dataAtual = new Date().toISOString().split('T')[0];
    const nomeArquivo = `relatorio-experiencia-fornecedor-${dataAtual}.xlsx`;

    XLSX.writeFile(wb, nomeArquivo);
    return true;
  } catch (error) {
    console.error('Erro ao exportar relatório:', error);
    return false;
  }
};
