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
  /** Total de candidaturas (propostas) na análise. 0 quando indisponível. */
  total_propostas: number;
  /** Posição do fornecedor no ranking ajustado (ou IA original); null se não disponível. */
  posicao: number | null;
  /** Score composto (0-100) do fornecedor no ranking; null quando indisponível. */
  score: number | null;
  /** True se o fornecedor é a empresa recomendada pelo consultor/IA. */
  recomendado: boolean;
  /** Diferença vs mercado (% acima/abaixo); null se indisponível. */
  diferenca_mercado: number | null;
  /** Valor da proposta deste fornecedor segundo a análise; null se indisponível. */
  valor_proposta: number | null;
  /** D10: data/hora marcada para apresentar a compatibilização ao cliente. */
  apresentacao_agendada_em: string | null;
  /** D10: canal da apresentação (presencial/online/whatsapp/email). */
  apresentacao_canal: string | null;
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
          .select('id, status, created_at, aprovado_em, candidaturas_ids, analise_completa, ranking_ajustado, apresentacao_agendada_em, apresentacao_canal')
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

        // Ranking ajustado tem prioridade sobre o ranking IA original
        const rankingAtivo: Array<any> | null =
          (Array.isArray(row.ranking_ajustado) && row.ranking_ajustado.length > 0)
            ? row.ranking_ajustado
            : (row.analise_completa?.ranking ?? null);

        const empresaRecomendadaId: string | null =
          row.analise_completa?.empresa_recomendada_id ?? null;

        let posicao: number | null = null;
        let score: number | null = null;
        let diferenca_mercado: number | null = null;
        let valor_proposta: number | null = null;

        if (rankingAtivo && candidaturaId) {
          const r = rankingAtivo.find((e: any) => e.candidatura_id === candidaturaId);
          if (r) {
            posicao = typeof r.posicao === 'number' ? r.posicao : null;
            score = typeof r.score_composto === 'number' ? r.score_composto : null;
            diferenca_mercado = typeof r.diferenca_mercado === 'number' ? r.diferenca_mercado : null;
            valor_proposta = typeof r.valor_proposta === 'number' ? r.valor_proposta : null;
          }
        }

        setData({
          id: row.id,
          status: row.status as CompatStatusCanonico,
          created_at: row.created_at,
          aprovado_em: row.aprovado_em ?? null,
          incluido,
          total_propostas: Array.isArray(row.candidaturas_ids) ? row.candidaturas_ids.length : 0,
          posicao,
          score,
          recomendado: incluido && empresaRecomendadaId === candidaturaId,
          diferenca_mercado,
          valor_proposta,
          apresentacao_agendada_em: row.apresentacao_agendada_em ?? null,
          apresentacao_canal:       row.apresentacao_canal ?? null,
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
  | 'vencedor'        // proposta aprovada E este fornecedor é o recomendado
  | 'aprovada'        // compat aprovada mas não somos a empresa recomendada (ou indeterminado)
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
      return compat.recomendado ? 'vencedor' : 'aprovada';
    case 'enviado':
      return compat.recomendado ? 'vencedor' : 'aguardando_cliente';
    case 'erro':
    case 'failed':
      return 'erro';
    case 'cancelada':
      return 'enviada_aguardando_analise';
    default:
      return 'enviada_aguardando_analise';
  }
}
