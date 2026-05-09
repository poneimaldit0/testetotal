export interface Cliente {
  id: string;
  orcamento_id: string;
  proposta_aceita_id?: string;
  nome: string;
  cpf?: string;
  endereco_atual?: EnderecoCliente;
  endereco_reforma?: EnderecoCliente;
  telefone?: string;
  email: string;
  status: 'cadastro_pendente' | 'ativo' | 'inativo';
  data_aceite: string;
  auth_user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface EnderecoCliente {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface RevisaoPropostaCliente {
  id: string;
  checklist_proposta_id: string;
  cliente_temp_email: string;
  motivo_revisao: string;
  status: 'pendente' | 'respondida' | 'cancelada';
  data_solicitacao: string;
  data_resposta?: string;
  observacoes_fornecedor?: string;
  created_at: string;
  updated_at: string;
}

export interface DadosCadastroCliente {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  endereco_atual: EnderecoCliente;
  endereco_reforma: EnderecoCliente;
}

export interface Contrato {
  id: string;
  cliente_id: string;
  fornecedor_id: string;
  orcamento_id: string;
  proposta_id: string;
  tipo: 'principal' | 'aditivo';
  documento_url?: string;
  zapsign_document_id?: string;
  status_assinatura: 'aguardando' | 'cliente_assinou' | 'fornecedor_assinou' | 'finalizado' | 'cancelado';
  data_assinatura_cliente?: string;
  data_assinatura_fornecedor?: string;
  valor_contrato?: number;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface AceitarPropostaData {
  proposta_id: string;
  orcamento_id: string;
  dados_cliente: DadosCadastroCliente;
}

export interface SolicitarRevisaoData {
  proposta_id: string;
  email_cliente: string;
  motivo_revisao: string;
}