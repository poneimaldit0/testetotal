import type { OrcamentoCRMComChecklist } from '@/types/crm';

export type SortMode = 'relevancia' | 'urgencia' | 'prazo' | 'valor';
export type SortDir  = 'desc' | 'asc';

export const SORT_LABELS: Record<SortMode, string> = {
  relevancia: 'Relevância',
  urgencia:   'Urgência',
  prazo:      'Prazo',
  valor:      'Valor',
};

// Etapa → peso de proximidade do fechamento (0–100)
const ETAPA_PESO: Record<string, number> = {
  fechamento_contrato:  100,
  compatibilizacao:      80,
  propostas_enviadas:    60,
  em_orcamento:          40,
  contato_agendamento:   20,
  orcamento_postado:     10,
  pos_venda_feedback:    50,
  ganho:                  0,
  perdido:                0,
};

// Heurística PT-BR para prazo_inicio_texto → dias estimados até início
function estimarDiasAteInicio(lead: OrcamentoCRMComChecklist): number {
  if (lead.data_inicio) {
    const days = (new Date(lead.data_inicio).getTime() - Date.now()) / 86400000;
    return Math.max(days, 0);
  }
  const t = (lead.prazo_inicio_texto ?? '').toLowerCase();
  if (/imed|urgent|j[áa]|agora|logo/.test(t))            return 0;
  if (/1.?semana|essa semana|esta semana/.test(t))         return 7;
  if (/15.?dia|quinze/.test(t))                            return 15;
  if (/1.?m[eê]s|um m[eê]s|30.?dia/.test(t))             return 30;
  if (/2.?m[eê]s|dois m[eê]s|60.?dia/.test(t))           return 60;
  if (/3.?m[eê]s|tr[eê]s m[eê]s|90.?dia/.test(t))       return 90;
  if (/6.?m[eê]s|seis m[eê]s/.test(t))                   return 180;
  if (/1.?ano|um ano/.test(t))                             return 365;
  return 999; // desconhecido
}

// ── Score por modo ────────────────────────────────────────────────────────────

function scoreValor(lead: OrcamentoCRMComChecklist): number {
  return lead.valor_estimado_ia_medio ?? lead.valor_lead_estimado ?? 0;
}

// Score maior = prazo mais próximo (mais urgente)
function scorePrazo(lead: OrcamentoCRMComChecklist): number {
  const dias = estimarDiasAteInicio(lead);
  if (dias === 999) return 0;
  return Math.max(1000 - dias, 0); // 0 dias → 1000; 365 dias → 635
}

function scoreUrgencia(lead: OrcamentoCRMComChecklist): number {
  let score = 0;

  // Prazo próximo
  const dias = estimarDiasAteInicio(lead);
  if (dias < 999) {
    if (dias <= 15)      score += 40;
    else if (dias <= 30) score += 25;
    else if (dias <= 90) score += 10;
  }

  // Parado na etapa (risco de esfriar)
  const stale = lead.tempo_na_etapa_dias ?? 0;
  if (stale >= 15) score += 35;
  else if (stale >= 8) score += 20;

  // Tarefas atrasadas
  score += Math.min((lead.tarefas_atrasadas ?? 0) * 15, 45);

  // Contato pendente
  if (lead.status_contato === 'visita_agendada') score += 25;
  else if (lead.status_contato === 'sem_contato') score += 15;

  // Alertas ativos no checklist
  if (lead.tem_alertas) score += 10;

  // Congelado reduz urgência
  if (lead.congelado) score = Math.max(score - 30, 0);

  return score;
}

function scoreRelevancia(lead: OrcamentoCRMComChecklist): number {
  let score = 0;

  // Valor estimado (R$200k → 100 pts)
  score += Math.min(scoreValor(lead) / 2000, 100);

  // Proximidade do fechamento
  score += ETAPA_PESO[lead.etapa_crm] ?? 0;

  // Fornecedores e propostas (sinal de pipeline aquecido)
  score += Math.min((lead.fornecedores_inscritos_count ?? 0) * 5, 25);
  score += Math.min((lead.propostas_enviadas_count ?? 0) * 10, 30);

  // Penalizar leads parados (risco de esfriar)
  const stale = lead.tempo_na_etapa_dias ?? 0;
  if (stale >= 15) score -= 25;
  else if (stale >= 8) score -= 10;

  // Congelado ≠ pipeline ativo
  if (lead.congelado) score -= 20;

  return score;
}

function getScore(lead: OrcamentoCRMComChecklist, mode: SortMode): number {
  switch (mode) {
    case 'valor':      return scoreValor(lead);
    case 'prazo':      return scorePrazo(lead);
    case 'urgencia':   return scoreUrgencia(lead);
    case 'relevancia': return scoreRelevancia(lead);
  }
}

export function sortLeads(
  leads: OrcamentoCRMComChecklist[],
  mode: SortMode,
  dir: SortDir,
): OrcamentoCRMComChecklist[] {
  return [...leads].sort((a, b) => {
    const diff = getScore(b, mode) - getScore(a, mode); // desc-first
    return dir === 'desc' ? diff : -diff;
  });
}
