/**
 * useGerarEstimativaIA
 *
 * Hook centralizado para geração de estimativas IA de leads.
 *
 * Uso em hooks de dados (fire-and-forget, sem feedback visual):
 *   dispararSilencioso(orcamento_id)
 *
 * Uso no Dashboard para bulk-generate com progresso:
 *   const { gerando, progresso, dispararBatch } = useGerarEstimativaIA();
 *   await dispararBatch(ids, () => fetchLeads());
 *
 * Regras:
 *  - Nunca bloqueia a UI — sempre fire-and-forget
 *  - Dedup por referência: não dispara o mesmo ID duas vezes simultâneas
 *  - Batch processa em grupos de 3 para não sobrecarregar
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// In-flight global guard: evita disparar o mesmo orcamento_id duas vezes
// mesmo se o hook for instanciado em dois componentes diferentes
const globalInFlight = new Set<string>();

/**
 * Dispara estimativa IA em background para um único lead.
 * Pode ser chamado de qualquer lugar sem instanciar o hook inteiro.
 */
export function dispararEstimativaIA(orcamento_id: string): void {
  if (!orcamento_id) return;
  if (globalInFlight.has(orcamento_id)) return;

  globalInFlight.add(orcamento_id);

  supabase.functions
    .invoke('gerar-estimativa-tecnica', { body: { orcamento_id } })
    .then(({ error }) => {
      if (error) console.error('[estimativaIA] Erro para', orcamento_id, error);
    })
    .catch(e => console.error('[estimativaIA] Exception para', orcamento_id, e))
    .finally(() => globalInFlight.delete(orcamento_id));
}

// ─── Hook com estado de progresso (para bulk actions no dashboard) ────────────

export interface ProgressoEstimativa {
  done: number;
  total: number;
  percent: number;
}

export function useGerarEstimativaIA() {
  const [gerando, setGerando]       = useState(false);
  const [progresso, setProgresso]   = useState<ProgressoEstimativa>({ done: 0, total: 0, percent: 0 });
  const abortRef = useRef(false);

  /**
   * Processa lista de IDs em lotes de `concorrencia` simultâneos.
   * onComplete é chamado ao finalizar (para re-fetch do dashboard).
   */
  const dispararBatch = useCallback(async (
    ids: string[],
    onComplete?: () => void,
    concorrencia = 3,
  ): Promise<void> => {
    if (gerando || ids.length === 0) return;

    // Filtrar IDs já em voo globalmente
    const fila = ids.filter(id => !globalInFlight.has(id));
    if (fila.length === 0) return;

    abortRef.current = false;
    setGerando(true);
    setProgresso({ done: 0, total: fila.length, percent: 0 });

    for (let i = 0; i < fila.length; i += concorrencia) {
      if (abortRef.current) break;

      const chunk = fila.slice(i, i + concorrencia);

      // Marcar em voo
      chunk.forEach(id => globalInFlight.add(id));

      await Promise.allSettled(
        chunk.map(id =>
          supabase.functions
            .invoke('gerar-estimativa-tecnica', { body: { orcamento_id: id } })
            .then(({ error }) => {
              if (error) console.error('[batch IA] Erro para', id, error);
            })
            .catch(e => console.error('[batch IA] Exception para', id, e))
            .finally(() => globalInFlight.delete(id))
        )
      );

      const done = Math.min(i + concorrencia, fila.length);
      setProgresso({
        done,
        total: fila.length,
        percent: Math.round((done / fila.length) * 100),
      });
    }

    setGerando(false);
    setProgresso(p => ({ ...p, done: p.total, percent: 100 }));
    onComplete?.();
  }, [gerando]);

  const cancelar = useCallback(() => { abortRef.current = true; }, []);

  return { gerando, progresso, dispararBatch, cancelar };
}
