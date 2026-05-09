// Tipos para o CRM de Customer Success

export type TipoFlag = 'normal' | 'yellow_flag' | 'red_flag' | 'success' | 'inactive';
export type StatusIndicador = 'abaixo' | 'dentro' | 'acima';
export type StatusAcompanhamento = 'ativo' | 'pausado' | 'encerrado';
export type TipoFeedbackConcierge = 'reclamacao' | 'elogio' | 'alerta' | 'nenhum';
export type TipoIndicador = 'inscricoes' | 'visitas' | 'orcamentos' | 'contratos';

// Etapas do Pipeline CS
export interface CSEtapaConfig {
  id: string;
  nome: string;
  ordem: number;
  cor: string;
  cor_texto: string;
  descricao: string | null;
  tipo_flag: TipoFlag;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// Acompanhamento CS de fornecedor
export interface CSFornecedor {
  id: string;
  fornecedor_id: string;
  etapa_atual_id: string | null;
  cs_responsavel_id: string | null;
  data_inicio_acompanhamento: string;
  semana_atual: number;
  status: StatusAcompanhamento;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  fornecedor?: {
    id: string;
    nome: string;
    email: string;
    empresa: string | null;
    telefone: string | null;
    status: string;
  };
  etapa_atual?: CSEtapaConfig;
  cs_responsavel?: {
    id: string;
    nome: string;
    email: string;
  };
}

// Microtreinamento por semana
export interface CSMicrotreinamento {
  id: string;
  semana: number;
  titulo: string;
  descricao: string | null;
  conteudo_sugerido: string | null;
  ativo: boolean;
  created_at: string;
}

// Orientação por indicador (playbook)
export interface CSOrientacaoIndicador {
  id: string;
  indicador: TipoIndicador;
  titulo: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
}

// Ritual Semanal
export interface CSRitualSemanal {
  id: string;
  cs_fornecedor_id: string;
  semana: number;
  
  // Indicadores
  inscricoes_orcamentos: number | null;
  visitas_realizadas: number | null;
  orcamentos_enviados: number | null;
  contratos_fechados: number | null;
  compareceu_reuniao: boolean | null;
  
  // Status por indicador
  status_inscricoes: StatusIndicador | null;
  status_visitas: StatusIndicador | null;
  status_orcamentos: StatusIndicador | null;
  status_contratos: StatusIndicador | null;
  
  // Orientações aplicadas (array de IDs)
  orientacoes_aplicadas: string[];
  
  // Feedback do concierge
  feedback_concierge_consultado: boolean;
  tipo_feedback_concierge: TipoFeedbackConcierge | null;
  observacao_feedback_concierge: string | null;
  
  // Microtreinamento
  microtreinamento_id: string | null;
  treinamento_aplicado: boolean;
  observacao_treinamento: string | null;
  
  // Conclusão
  concluido: boolean;
  concluido_por_id: string | null;
  concluido_por_nome: string | null;
  data_conclusao: string | null;
  
  created_at: string;
  updated_at: string;
  
  // Joins
  planos_acao?: CSPlanoAcao[];
}

// Plano de Ação
export interface CSPlanoAcao {
  id: string;
  ritual_semanal_id: string;
  descricao_acao: string;
  ordem: number;
  concluida: boolean;
  created_at: string;
}

// Histórico de movimentações
export interface CSHistoricoPipeline {
  id: string;
  cs_fornecedor_id: string;
  etapa_anterior_id: string | null;
  etapa_nova_id: string;
  movido_por_id: string | null;
  movido_por_nome: string | null;
  observacao: string | null;
  data_movimentacao: string;
  // Joins
  etapa_anterior?: CSEtapaConfig;
  etapa_nova?: CSEtapaConfig;
}

// Form data para criar/atualizar ritual
export interface CSRitualSemanalFormData {
  inscricoes_orcamentos: number;
  visitas_realizadas: number;
  orcamentos_enviados: number;
  contratos_fechados: number;
  compareceu_reuniao: boolean;
  
  status_inscricoes: StatusIndicador;
  status_visitas: StatusIndicador;
  status_orcamentos: StatusIndicador;
  status_contratos: StatusIndicador;
  
  orientacoes_aplicadas: string[];
  
  feedback_concierge_consultado: boolean;
  tipo_feedback_concierge: TipoFeedbackConcierge;
  observacao_feedback_concierge: string;
  
  microtreinamento_id: string;
  treinamento_aplicado: boolean;
  observacao_treinamento: string;
  
  planos_acao: string[];
}

// Dados agregados para o Kanban
export interface CSFornecedorComEtapa extends CSFornecedor {
  total_rituais_concluidos: number;
  ultimo_ritual?: CSRitualSemanal;
}

// Checklist da Semana 0 (Pré-Onboarding)
export interface CSChecklistSemanaZero {
  id: string;
  cs_fornecedor_id: string;
  boas_vindas_enviada: boolean;
  grupo_whatsapp_criado: boolean;
  material_educativo_enviado: boolean;
  documentos_solicitados: boolean;
  observacoes: string | null;
  concluido: boolean;
  concluido_por_id: string | null;
  concluido_por_nome: string | null;
  data_conclusao: string | null;
  created_at: string;
  updated_at: string;
}
