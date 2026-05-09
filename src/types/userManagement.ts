export interface DeleteUserResponse {
  success: boolean;
  error?: string;
  message: string;
  user_id?: string;
  email?: string;
  inscricoes_removidas?: number;
  candidaturas_removidas?: number;
  logs_removidos?: number;
}

export interface CreateUserData {
  email: string;
  nome: string;
  telefone?: string;
  empresa?: string;
  tipo_usuario: 'master' | 'admin' | 'fornecedor' | 'gestor_conta' | 'cliente' | 'sdr' | 'customer_success' | 'gestor_marcenaria' | 'consultor_marcenaria' | 'closer' | 'pre_vendas';
  limite_acessos_diarios?: number;
  limite_acessos_mensais?: number;
  limite_candidaturas_diarias?: number;
  limite_candidaturas_mensais?: number;
  data_termino_contrato?: string;
}

export interface CreateAdminUserData extends CreateUserData {
  password: string;
}