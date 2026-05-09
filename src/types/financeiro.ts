export interface CategoriaFinanceira {
  id: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  descricao?: string;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubcategoriaFinanceira {
  id: string;
  nome: string;
  descricao?: string;
  categoria_id: string;
  ativa: boolean;
  created_at: string;
  updated_at: string;
  categoria?: CategoriaFinanceira;
}

export interface CreateSubcategoriaFinanceiraInput {
  nome: string;
  descricao?: string;
  categoria_id: string;
}

export interface RegistroSemSubcategoria {
  id: string;
  descricao: string;
  valor_original: number;
  data_vencimento: string;
  status: string;
  categoria_id: string;
  categoria?: CategoriaFinanceira;
  cliente_nome?: string;
  fornecedor_nome?: string;
}

export interface ApropriacaoMassaRequest {
  tipo: 'conta_receber' | 'conta_pagar';
  ids: string[];
  subcategoria_id: string;
}

export interface ContaReceber {
  id: string;
  orcamento_id?: string;
  cliente_nome: string;
  cliente_email?: string;
  cliente_telefone?: string;
  descricao: string;
  valor_original: number;
  valor_recebido: number;
  data_vencimento: string;
  data_recebimento?: string;
  status: 'pendente' | 'recebido' | 'vencido' | 'cancelado' | 'perda';
  categoria_id?: string;
  subcategoria_id?: string;
  observacoes?: string;
  motivo_perda_id?: string;
  justificativa_perda?: string;
  data_perda?: string;
  created_at: string;
  updated_at: string;
  categoria?: CategoriaFinanceira;
  subcategoria?: SubcategoriaFinanceira;
}

export interface ContaPagar {
  id: string;
  fornecedor_nome: string;
  fornecedor_email?: string;
  fornecedor_telefone?: string;
  descricao: string;
  valor_original: number;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado';
  categoria_id?: string;
  subcategoria_id?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  categoria?: CategoriaFinanceira;
  subcategoria?: SubcategoriaFinanceira;
}

export interface TransacaoFinanceira {
  id: string;
  tipo: 'recebimento' | 'pagamento';
  conta_receber_id?: string;
  conta_pagar_id?: string;
  valor: number;
  data_transacao: string;
  forma_pagamento?: string;
  observacoes?: string;
  created_at: string;
}

export interface DashboardFinanceiro {
  totalReceber: number;
  totalPagar: number;
  receitasPeriodo: number;
  despesasPeriodo: number;
  contasVencidas: number;
  fluxoCaixa: number;
  alertasVencimento: {
    hoje: number;
    amanha: number;
    proximos7Dias: number;
  };
  periodoSelecionado: number; // em dias
  projecaoFluxoCaixa: Array<{
    mes: string;
    entrada: number;
    saida: number;
    saldo: number;
    saldoAcumulado: number;
  }>;
  receitasDespesasMensais: Array<{
    mes: string;
    receitas: number;
    despesas: number;
    saldoLiquido: number;
  }>;
}

export const PERIODOS_DASHBOARD = [
  { label: "Próximos 7 dias", valor: 7 },
  { label: "Próximos 15 dias", valor: 15 },
  { label: "Próximos 30 dias", valor: 30 },
  { label: "Próximos 45 dias", valor: 45 },
  { label: "Próximos 60 dias", valor: 60 },
  { label: "Próximos 90 dias", valor: 90 },
  { label: "Próximos 6 meses", valor: 180 },
  { label: "Próximos 12 meses", valor: 365 },
] as const;

export interface ParcelaVariavel {
  valor: number;
  data_vencimento: string;
  observacoes?: string;
}

export interface CreateContaReceberInput {
  orcamento_id?: string;
  cliente_nome: string;
  cliente_email?: string;
  cliente_telefone?: string;
  descricao: string;
  valor_original: number;
  data_vencimento: string;
  categoria_id?: string;
  subcategoria_id?: string;
  observacoes?: string;
  // Campos para diferentes tipos de fluxo
  tipo_fluxo?: 'fixo' | 'recorrente' | 'variavel';
  // Campos para recorrência
  is_recorrente?: boolean;
  frequencia_recorrencia?: 'semanal' | 'quinzenal' | 'mensal' | 'trimestral' | 'semestral' | 'anual';
  quantidade_parcelas?: number;
  // Campos para fluxo variável
  parcelas_variaveis?: ParcelaVariavel[];
  // Campos para seleção de fornecedor/cliente
  fornecedor_id?: string;
  fornecedor_cliente_id?: string;
  tipo_cliente?: 'fornecedor' | 'novo';
}

export interface FornecedorOption {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  empresa: string;
}

export interface FornecedorCliente {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  documento?: string;
  endereco?: string;
  tipo: 'fornecedor' | 'cliente' | 'ambos';
  ativo: boolean;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFornecedorClienteInput {
  nome: string;
  email?: string;
  telefone?: string;
  documento?: string;
  endereco?: string;
  tipo: 'fornecedor' | 'cliente' | 'ambos';
  observacoes?: string;
}

export interface CreateContaPagarInput {
  fornecedor_nome: string;
  fornecedor_email?: string;
  fornecedor_telefone?: string;
  descricao: string;
  valor_original: number;
  data_vencimento: string;
  categoria_id?: string;
  subcategoria_id?: string;
  observacoes?: string;
  // Campos para diferentes tipos de fluxo
  tipo_fluxo?: 'fixo' | 'recorrente' | 'variavel';
  // Campos para recorrência
  is_recorrente?: boolean;
  frequencia_recorrencia?: 'semanal' | 'quinzenal' | 'mensal' | 'trimestral' | 'semestral' | 'anual';
  quantidade_parcelas?: number;
  // Campos para fluxo variável
  parcelas_variaveis?: ParcelaVariavel[];
  // Campo para seleção de fornecedor/cliente
  fornecedor_cliente_id?: string;
  tipo_fornecedor?: 'fornecedor_existente' | 'novo';
}

// Interfaces para Sistema Bancário
export interface ContaBancaria {
  id: string;
  nome: string;
  banco: string;
  agencia?: string;
  conta: string;
  saldo_atual: number;
  ativa: boolean;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface MovimentacaoBancaria {
  id: string;
  conta_bancaria_id: string;
  data_movimentacao: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  descricao: string;
  conciliado: boolean;
  origem_tipo?: 'conta_receber' | 'conta_pagar' | 'manual' | 'ajuste_saldo';
  origem_id?: string;
  created_at: string;
  conta_bancaria?: ContaBancaria;
  
  // Informações adicionais da conta origem (para conciliação)
  pessoa_nome?: string;
  pessoa_email?: string;
  categoria_nome?: string;
  subcategoria_nome?: string;
}

export interface ConciliacaoBancaria {
  id: string;
  conta_bancaria_id: string;
  data_conciliacao: string;
  saldo_sistema: number;
  saldo_banco: number;
  diferenca: number;
  observacoes?: string;
  created_at: string;
}

export interface CreateContaBancariaInput {
  nome: string;
  banco: string;
  agencia?: string;
  conta: string;
  saldo_atual: number;
  observacoes?: string;
}

export interface AtualizarSaldoInput {
  novo_saldo: number;
  observacao: string;
}

export interface CreateMovimentacaoBancariaInput {
  conta_bancaria_id: string;
  data_movimentacao: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  descricao: string;
  origem_tipo?: 'conta_receber' | 'conta_pagar' | 'manual' | 'ajuste_saldo';
  origem_id?: string;
}

export interface ContaVencimento {
  id: string;
  tipo: 'conta_receber' | 'conta_pagar';
  descricao: string;
  valor_pendente: number;
  cliente_fornecedor: string;
  data_vencimento: string;
  status: 'pendente' | 'recebido' | 'pago' | 'vencido' | 'cancelado';
  // Campos adicionais para compatibilidade com modais de edição
  valor_original: number;
  valor_recebido?: number;
  valor_pago?: number;
  data_recebimento?: string;
  data_pagamento?: string;
  categoria_id?: string;
  subcategoria_id?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  // Campos específicos para contas a receber
  cliente_nome?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  orcamento_id?: string;
  // Campos específicos para contas a pagar
  fornecedor_nome?: string;
  fornecedor_email?: string;
  fornecedor_telefone?: string;
  categoria?: CategoriaFinanceira;
  subcategoria?: SubcategoriaFinanceira;
}

export interface ContaRecorrenteInfo {
  total_contas: number;
  contas_abertas: number;
  contas_ids: string[];
  valor_total: number;
  frequencia?: string;
}

export interface ExclusaoRecorrenteOptions {
  tipo: 'apenas_atual' | 'todas_abertas';
  contas_afetadas: Array<{
    id: string;
    descricao: string;
    valor_original: number;
    data_vencimento: string;
    status: string;
  }>;
}

export interface DashboardBancario {
  saldo_total: number;
  saldos_por_conta: Array<{
    conta_bancaria_id: string;
    nome: string;
    banco: string;
    saldo: number;
  }>;
  transacoes_nao_conciliadas: number;
  ultimo_saldo_atualizado: string;
}

export interface ValidacaoEdicaoContaPaga {
  success: boolean;
  warning: boolean;
  message: string;
  impacto?: {
    valor_atual: number;
    novo_valor: number;
    diferenca: number;
    transacoes_afetadas: number;
    movimentacoes_afetadas: number;
  };
}

export interface MotivoPerda {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
}

export interface MarcarPerdaInput {
  motivo_perda_id: string;
  justificativa_perda?: string;
  data_perda: string;
}

// Interfaces para Relatório de Fluxo de Caixa
export interface MovimentacaoFluxoCaixa {
  id: string;
  data_vencimento: string;
  tipo: 'entrada' | 'saida';
  descricao: string;
  cliente_fornecedor: string;
  categoria?: string;
  subcategoria?: string;
  valor_original: number;
  valor_pago?: number;
  valor_recebido?: number;
  status: 'pendente' | 'pago' | 'recebido' | 'vencido' | 'cancelado';
  saldo_acumulado: number;
  origem: 'conta_receber' | 'conta_pagar';
  email?: string;
  telefone?: string;
}

export interface RelatorioFluxoCaixa {
  periodo: {
    inicio: string;
    fim: string;
  };
  saldo_inicial: number;
  saldo_final: number;
  movimentacoes: MovimentacaoFluxoCaixa[];
  totais: {
    total_entradas: number;
    total_saidas: number;
    saldo_liquido: number;
    entradas_pendentes: number;
    saidas_pendentes: number;
  };
  resumo_categorias: Array<{
    categoria: string;
    tipo: 'entrada' | 'saida';
    valor_total: number;
    quantidade: number;
    subcategorias?: Array<{
      subcategoria: string;
      valor_total: number;
      quantidade: number;
    }>;
  }>;
}