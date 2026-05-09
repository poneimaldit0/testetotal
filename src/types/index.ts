
export interface Fornecedor {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  dataInscricao: Date;
}

export interface Orcamento {
  id: string;
  dataPublicacao: Date;
  data_publicacao?: string;
  created_at?: string;
  updated_at?: string;
  necessidade: string;
  arquivos: File[];
  fotos: File[];
  categorias: string[];
  local: string;
  tamanhoImovel: number;
  dataInicio: Date;
  prazoInicioTexto?: string; // Nova propriedade para o texto do prazo
  quantidadeEmpresas: number;
  status: 'aberto' | 'fechado' | 'pausado';
  fornecedoresInscritos: Fornecedor[];
  gestorContaId?: string;
  gestor_conta_id?: string;
  gestor_conta?: {
    id: string;
    nome: string;
    email: string;
    empresa: string;
    status: string;
  };
  dadosContato?: {
    nome?: string;
    telefone?: string;
    email?: string;
  };
  prazo_explicitamente_definido?: boolean;
  prazo_envio_proposta_dias?: number;
  budget_informado?: number;
  data_liberacao_fornecedores?: string | null;
  rota100_token?: string | null;
  horariosVisita?: {
    id: string;
    data_hora: string;
    fornecedor_id?: string | null;
    fornecedor_nome?: string | null;
  }[];
}

export interface NovoOrcamentoInput {
  necessidade: string;
  categorias: string[];
  local: string;
  tamanho_imovel?: number;
  tamanhoImovel?: number;
  data_inicio?: string;
  dataInicio?: Date;
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
  status?: string;
  data_publicacao?: string;
  dataPublicacao?: Date;
  gestor_conta_id?: string;
  gestorContaId?: string;
  prazo_explicitamente_definido?: boolean;
  prazo_envio_proposta_dias?: number;
  budget_informado?: number;
  produto_segmentacao_id?: string | null;
  data_liberacao_fornecedores?: string | null;
  tipo_atendimento_tecnico?: 'presencial' | 'online' | null;
  data_atendimento_tecnico?: string | null;
  hora_atendimento_tecnico?: string | null;
  arquivos: File[];
  fotos: File[];
  videos: File[];
}

export interface User {
  id: string;
  email: string;
  nome: string;
  telefone: string;
  empresa: string;
  tipo_usuario: string;
  status: string;
  limite_acessos_diarios: number;
  limite_acessos_mensais: number;
  acessos_diarios: number;
  acessos_mensais: number;
  data_criacao: string;
  data_termino_contrato: string | null;
  ultimo_login: string | null;
  created_at: string;
  updated_at: string;
}

export const CATEGORIAS_SERVICO = [
  'Reforma Geral',
  'Pintura',
  'Elétrica',
  'Hidráulica',
  'Marcenaria',
  'Alvenaria',
  'Telhado',
  'Piso',
  'Paisagismo',
  'Outros'
];

export interface Aviso {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: 'info' | 'warning' | 'success' | 'error';
  ativo: boolean;
  data_inicio: string | null;
  data_fim: string | null;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
}
