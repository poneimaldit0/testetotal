// Arquivo mantido para compatibilidade com imports antigos
// Agora usando src/types/comparacao.ts

export interface CodigoAcesso {
  id: string;
  orcamento_id: string;
  candidatura_id: string;
  codigo_orcamento: string;
  codigo_fornecedor: string;
  created_at: string;
  expires_at?: string;
  visualizacoes: number;
  ultimo_acesso?: string;
}

export interface ItemProposta {
  id: string;
  nome: string;
  descricao?: string;
  incluido: boolean;
  valor_estimado: number;
  ambientes: string[];
  observacoes?: string;
  ordem: number;
}

export interface CategoriaProposta {
  itens: ItemProposta[];
  subtotal: number;
}

export interface PropostaDetalhada {
  valor_total_estimado: number;
  status: string;
  observacoes_gerais?: string;
  notificado: boolean;
  data_notificacao?: string;
  created_at?: string;
  updated_at?: string;
  forma_pagamento?: any[];
  categorias: Record<string, CategoriaProposta>;
}

export interface CandidaturaComCodigo {
  candidatura_id: string;
  nome: string;
  email: string;
  empresa: string;
  telefone: string;
  data_candidatura: string;
  status_acompanhamento?: string;
  codigo_acesso?: CodigoAcesso;
}

export interface PropostaComCodigo {
  id: string;
  candidatura_id: string;
  codigo_orcamento: string;
  codigo_fornecedor: string;
  orcamento: {
    id: string;
    necessidade: string;
    local: string;
    categorias: string[];
    tamanho_imovel?: number;
    data_publicacao: string;
    prazo_inicio_texto?: string;
  };
  candidatura: {
    id: string;
    fornecedor_id: string;
    nome: string;
    email: string;
    empresa: string;
    telefone: string;
    data_candidatura: string;
    status_acompanhamento?: string;
  };
  proposta: PropostaDetalhada;
  codigo_info?: {
    visualizacoes: number;
    expires_at: string;
  };
}