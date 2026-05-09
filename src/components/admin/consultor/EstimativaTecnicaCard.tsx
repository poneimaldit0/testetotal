import React from 'react';
import { TrendingUp, Loader2, Info, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useEstimativaTecnica } from '@/hooks/useEstimativaTecnica';

const fmt = (v: number | null) =>
  v == null
    ? 'N/A'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

interface EstimativaTecnicaCardProps {
  orcamentoId: string;
}

export const EstimativaTecnicaCard: React.FC<EstimativaTecnicaCardProps> = ({ orcamentoId }) => {
  const { estimativa, status } = useEstimativaTecnica(orcamentoId);

  if (status === 'idle') {
    return (
      <div className="rounded-lg border border-blue-100 bg-blue-50/30 dark:bg-blue-950/10 dark:border-blue-900 p-3">
        <div className="flex items-center gap-2 text-sm text-blue-500 dark:text-blue-400">
          <TrendingUp className="h-4 w-4 shrink-0 opacity-50" />
          Calculando estimativa com base no escopo do cliente...
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50/60 dark:bg-blue-950/10 dark:border-blue-800 p-3">
        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          Calculando estimativa técnica...
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-950/10 dark:border-amber-800 p-3">
        <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Estimativa técnica indisponível para este orçamento.
        </div>
      </div>
    );
  }

  if (!estimativa) return null;

  const { faixa_min, faixa_media, faixa_alta, custo_m2_estimado, tipologia,
          perc_mao_obra, perc_materiais, perc_gestao, observacoes } = estimativa;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/10 dark:border-blue-800 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <TrendingUp className="h-4 w-4 text-blue-500 shrink-0" />
        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
          Estimativa Técnica Reforma100
        </span>
        {tipologia && (
          <Badge variant="outline" className="border-blue-300 text-blue-600 text-[10px] capitalize">
            {tipologia}
          </Badge>
        )}
      </div>

      {/* Faixas de preço */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-2">
          <p className="text-[10px] text-green-600 dark:text-green-400 font-medium uppercase tracking-wide">Mínimo</p>
          <p className="text-sm font-bold text-green-700 dark:text-green-300">{fmt(faixa_min)}</p>
        </div>
        <div className="text-center rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-300 dark:border-blue-700 p-2">
          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide">Médio</p>
          <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{fmt(faixa_media)}</p>
        </div>
        <div className="text-center rounded-md bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 p-2">
          <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium uppercase tracking-wide">Alto</p>
          <p className="text-sm font-bold text-purple-700 dark:text-purple-300">{fmt(faixa_alta)}</p>
        </div>
      </div>

      {/* Custo/m² + Composição */}
      <div className="flex items-start gap-4 flex-wrap">
        {custo_m2_estimado != null && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ref. custo/m²</p>
            <p className="text-sm font-semibold">
              {fmt(custo_m2_estimado)}
              <span className="text-xs text-muted-foreground">/m²</span>
            </p>
          </div>
        )}

        {(perc_mao_obra != null || perc_materiais != null || perc_gestao != null) && (
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Composição estimada</p>
            <div className="flex gap-2 flex-wrap text-xs">
              {perc_mao_obra != null && (
                <span className="rounded px-1.5 py-0.5 bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 font-medium">
                  M.O {perc_mao_obra}%
                </span>
              )}
              {perc_materiais != null && (
                <span className="rounded px-1.5 py-0.5 bg-teal-100 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 font-medium">
                  Materiais {perc_materiais}%
                </span>
              )}
              {perc_gestao != null && (
                <span className="rounded px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  Gestão {perc_gestao}%
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Observações */}
      {observacoes && (
        <div className="flex items-start gap-1.5 pt-1 border-t border-blue-200 dark:border-blue-800">
          <Info className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">{observacoes}</p>
        </div>
      )}
    </div>
  );
};
