// Hook readonly leve usado pelo fornecedor para enxergar o estado da
// compatibilização do orçamento ao qual está candidato. Não interage com
// edge functions de IA, não dispara análises — apenas lê o status atual.
// Se RLS bloquear (fornecedor sem permissão), retorna null silenciosamente.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type CompatStatusCanonico =
  | 'processando'
  | 'compatibilizando'
  | 'concluida'
  | 'erro'
  | 'cancelada'
  | 'pendente_revisao'
  | 'revisado'
  | 'aprovado'
  | 'enviado'
  // legados — backward compat até remoção da migration
  | 'pending'
  | 'completed'
  | 'failed';

export interface CompatStatusFornecedor {
  id: string;
  status: CompatStatusCanonico;
  created_at: string;
  aprovado_em: string | null;
  /** True se este fornecedor está incluído na análise atual (via candidaturas_ids). */
  incluido: boolean;
}

export function useCompatStatusFornecedor(orcamentoId: string | undefined, candidaturaId: string | undefined) {
  const [data, setData] = useState<CompatStatusFornecedor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    if (!orcamentoId) {
      setData(null);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const { data: row, error } = await (supabase as any)
          .from('compatibilizacoes_analises_ia')
          .select('id, status, created_at, aprovado_em, candidaturas_ids')
          .eq('orcamento_id', orcamentoId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelado) return;
        if (error || !row) {
          setData(null);
          return;
        }

        const incluido = Array.isArray(row.candidaturas_ids) && candidaturaId
          ? row.candidaturas_ids.includes(candidaturaId)
          : false;

        setData({
          id: row.id,
          status: row.status as CompatStatusCanonico,
          created_at: row.created_at,
          aprovado_em: row.aprovado_em ?? null,
          incluido,
        });
      } catch {
        if (!cancelado) setData(null);
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => { cancelado = true; };
  }, [orcamentoId, candidaturaId]);

  return { compat: data, loading };
}

// Buckets de alto nível usados pela UI do fornecedor.
export type PropostaFase =
  | 'sem_proposta'
  | 'enviada_aguardando_analise'
  | 'em_compatibilizacao'
  | 'em_revisao_consultor'
  | 'aguardando_cliente'
  | 'aprovada'
  | 'recusada'
  | 'erro';

export function deriveFasePropostaFromCompat(
  propostaEnviada: boolean,
  compat: CompatStatusFornecedor | null,
): PropostaFase {
  if (!propostaEnviada) return 'sem_proposta';
  if (!compat || !compat.incluido) return 'enviada_aguardando_analise';

  switch (compat.status) {
    case 'processando':
    case 'compatibilizando':
    case 'pending':
      return 'em_compatibilizacao';
    case 'concluida':
    case 'completed':
    case 'pendente_revisao':
      return 'em_revisao_consultor';
    case 'revisado':
      return 'em_revisao_consultor';
    case 'aprovado':
      return 'aprovada';
    case 'enviado':
      return 'aguardando_cliente';
    case 'erro':
    case 'failed':
      return 'erro';
    case 'cancelada':
      return 'enviada_aguardando_analise';
    default:
      return 'enviada_aguardando_analise';
  }
}
