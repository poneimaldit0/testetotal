export interface FunilVendasRegistro {
  id: string;
  data: string;
  closer_id: string;
  leads_entrada: number;
  mql: number;
  ligacoes_realizadas: number;
  reunioes_agendadas: number;
  reunioes_iniciadas: number;
  pitchs_realizados: number;
  vendas: number;
  caixa_coletado: number;
  faturamento_gerado: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FunilVendasMeta {
  id: string;
  mes: number;
  ano: number;
  closer_id: string | null;
  meta_leads: number;
  meta_mql: number;
  meta_ligacoes: number;
  meta_reunioes_agendadas: number;
  meta_reunioes_iniciadas: number;
  meta_pitchs: number;
  meta_vendas: number;
  meta_caixa: number;
  meta_faturamento: number;
  criado_por_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FunilVendasAcumulado {
  leads_entrada: number;
  mql: number;
  ligacoes_realizadas: number;
  reunioes_agendadas: number;
  reunioes_iniciadas: number;
  pitchs_realizados: number;
  vendas: number;
  caixa_coletado: number;
  faturamento_gerado: number;
}

export const ETAPAS_FUNIL = [
  { key: 'mql', metaKey: 'meta_mql', label: 'MQL' },
  { key: 'leads_entrada', metaKey: 'meta_leads', label: 'Leads Trabalhados' },
  { key: 'ligacoes_realizadas', metaKey: 'meta_ligacoes', label: 'Ligações' },
  { key: 'reunioes_agendadas', metaKey: 'meta_reunioes_agendadas', label: 'Reuniões Agendadas' },
  { key: 'reunioes_iniciadas', metaKey: 'meta_reunioes_iniciadas', label: 'Reuniões Iniciadas' },
  { key: 'pitchs_realizados', metaKey: 'meta_pitchs', label: 'Pitchs' },
  { key: 'vendas', metaKey: 'meta_vendas', label: 'Vendas' },
] as const;

export const ETAPAS_CLOSER = [
  { key: 'reunioes_agendadas', metaKey: 'meta_reunioes_agendadas', label: 'Reuniões Agendadas' },
  { key: 'reunioes_iniciadas', metaKey: 'meta_reunioes_iniciadas', label: 'Reuniões Iniciadas' },
  { key: 'pitchs_realizados', metaKey: 'meta_pitchs', label: 'Pitchs' },
  { key: 'vendas', metaKey: 'meta_vendas', label: 'Vendas' },
] as const;

export const ETAPAS_PRE_VENDAS = [
  { key: 'mql', metaKey: 'meta_mql', label: 'MQL' },
  { key: 'leads_entrada', metaKey: 'meta_leads', label: 'Leads Trabalhados' },
  { key: 'ligacoes_realizadas', metaKey: 'meta_ligacoes', label: 'Ligações' },
  { key: 'reunioes_agendadas', metaKey: 'meta_reunioes_agendadas', label: 'Reuniões Agendadas' },
] as const;

export const ETAPAS_FINANCEIRAS = [
  { key: 'caixa_coletado', metaKey: 'meta_caixa', label: 'Caixa Coletado' },
  { key: 'faturamento_gerado', metaKey: 'meta_faturamento', label: 'Faturamento' },
] as const;

export function calcularConversao(atual: number, anterior: number): number {
  if (anterior === 0) return 0;
  return (atual / anterior) * 100;
}

export function calcularForecast(acumulado: number, diasPassados: number, diasTotais: number): number {
  if (diasPassados === 0) return 0;
  return Math.round((acumulado / diasPassados) * diasTotais);
}

export function calcularForecastFinanceiro(acumulado: number, diasPassados: number, diasTotais: number): number {
  if (diasPassados === 0) return 0;
  return (acumulado / diasPassados) * diasTotais;
}

export type FunilReuniaoStatus = 'agendada' | 'realizada' | 'no_show_desapareceu' | 'no_show_remarcar' | 'no_show_cancelar';

export interface FunilCanalOrigem {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export interface FunilReuniao {
  id: string;
  nome: string;
  data_agendada: string;
  closer_id: string;
  pre_vendas_id: string;
  status: FunilReuniaoStatus;
  teve_pitch: boolean;
  teve_venda: boolean;
  caixa_coletado: number;
  faturamento_gerado: number;
  observacoes_pre_vendas: string | null;
  observacoes_closer: string | null;
  canal_origem_id: string | null;
  created_at: string;
  updated_at: string;
  // joined fields
  closer_nome?: string;
  pre_vendas_nome?: string;
  canal_nome?: string;
}
