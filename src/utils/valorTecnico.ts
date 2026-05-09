export interface ValorTecnico {
  min: number | null;
  medio: number | null;
  max: number | null;
  budgetCliente: number | null;
  gapPercentual: number | null;
  budgetAnomalo: boolean;
  confianca: string | null;
}

interface LeadComValor {
  valor_estimado_ia_min?: number | null;
  valor_estimado_ia_medio?: number | null;
  valor_estimado_ia_max?: number | null;
  budget_informado?: number | null;
  valor_estimado_ia_confianca?: string | null;
}

export function calcularValorTecnico(lead: LeadComValor): ValorTecnico {
  const min = lead.valor_estimado_ia_min ?? null;
  const medio = lead.valor_estimado_ia_medio ?? null;
  const max = lead.valor_estimado_ia_max ?? null;
  const budget = lead.budget_informado ?? null;

  const gapPercentual =
    medio != null && budget != null && budget !== 0
      ? ((medio - budget) / budget) * 100
      : null;

  const budgetAnomalo =
    gapPercentual != null
      ? gapPercentual > 50 || gapPercentual < -30
      : false;

  return {
    min,
    medio,
    max,
    budgetCliente: budget,
    gapPercentual,
    budgetAnomalo,
    confianca: lead.valor_estimado_ia_confianca ?? null,
  };
}

export function formatarBRL(valor: number | null): string {
  if (valor == null) return '—';
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

export function formatarGap(gap: number | null): string {
  if (gap == null) return '—';
  const sinal = gap >= 0 ? '+' : '';
  return `${sinal}${gap.toFixed(0)}%`;
}
