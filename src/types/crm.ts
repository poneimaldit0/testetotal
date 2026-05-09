export type EtapaCRM = 
  | 'orcamento_postado'
  | 'contato_agendamento'
  | 'em_orcamento'
  | 'propostas_enviadas'
  | 'compatibilizacao'
  | 'fechamento_contrato'
  | 'pos_venda_feedback'
  | 'ganho'
  | 'perdido';

export type StatusContato = 
  | 'sem_contato'
  | 'em_contato'
  | 'visita_agendada'
  | 'visita_realizada';

export interface OrcamentoCRM {
  id: string;
  codigo_orcamento: string | null;
  necessidade: string;
  local: string;
  categorias: string[];
  tamanho_imovel: number | null;
  dados_contato: {
    nome?: string;
    email?: string;
    telefone?: string;
  } | null;
  data_publicacao: string;
  created_at: string;
  data_inicio?: string | null;
  prazo_inicio_texto?: string | null;
  
  // CRM tracking
  ultima_nota_id?: string | null;
  ultima_nota_conteudo?: string | null;
  ultima_nota_autor?: string | null;
  ultima_nota_data?: string | null;
  etapa_crm: EtapaCRM;
  status_contato: StatusContato;
  observacoes_internas: string | null;
  feedback_cliente_nota: number | null;
  feedback_cliente_comentario: string | null;
  ultima_atualizacao: string;
  valor_lead_estimado: number | null;
  // Estimativa IA — fonte primária de carteira (gerada por gerar-estimativa-tecnica)
  valor_estimado_ia_medio?: number | null;
  valor_estimado_ia_min?: number | null;
  valor_estimado_ia_max?: number | null;
  valor_estimado_ia_confianca?: string | null;
  valor_estimado_ia_justificativa?: string | null;

  // Campos de congelamento
  congelado: boolean;
  data_congelamento: string | null;
  data_reativacao_prevista: string | null;
  motivo_congelamento: string | null;
  
  // Responsáveis
  concierge_responsavel_id: string | null;
  concierge_nome: string | null;
  concierge_email: string | null;
  gestor_conta_id: string | null;
  gestor_nome: string | null;
  
  // Contadores
  fornecedores_inscritos_count: number;
  propostas_enviadas_count: number;
  
  // Campos de conclusão
  motivo_perda_id: string | null;
  justificativa_perda: string | null;
  data_conclusao: string | null;
  motivo_perda_nome?: string | null;
  motivo_perda_descricao?: string | null;
  
  // Tags
  tags: Array<{ id: string; nome: string; cor: string }>;

  // Rota100
  rota100_token?: string | null;
}

export interface HistoricoMovimentacao {
  id: string;
  orcamento_id: string;
  etapa_anterior: EtapaCRM | null;
  etapa_nova: EtapaCRM;
  movido_por_id: string;
  movido_por_nome: string;
  observacao: string | null;
  data_movimentacao: string;
  tipo_movimentacao?: 'manual' | 'automatica' | 'transferencia';
}

export interface ConfiguracaoEtapa {
  valor: EtapaCRM;
  titulo: string;
  descricao: string;
  cor: string;
  icone: string;
}

export interface FiltrosCRM {
  concierge?: string;
  statusContato?: StatusContato[];
  periodo?: {
    tipo: 'ultimos_7_dias' | 'ultimos_30_dias' | 'mes_atual' | 'mes_anterior' | 'personalizado';
    inicio?: string;
    fim?: string;
  };
  fornecedoresInscritos?: {
    min?: number;
    max?: number;
  };
  propostasEnviadas?: {
    min?: number;
    max?: number;
  };
  categorias?: string[];
  fornecedoresIds?: string[];
  busca?: string;
  comFeedback?: boolean | null;
  temAlerta?: boolean;
  tags?: string[]; // Array de IDs de tags
  iniciosPretendidos?: string[]; // Filtro por prazo_inicio_texto
  semTarefas?: boolean;
  tarefasAtrasadas?: boolean;
  tarefasHoje?: boolean;
}

// Novos tipos para o sistema de checklist
export interface ItemChecklistEtapa {
  id: string;
  etapa_crm: EtapaCRM;
  titulo: string;
  descricao: string | null;
  ordem: number;
  dias_para_alerta: number;
  ativo: boolean;
}

export interface ProgressoChecklistItem {
  id: string;
  orcamento_id: string;
  item_checklist_id: string;
  concluido: boolean;
  concluido_por_id: string | null;
  concluido_por_nome: string | null;
  data_conclusao: string | null;
  observacao: string | null;
  item: ItemChecklistEtapa;
}

export interface OrcamentoCRMComChecklist extends OrcamentoCRM {
  tempo_na_etapa_dias: number;
  percentual_checklist_concluido: number;
  tem_alertas: boolean;
  total_itens_checklist: number;
  itens_checklist_concluidos: number;
  checklist_pendentes: number;
  budget_informado?: number | null;
  // Campos de tarefas
  total_tarefas: number;
  tarefas_hoje: number;
  tarefas_atrasadas: number;
  tarefas_concluidas: number;
}

export interface MotivoPerda {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
}

export interface MarcarPerdidoPayload {
  orcamentoId: string;
  motivoPerdaId: string;
  justificativa?: string;
}

export interface ArquivoProposta {
  id: string;
  nome_arquivo: string;
  caminho_storage: string;
  tipo_arquivo: string;
  tamanho: number;
}

export interface FornecedorInscrito {
  id: string;
  nome: string;
  empresa: string;
  email: string;
  telefone: string;
  data_candidatura: string;
  proposta_enviada: boolean;
  status_acompanhamento: string | null;
  status_acompanhamento_concierge: string | null;
  link_reuniao?: string | null;
  token_visita?: string | null;
  visita_confirmada_em?: string | null;
  acessos_reuniao?: unknown[];
  arquivos_proposta?: ArquivoProposta[];
}

export interface NotaCRM {
  id: string;
  orcamento_id: string;
  conteudo: string;
  criado_por_id: string;
  criado_por_nome: string;
  created_at: string;
  updated_at: string;
  editada: boolean;
}

// Interface para tarefas do CRM
export interface TarefaCRM {
  id: string;
  orcamento_id: string;
  titulo: string;
  descricao: string | null;
  data_vencimento: string;
  concluida: boolean;
  data_conclusao: string | null;
  concluida_por_id: string | null;
  concluida_por_nome: string | null;
  criado_por_id: string;
  criado_por_nome: string;
  created_at: string;
  updated_at: string;
}

// Tipos para Relatórios CRM
export interface DadosFunilCRM {
  etapa: string;
  quantidade: number;
  valor_total: number;
  ticket_medio: number;
  percentual_total: number;
  taxa_conversao_proxima: number;
  tempo_medio_dias: number;
  ordem: number;
}

export interface DadosForecastCRM {
  etapa: string;
  pipeline_bruto: number;
  probabilidade: number;
  pipeline_ponderado: number;
  quantidade: number;
  ticket_medio: number;
}

export interface MetricasGeraisCRM {
  total_orcamentos_ativos: number;
  valor_total_pipeline: number;
  ticket_medio_geral: number;
  total_ganhos: number;
  total_perdas: number;
  taxa_conversao_geral: number;
  pipeline_ponderado_total: number;
}

// Interface para Avaliação Interna de Lead
export interface AvaliacaoLead {
  id: string;
  orcamento_id: string;
  perfil_ideal: boolean;
  orcamento_compativel: boolean;
  decisor_direto: boolean;
  prazo_curto: boolean;
  engajamento_alto: boolean;
  fornecedor_consegue_orcar: boolean;
  pontuacao_total: number;
  avaliado_por_id: string | null;
  avaliado_por_nome: string | null;
  created_at: string;
  updated_at: string;
}

// Interface para payload de congelamento
export interface CongelarOrcamentoPayload {
  orcamentoId: string;
  dataReativacao: string;
  motivo?: string;
  tarefa: {
    titulo: string;
    descricao?: string;
  };
}
