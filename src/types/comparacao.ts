export interface TokenComparacao {
  id: string;
  orcamento_id: string;
  token_acesso: string;
  created_at: string;
  expires_at: string;
  usado: boolean;
  ultimo_acesso?: string;
  total_acessos: number;
  cliente_info?: any;
}

export interface FormaPagamentoData {
  tipo: 'a_vista' | 'entrada_medicoes' | 'medicoes' | 'boletos' | 'cartao' | 'personalizado';
  desconto_porcentagem?: number;
  entrada_porcentagem?: number;
  frequencia_medicoes?: string;
  boletos_quantidade?: number;
  boletos_valores?: number[];
  cartao_parcelas?: number;
  texto_personalizado?: string;
}

export interface PropostaComparacao {
  id: string;
  candidatura_id: string;
  orcamento_id: string;
  fornecedor: {
    id: string;
    nome: string;
    empresa: string;
    email: string;
    telefone: string;
  };
  proposta: {
    valor_total_estimado: number;
    status: string;
    observacoes?: string;
    forma_pagamento?: FormaPagamentoData[];
    categorias: Record<string, CategoriaProposta>;
    foi_revisada?: boolean;
  };
  status_acompanhamento?: string;
  data_candidatura: string;
}

export interface CategoriaProposta {
  itens: ItemProposta[];
  subtotal: number;
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
  item_extra?: boolean;
}

export interface ComparacaoData {
  orcamento: {
    id: string;
    necessidade: string;
    local: string;
    categorias: string[];
    tamanho_imovel?: number;
    data_publicacao: string;
    prazo_inicio_texto?: string;
  };
  propostas: PropostaComparacao[];
  token_info: {
    total_acessos: number;
    expires_at: string;
  };
}