export type EtapaMarcenaria =
  | 'identificacao_automatica'
  | 'abordagem_inicial'
  | 'qualificacao_briefing'
  | 'desenvolvimento_projeto'
  | 'apresentacao_projeto'
  | 'reuniao_apresentacao'
  | 'fechamento_contrato'
  | 'pos_venda_feedback'
  | 'ganho'
  | 'perdido';

export interface LeadMarcenaria {
  id: string;
  orcamento_id: string;
  codigo_orcamento: string | null;
  
  cliente_nome: string | null;
  cliente_email: string | null;
  cliente_telefone: string | null;
  
  etapa_marcenaria: EtapaMarcenaria;
  bloqueado: boolean;
  data_desbloqueio: string | null;
  
  consultor_responsavel_id: string | null;
  consultor_nome: string | null;
  
  ambientes_mobiliar: string[] | null;
  tem_planta: boolean | null;
  tem_medidas: boolean | null;
  tem_fotos: boolean | null;
  estilo_preferido: string | null;
  
  projeto_url: string | null;
  projeto_enviado_em: string | null;
  
  reuniao_agendada_para: string | null;
  reuniao_realizada_em: string | null;
  
  contratado: boolean;
  valor_contrato: number | null;
  data_contratacao: string | null;
  valor_estimado: number | null;
  
  observacoes_internas: string | null;
  feedback_cliente: string | null;
  
  motivo_perda_id: string | null;
  justificativa_perda: string | null;
  data_perda: string | null;
  
  mensagem_1_enviada: boolean;
  mensagem_1_enviada_em: string | null;
  mensagem_2_enviada: boolean;
  mensagem_2_enviada_em: string | null;
  mensagem_3_enviada: boolean;
  mensagem_3_enviada_em: string | null;
  
  necessidade: string;
  local: string;
  categorias: string[];
  dias_desde_criacao: number;
  total_notas: number;
  data_inicio: string | null;
  prazo_inicio_texto: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface HistoricoMarcenaria {
  id: string;
  lead_id: string;
  etapa_anterior: EtapaMarcenaria | null;
  etapa_nova: EtapaMarcenaria;
  movido_por_id: string;
  movido_por_nome: string;
  observacao: string | null;
  data_movimentacao: string;
}

export interface NotaMarcenaria {
  id: string;
  lead_id: string;
  conteudo: string;
  criado_por_id: string;
  criado_por_nome: string;
  created_at: string;
  updated_at: string;
  editada: boolean;
}

export interface MotivoPerda_Marcenaria {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
}

export interface ConfiguracaoEtapaMarcenaria {
  valor: EtapaMarcenaria;
  titulo: string;
  descricao: string;
  cor: string;
  icone: string;
  bloqueado?: boolean;
}

export interface ItemChecklistMarcenaria {
  id: string;
  etapa_marcenaria: EtapaMarcenaria;
  titulo: string;
  descricao: string | null;
  ordem: number;
  dias_para_alerta: number;
  permite_whatsapp: boolean;
  modelo_mensagem_key: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProgressoChecklistMarcenaria {
  id: string;
  lead_id: string;
  item_checklist_id: string;
  concluido: boolean;
  concluido_por_id: string | null;
  concluido_por_nome: string | null;
  data_conclusao: string | null;
  observacao: string | null;
  created_at: string;
  
  // Dados do item (join com crm_marcenaria_checklist_etapas)
  crm_marcenaria_checklist_etapas?: ItemChecklistMarcenaria;
}

export interface TarefaMarcenaria {
  id: string;
  lead_id: string;
  titulo: string;
  descricao: string | null;
  data_vencimento: string; // formato ISO date
  concluida: boolean;
  data_conclusao: string | null;
  concluida_por_id: string | null;
  concluida_por_nome: string | null;
  criado_por_id: string;
  criado_por_nome: string;
  created_at: string;
  updated_at: string;
  
  // Última nota
  ultima_nota_id?: string | null;
  ultima_nota_conteudo?: string | null;
  ultima_nota_autor?: string | null;
  ultima_nota_data?: string | null;
}

export interface LeadMarcenariaComChecklist extends LeadMarcenaria {
  checklist_pendentes: number;
  checklist_total: number;
  checklist_concluidos: number;
  tem_alerta_checklist: boolean;
  dias_na_etapa_atual: number;
  
  // Tarefas
  total_tarefas: number;
  tarefas_hoje: number;
  tarefas_atrasadas: number;
  tarefas_concluidas: number;
  
  // Última nota
  ultima_nota_id?: string | null;
  ultima_nota_conteudo?: string | null;
  ultima_nota_autor?: string | null;
  ultima_nota_data?: string | null;
  
  // Tags
  tags?: Array<{ id: string; nome: string; cor: string }>;
}

export interface PeriodoFiltroMarcenaria {
  tipo: 'todos' | 'ultimos_7_dias' | 'ultimos_30_dias' | 'mes_atual' | 'mes_anterior' | 'personalizado';
  inicio?: string;
  fim?: string;
}

export interface FiltrosMarcenaria {
  busca?: string;
  consultor?: string; // 'todos' | 'meus' | id_consultor
  categorias?: string[];
  periodo?: PeriodoFiltroMarcenaria;
  etapas?: EtapaMarcenaria[];
  estiloPreferido?: string[];
  briefing?: {
    temPlanta?: boolean;
    temMedidas?: boolean;
    temFotos?: boolean;
  };
  projeto?: 'todos' | 'enviado' | 'nao_enviado';
  reuniao?: 'todos' | 'agendada' | 'realizada' | 'pendente';
  valorEstimado?: {
    min?: number;
    max?: number;
  };
  temAlertaChecklist?: boolean;
  comNotas?: boolean;
  diasNaEtapa?: {
    min?: number;
    max?: number;
  };
  semTarefas?: boolean;
  tarefasAtrasadas?: boolean;
  tarefasHoje?: boolean;
}
