/**
 * useAgendamentoCompat — agendamento PROATIVO da compatibilização.
 *
 * O consultor agenda a apresentação assim que recebe a ficha do orçamento,
 * ANTES de qualquer proposta enviada ou análise IA. A data agendada vira o
 * prazo limite para os fornecedores e a referência operacional do fluxo.
 *
 * Estratégia de UPSERT inteligente:
 *   1. Se já existir linha em `compatibilizacoes_analises_ia` para o orçamento
 *      (mais recente), atualiza só os campos de apresentação.
 *   2. Se não existir, cria linha mínima com:
 *        - status = 'agendamento_pendente'
 *        - candidaturas_ids = []  (vazio é válido com o novo status)
 *        - apresentacao_* preenchidos
 *
 * Quando a IA rodar mais tarde, ela atualiza a mesma linha com o ranking.
 *
 * Tipos do Supabase ainda não regenerados → `(supabase as any)`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AgendamentoCanal = 'presencial' | 'online' | 'whatsapp' | 'email';

export interface AgendamentoCompatInput {
  apresentacao_agendada_em: string | null;       // ISO datetime
  apresentacao_canal:       AgendamentoCanal | null;
  apresentacao_link:        string | null;
  apresentacao_observacao:  string | null;
}

export interface AgendamentoCompatEstado {
  id:                       string | null;
  apresentacao_agendada_em: string | null;
  apresentacao_canal:       AgendamentoCanal | null;
  apresentacao_link:        string | null;
  apresentacao_observacao:  string | null;
  status:                   string | null;
}

export type AgendamentoResultado = { ok: boolean; erro?: string };

const TABELA = 'compatibilizacoes_analises_ia';
const STATUS_NOVO = 'agendamento_pendente';

export function useAgendamentoCompat(orcamentoId: string | null) {
  const [estado, setEstado]   = useState<AgendamentoCompatEstado | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  // Cache leve para evitar refetch agressivo no mesmo orçamento
  const lastFetchedFor = useRef<string | null>(null);

  const carregar = useCallback(async (): Promise<void> => {
    if (!orcamentoId) { setEstado(null); return; }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from(TABELA)
        .select('id, status, apresentacao_agendada_em, apresentacao_canal, apresentacao_link, apresentacao_observacao')
        .eq('orcamento_id', orcamentoId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error('[useAgendamentoCompat] carregar:', error);
        setEstado(null);
        return;
      }
      if (!data) { setEstado(null); return; }
      setEstado({
        id:                       data.id,
        apresentacao_agendada_em: data.apresentacao_agendada_em ?? null,
        apresentacao_canal:       (data.apresentacao_canal as AgendamentoCanal | null) ?? null,
        apresentacao_link:        data.apresentacao_link ?? null,
        apresentacao_observacao:  data.apresentacao_observacao ?? null,
        status:                   data.status ?? null,
      });
    } finally {
      setLoading(false);
      lastFetchedFor.current = orcamentoId;
    }
  }, [orcamentoId]);

  useEffect(() => {
    if (!orcamentoId) { setEstado(null); return; }
    if (lastFetchedFor.current === orcamentoId) return;
    carregar();
  }, [orcamentoId, carregar]);

  /**
   * Cria ou atualiza o agendamento.
   * - Se já existe linha → UPDATE apenas dos 4 campos de apresentação.
   * - Se NÃO existe → INSERT com status='agendamento_pendente', candidaturas_ids=[].
   */
  const agendar = useCallback(async (input: AgendamentoCompatInput): Promise<AgendamentoResultado> => {
    if (!orcamentoId) return { ok: false, erro: 'orcamentoId ausente' };
    setSaving(true);
    try {
      // Tenta achar linha existente
      const { data: existente, error: errFind } = await (supabase as any)
        .from(TABELA)
        .select('id')
        .eq('orcamento_id', orcamentoId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (errFind) {
        console.error('[useAgendamentoCompat] buscar:', errFind);
        return { ok: false, erro: errFind.message };
      }

      if (existente?.id) {
        const { error } = await (supabase as any)
          .from(TABELA)
          .update({
            apresentacao_agendada_em: input.apresentacao_agendada_em,
            apresentacao_canal:       input.apresentacao_canal,
            apresentacao_link:        input.apresentacao_link,
            apresentacao_observacao:  input.apresentacao_observacao,
          })
          .eq('id', existente.id);
        if (error) {
          console.error('[useAgendamentoCompat] update:', error);
          return { ok: false, erro: error.message };
        }
      } else {
        const { error } = await (supabase as any)
          .from(TABELA)
          .insert({
            orcamento_id:             orcamentoId,
            candidaturas_ids:         [],
            status:                   STATUS_NOVO,
            apresentacao_agendada_em: input.apresentacao_agendada_em,
            apresentacao_canal:       input.apresentacao_canal,
            apresentacao_link:        input.apresentacao_link,
            apresentacao_observacao:  input.apresentacao_observacao,
          });
        if (error) {
          console.error('[useAgendamentoCompat] insert:', error);
          return { ok: false, erro: error.message };
        }
      }

      lastFetchedFor.current = null; // força recarregar
      await carregar();
      return { ok: true };
    } finally {
      setSaving(false);
    }
  }, [orcamentoId, carregar]);

  /** Remove o agendamento (zera os 4 campos; linha continua existindo). */
  const limparAgendamento = useCallback(async (): Promise<AgendamentoResultado> => {
    return agendar({
      apresentacao_agendada_em: null,
      apresentacao_canal:       null,
      apresentacao_link:        null,
      apresentacao_observacao:  null,
    });
  }, [agendar]);

  return { estado, loading, saving, agendar, limparAgendamento, recarregar: carregar };
}
