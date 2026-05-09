// Tipos para relatórios de LT (Lifetime) e Churn

export interface CoorteData {
  coorte: string;
  total_cadastrados: number;
  ainda_ativos: number;
  churned: number;
  churn_rate: number;
  lt_medio: number;
}

export interface DistribuicaoFaixa {
  faixa: string;
  quantidade: number;
  percentual: number;
}

export interface DistribuicaoLT {
  percentis: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
  faixas: DistribuicaoFaixa[];
}

export interface SobrevivenciaData {
  dias: number;
  sobreviventes: number;
  taxa_sobrevivencia: number;
}

export interface RelatorioLTChurnData {
  // Métricas gerais
  total_fornecedores: number;
  fornecedores_ativos: number;
  fornecedores_churned: number;
  
  // Lifetime médios
  lt_medio_geral: number;
  lt_medio_ativos: number;
  lt_medio_churned: number;
  
  // Churn rates
  churn_rate_periodo: number;
  churn_rate_mensal: number;
  
  // Métricas por coorte
  coortes_dados: CoorteData[];
  
  // Distribuição de lifetime
  distribuicao_lt: DistribuicaoLT;
  
  // Dados para curva de sobrevivência
  curva_sobrevivencia: SobrevivenciaData[];
  
  // Comparação com período anterior
  comparacao_periodo_anterior: Record<string, any>;
}

export interface FiltrosRelatorioLTChurn {
  dataInicio?: string;
  dataFim?: string;
  agrupamento?: 'mensal' | 'trimestral' | 'anual';
}

// Tipos para Relatório de Inscrições de Hoje
export interface OrcamentoInscritoHoje {
  orcamento_id: string;
  codigo_orcamento: string;
  necessidade: string;
  local: string;
  data_candidatura: string;
  status?: string;
}

export interface InscricaoHojeResumo {
  fornecedor_id: string;
  fornecedor_nome: string;
  empresa: string;
  total_inscricoes: number;
  orcamentos: OrcamentoInscritoHoje[];
}

// Tipos para Relatório de Experiência do Fornecedor
export interface GatilhoCS {
  tipo: 'inatividade' | 'orcamentos_abertos' | 'marco_temporal';
  valor: number;
}

export interface AcaoSugerida {
  tipo: 'mensagem' | 'reuniao_online' | 'reuniao_presencial' | 'marco';
  titulo: string;
  template: string;
  link_reuniao?: string | null;
}

export interface FornecedorExperiencia {
  id: string;
  nome: string;
  empresa: string;
  email: string;
  telefone: string;
  data_cadastro: string;
  dias_plataforma: number;
  ultimo_acesso: string | null;
  dias_inativo: number;
  total_inscricoes: number;
  orcamentos_abertos: number;
  propostas_enviadas: number;
  taxa_conversao: number;
  data_termino_contrato: string | null;
  dias_restantes_contrato: number | null;
  status_contrato: 'sem_prazo' | 'vencido' | 'vencendo' | 'ativo' | 'inativo' | 'sem_prazo_inativo';
  nivel_alerta: 'critico' | 'atencao' | 'ok' | 'marco';
  gatilhos_ativos: GatilhoCS[];
  acao_sugerida: AcaoSugerida;
  prioridade: number;
}

export interface ResumoExperienciaFornecedor {
  total_ativos: number;
  criticos: number;
  atencao: number;
  saudaveis: number;
  marcos: number;
}

// Tipos para Histórico de Inscrições por Fornecedor
export interface HistoricoInscricaoDia {
  data: string;
  total_inscricoes: number;
  orcamentos: OrcamentoInscritoHoje[];
}