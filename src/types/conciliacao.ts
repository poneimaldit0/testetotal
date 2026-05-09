// Tipos para Conciliação Rápida

export interface ItemExtratoBanco {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: 'entrada' | 'saida';
  saldo?: number;
  vinculado?: boolean;
  contaVinculadaId?: string;
  contaVinculadaTipo?: 'receber' | 'pagar';
  ignorado?: boolean;
}

export interface ContaParaVincular {
  id: string;
  tipo: 'receber' | 'pagar';
  descricao: string;
  valor: number;
  dataVencimento: string;
  cliente_fornecedor: string;
  status: string;
}

export interface VinculoExtrato {
  extratoId: string;
  contaId: string;
  contaTipo: 'receber' | 'pagar';
  similaridade: number; // 0-100
  autoSugerido: boolean;
  corrigirValor?: boolean; // Se true, corrige o valor_original da conta para o valor do extrato
  valorExtrato?: number; // Valor do extrato para correção
}

export interface ResultadoImportacao {
  sucesso: boolean;
  itens: ItemExtratoBanco[];
  erros: string[];
  arquivo: string;
}

export interface SugestaoVinculo {
  extratoItem: ItemExtratoBanco;
  conta: ContaParaVincular;
  similaridade: number;
  motivoSugestao: string;
}

export interface ResumoConciliacao {
  totalItensExtrato: number;
  itensVinculados: number;
  itensSemCorrespondencia: number;
  contasSemMovimentacao: number;
  totalCreditos: number;
  totalDebitos: number;
}
