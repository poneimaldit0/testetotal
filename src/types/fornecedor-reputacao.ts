export interface PortfolioFornecedor {
  id: string;
  fornecedor_id: string;
  titulo: string;
  descricao?: string;
  imagem_url?: string;
  categoria: string;
  data_projeto?: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface AvaliacaoFornecedor {
  id: string;
  fornecedor_id: string;
  orcamento_id?: string;
  cliente_nome: string;
  cliente_email?: string;
  nota_geral: number;
  prazo?: number;
  qualidade?: number;
  gestao_mao_obra?: number;
  gestao_materiais?: number;
  custo_planejado?: number;
  comentario?: string;
  data_avaliacao: string;
  created_at: string;
}

export interface DepoimentoFornecedor {
  id: string;
  fornecedor_id: string;
  cliente_nome: string;
  depoimento: string;
  data_depoimento?: string;
  ativo: boolean;
  criado_por_admin?: string;
  created_at: string;
  updated_at: string;
}

export interface SeloFornecedor {
  id: string;
  fornecedor_id: string;
  nome_selo: string;
  descricao?: string;
  cor: string;
  icone?: string;
  data_concessao: string;
  data_expiracao?: string;
  ativo: boolean;
  concedido_por?: string;
  created_at: string;
  updated_at: string;
}

export interface MediaAvaliacoes {
  nota_geral: number;
  prazo: number;
  qualidade: number;
  gestao_mao_obra: number;
  gestao_materiais: number;
  custo_planejado: number;
  total_avaliacoes: number;
}

export interface FornecedorReputacao {
  id: string;
  nome: string;
  empresa: string;
  descricao_fornecedor?: string;
  telefone?: string;
  email?: string;
  whatsapp?: string;
  site_url?: string;
  endereco?: string;
  logo_url?: string;
  portfolios: PortfolioFornecedor[];
  avaliacoes: AvaliacaoFornecedor[];
  depoimentos: DepoimentoFornecedor[];
  selos: SeloFornecedor[];
  media_avaliacoes: MediaAvaliacoes;
}