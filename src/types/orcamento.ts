export interface NovoOrcamentoInput {
  necessidade: string;
  categorias: string[];
  local: string;
  tamanho_imovel?: number;
  tamanhoImovel?: number;
  data_inicio?: string;
  prazoInicioTexto?: string;
  dados_contato?: {
    nome?: string;
    email?: string;
    telefone?: string;
  };
  dadosContato?: {
    nome?: string;
    email?: string;
    telefone?: string;
  };
  status?: 'aberto' | 'fechado' | 'pausado' | string;
  data_publicacao: string;
  dataPublicacao?: Date;
  gestor_conta_id?: string;
  gestorContaId?: string;
  prazo_explicitamente_definido?: boolean;
  prazo_envio_proposta_dias?: number;
  budget_informado?: number;
  produto_segmentacao_id?: string | null;
  data_liberacao_fornecedores?: string | null;
  arquivos: File[];
  fotos: File[];
  videos: File[];
}

export interface RpcResponse {
  success: boolean;
  error?: 'already_applied' | 'already_enrolled' | 'daily_limit_exceeded' | 'monthly_limit_exceeded' | 'limit_exceeded' | 'database_error' | 'horario_indisponivel';
  message?: string;
  limite_diario?: number;
  candidaturas_hoje?: number;
  limite_mensal?: number;
  candidaturas_mes?: number;
  // Legacy fields for backward compatibility
  acessos_hoje?: number;
  acessos_mes?: number;
}

export interface GestorConta {
  id: string;
  nome: string;
  email: string;
  empresa: string;
  status: string;
}

export interface Orcamento {
  id: string;
  codigo_orcamento?: string;
  necessidade: string;
  local: string;
  categorias: string[];
  data_inicio?: string;
  prazoInicioTexto?: string;
  tamanho_imovel?: number;
  dados_contato?: {
    nome?: string;
    email?: string;
    telefone?: string;
  };
  status?: string;
  data_publicacao: string;
  quantidade_empresas?: number;
  created_at: string;
  updated_at: string;
  gestor_conta_id?: string;
  gestor_conta?: GestorConta;
  prazo_explicitamente_definido?: boolean;
  prazo_envio_proposta_dias?: number;
  budget_informado?: number;
  inscricoes?: Inscricao[];
  candidaturas?: Candidatura[];
  // Campos para fechamento manual
  fechado_manualmente?: boolean;
  motivo_fechamento_manual?: string;
  data_fechamento_manual?: string;
  fechado_por_id?: string;
}

export interface Inscricao {
  id: string;
  orcamento_id: string;
  fornecedor_id?: string;
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  data_inscricao: string;
  status_acompanhamento?: string;
}

export interface Candidatura {
  id: string;
  orcamento_id: string;
  fornecedor_id: string;
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  data_candidatura: string;
  status_acompanhamento?: string;
  created_at: string;
  updated_at: string;
}