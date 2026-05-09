
export interface Profile {
  id: string;
  email: string | null;
  nome: string | null;
  telefone: string | null;
  empresa: string | null;
  tipo_usuario: 'master' | 'admin' | 'fornecedor' | 'gestor_conta' | 'cliente' | 'sdr' | 'customer_success' | 'gestor_marcenaria' | 'consultor_marcenaria' | 'closer' | 'pre_vendas';
  acessos_diarios: number | null;
  acessos_mensais: number | null;
  ultimo_acesso_diario: string | null;
  ultimo_acesso_mensal: string | null;
  ultimo_login: string | null;
  data_criacao: string | null;
  data_inicio_contrato: string | null;
  data_termino_contrato: string | null;
  status: 'ativo' | 'inativo' | 'suspenso' | 'pendente_aprovacao';
  limite_acessos_diarios: number | null;
  limite_acessos_mensais: number | null;
  limite_candidaturas_diarias: number | null;
  limite_candidaturas_mensais: number | null;
  logo_url: string | null;
  site_url: string | null;
  endereco: string | null;
  whatsapp: string | null;
  descricao_fornecedor: string | null;
  must_change_password: boolean | null;
  produto_segmentacao_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LogAcesso {
  id: string;
  user_id: string | null;
  data_acesso: string;
  ip_address: string | null;
  user_agent: string | null;
  acao: string;
}

export interface EstatisticasFornecedor {
  perfil: Profile;
  orcamentos_participando: number;
  total_inscricoes: number;
  acessos_hoje: number;
  acessos_mes: number;
  ultimo_login: string | null;
  status: string;
  limites: {
    diario: number;
    mensal: number;
  };
}
