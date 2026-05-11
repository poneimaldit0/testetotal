import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ── Sub-scores por empresa ────────────────────────────────────────────────────
export interface EmpresaRanking {
  candidatura_id:        string;
  empresa:               string;
  posicao:               number;        // 1 = melhor
  score_composto:        number;        // 0–100
  score_qualidade?:      number;        // legado — análises antigas
  score_preco?:          number;
  score_risco?:          number;
  score_escopo?:         number;
  score_clareza?:        number;
  pontos_fortes?:        string[];      // legado — análises antigas
  pontos_fracos?:        string[];
  justificativa_posicao: string;
  valor_proposta:        number | null;
  diferenca_mercado:     number | null; // % vs mercado (+ = acima)
}

// ── Análise comparativa entre empresas ───────────────────────────────────────
export interface AnaliseComparativa {
  escopo:    string;
  preco:     string;
  prazo:     string;
  risco:     string;
  materiais: string;
}

// ── Decisão estratégica (Camada 2) ───────────────────────────────────────────
export interface DecisaoEstrategica {
  nivel_confianca:             'alta' | 'media' | 'baixa';
  recomendacao:                string;
  tipo_recomendacao:           'forte' | 'moderada' | 'condicional';
  justificativa:               string;
  criterio_de_desempate:       string;
  quando_escolher_recomendada: string;
  quando_escolher_alternativa: string;
  risco_da_decisao:            string;
  proximo_passo_obrigatorio:   string;
}

// ── Output completo da compatibilização ──────────────────────────────────────
export interface CompatibilizacaoCompleta {
  ranking:                    EmpresaRanking[];
  analise_comparativa:        AnaliseComparativa;
  empresa_recomendada_id:     string;
  justificativa_recomendacao: string;
  recomendacao_geral:         string;
  metodologia:                string;
  decisao_estrategica?:       DecisaoEstrategica | null;  // Camada 2 — pode ser null em análises antigas
}

// ── Registro no banco ─────────────────────────────────────────────────────────
export type StatusCompat =
  | 'idle'
  // Estados canônicos (pós bloco2)
  | 'processando'
  | 'compatibilizando'
  | 'concluida'
  | 'erro'
  | 'cancelada'
  // Valores legados (registros anteriores ao bloco2 — mantidos para backward compat)
  | 'pending'
  | 'completed'
  | 'failed'
  // Workflow consultor (inalterado)
  | 'pendente_revisao'
  | 'revisado'
  | 'aprovado'
  | 'enviado';

export interface CompatibilizacaoIA {
  id:                   string;
  orcamento_id:         string;
  candidaturas_ids:     string[];
  status:               StatusCompat;
  nota_consultor:       string | null;
  ajuste_leitura:       string | null;
  aprovado_em:          string | null;
  analise_completa:     CompatibilizacaoCompleta | null;
  // Ajuste de ranking pelo consultor
  ranking_ajustado:     EmpresaRanking[] | null;  // null = usa ranking IA original
  justificativa_ajuste: string | null;
  ajuste_por:           string | null;             // user id
  ajuste_em:            string | null;             // ISO date
  // Rastreabilidade (Bloco 2)
  erro_detalhe?:        string | null;
  proposta_filtros_log?: Record<string, unknown> | null;
  created_at:           string;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useCompatibilizacaoIA = (orcamentoId: string) => {
  const [compat, setCompat]             = useState<CompatibilizacaoIA | null>(null);
  const [statusCompat, setStatusCompat] = useState<StatusCompat>('idle');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const carregarCompat = useCallback(async (): Promise<StatusCompat | 'idle' | null> => {
    if (!orcamentoId) {
      setCompat(null);
      setStatusCompat('idle');
      return 'idle';
    }

    const { data, error } = await (supabase as any)
      .from('compatibilizacoes_analises_ia')
      .select('*')
      .eq('orcamento_id', orcamentoId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[useCompatibilizacaoIA] carregarCompat:', error);
      return null;
    }

    if (data) {
      // Auto-falha de registros travados em estado ativo por mais de 10 minutos.
      // Cobre tanto estados legados ('pending') quanto canônicos ('processando','compatibilizando').
      const ESTADOS_ATIVOS = ['pending', 'processando', 'compatibilizando'];
      if (ESTADOS_ATIVOS.includes(data.status)) {
        const ageMs = Date.now() - new Date(data.created_at).getTime();
        if (ageMs > 10 * 60 * 1000) {
          console.warn('[useCompatibilizacaoIA] análise travada > 10 min — marcando como erro:', data.id, 'status:', data.status);
          await (supabase as any)
            .from('compatibilizacoes_analises_ia')
            .update({ status: 'erro', erro_detalhe: 'timeout_detectado_pelo_cliente_apos_10min' })
            .eq('id', data.id);
          data.status = 'erro';
        }
      }

      setCompat({
        id:                   data.id,
        orcamento_id:         data.orcamento_id,
        candidaturas_ids:     data.candidaturas_ids ?? [],
        status:               data.status as StatusCompat,
        nota_consultor:       data.nota_consultor ?? null,
        ajuste_leitura:       data.ajuste_leitura ?? null,
        aprovado_em:          data.aprovado_em ?? null,
        analise_completa:     (data.analise_completa as CompatibilizacaoCompleta) ?? null,
        ranking_ajustado:     (data.ranking_ajustado as EmpresaRanking[]) ?? null,
        justificativa_ajuste: data.justificativa_ajuste ?? null,
        ajuste_por:           data.ajuste_por ?? null,
        ajuste_em:            data.ajuste_em ?? null,
        erro_detalhe:         data.erro_detalhe ?? null,
        proposta_filtros_log: (data.proposta_filtros_log as Record<string, unknown>) ?? null,
        created_at:           data.created_at,
      });

      const ESTADOS_TERMINAIS_OK  = ['completed', 'concluida', 'pendente_revisao', 'revisado', 'aprovado', 'enviado'];
      const ESTADOS_TERMINAIS_ERR = ['failed', 'erro', 'cancelada'];
      if (ESTADOS_TERMINAIS_OK.includes(data.status)) {
        setStatusCompat(data.status as StatusCompat);
        stopPolling();
        return data.status as StatusCompat;
      } else if (ESTADOS_TERMINAIS_ERR.includes(data.status)) {
        setStatusCompat(data.status as StatusCompat);
        stopPolling();
        return data.status as StatusCompat;
      } else {
        // Estados ativos: pending | processando | compatibilizando
        setStatusCompat(data.status as StatusCompat);
        return data.status as StatusCompat;
      }
    } else {
      setCompat(null);
      setStatusCompat('idle');
      return 'idle';
    }
  }, [orcamentoId, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollingRef.current = setInterval(() => { carregarCompat(); }, 3000);
  }, [carregarCompat, stopPolling]);

  // ── Disparar análise ──────────────────────────────────────────────────────
  const solicitarCompatibilizacao = useCallback(async (candidaturasIds: string[], correcoes?: string) => {
    if (!orcamentoId || candidaturasIds.length < 2) {
      console.error('[useCompatibilizacaoIA] Mínimo 2 candidaturas para comparar');
      return;
    }

    setStatusCompat('pending');

    const payload: Record<string, unknown> = { orcamento_id: orcamentoId, candidaturas_ids: candidaturasIds };
    if (correcoes?.trim()) payload.correcoes_consultor = correcoes.trim();
    console.log('[compat] payload enviado para edge function:', JSON.stringify(payload, null, 2));
    console.log('[compat] orcamentoId:', orcamentoId, '| candidaturasIds:', candidaturasIds, '| qty:', candidaturasIds.length);

    try {
      const { data, error } = await supabase.functions.invoke('analisar-compatibilizacao', {
        body: payload,
      });

      if (error) {
        console.error('[useCompatibilizacaoIA] invoke error — status:', error.status, '— message:', error.message);
        try {
          const ctx = typeof error.context === 'string' ? JSON.parse(error.context) : error.context;
          console.error('[useCompatibilizacaoIA] invoke error context:', ctx);
        } catch {
          console.error('[useCompatibilizacaoIA] invoke error context (raw):', error.context);
        }
        // Marca registros pending presos como failed para evitar spinner infinito no próximo acesso
        // Marcar como erro todos os registros ativos deste orçamento (legado e canônico)
        for (const st of ['pending', 'processando', 'compatibilizando']) {
          await (supabase as any)
            .from('compatibilizacoes_analises_ia')
            .update({ status: 'erro', erro_detalhe: 'timeout_ou_erro_rede_detectado_no_frontend' })
            .eq('orcamento_id', orcamentoId)
            .eq('status', st);
        }
        setStatusCompat('erro');
        return;
      }

      console.log('[useCompatibilizacaoIA] invoke response:', data);

      if (data?.status === 'concluida' || data?.status === 'completed') {
        const dbStatus = await carregarCompat();
        const ATIVOS = ['pending', 'processando', 'compatibilizando'];
        if (dbStatus && ATIVOS.includes(dbStatus)) {
          // Edge fn retornou concluida mas DB ainda mostra ativo — DB update pode ter falhado
          console.warn('[useCompatibilizacaoIA] invoke concluida mas DB ativo — iniciando polling');
          startPolling();
        }
      } else if (data?.status === 'erro' || data?.status === 'failed') {
        console.error('[useCompatibilizacaoIA] edge function retornou erro. Detalhes:', data);
        setStatusCompat(data.status as StatusCompat);
        await carregarCompat();
      } else {
        startPolling();
      }
    } catch (err) {
      console.error('[useCompatibilizacaoIA] solicitarCompatibilizacao exception:', err);
      for (const st of ['pending', 'processando', 'compatibilizando']) {
        await (supabase as any)
          .from('compatibilizacoes_analises_ia')
          .update({ status: 'erro', erro_detalhe: String(err) })
          .eq('orcamento_id', orcamentoId)
          .eq('status', st);
      }
      setStatusCompat('erro');
    }
  }, [orcamentoId, carregarCompat, startPolling]);

  // ── Consultor: ajuste de ordem do ranking ───────────────────────────────
  const salvarAjusteRanking = useCallback(async (
    ranking:       EmpresaRanking[],
    justificativa: string,
  ) => {
    if (!compat?.id) return;
    if (!justificativa.trim()) throw new Error('Justificativa é obrigatória');

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await (supabase as any)
      .from('compatibilizacoes_analises_ia')
      .update({
        ranking_ajustado:     ranking,
        justificativa_ajuste: justificativa.trim(),
        ajuste_por:           user?.id ?? null,
        ajuste_em:            new Date().toISOString(),
        status:               'revisado',
      })
      .eq('id', compat.id);

    if (error) {
      console.error('[useCompatibilizacaoIA] salvarAjusteRanking:', error);
      throw error;
    }

    await carregarCompat();
  }, [compat?.id, carregarCompat]);

  // ── Consultor: salvar nota e ajuste de leitura ───────────────────────────
  const salvarNotaConsultor = useCallback(async (
    nota: string,
    ajusteLeitura?: string,
  ) => {
    if (!compat?.id) return;

    const { error } = await (supabase as any)
      .from('compatibilizacoes_analises_ia')
      .update({
        nota_consultor: nota,
        ajuste_leitura: ajusteLeitura ?? null,
        status:         'revisado',
      })
      .eq('id', compat.id);

    if (error) {
      console.error('[useCompatibilizacaoIA] salvarNotaConsultor:', error);
      throw error;
    }

    await carregarCompat();
  }, [compat?.id, carregarCompat]);

  // ── Consultor: aprovar para envio ────────────────────────────────────────
  const aprovarCompatibilizacao = useCallback(async () => {
    if (!compat?.id) return;

    const { error } = await (supabase as any)
      .from('compatibilizacoes_analises_ia')
      .update({
        status:      'aprovado',
        aprovado_em: new Date().toISOString(),
      })
      .eq('id', compat.id);

    if (error) {
      console.error('[useCompatibilizacaoIA] aprovarCompatibilizacao:', error);
      throw error;
    }

    setStatusCompat('aprovado');
    await carregarCompat();
  }, [compat?.id, carregarCompat]);

  // ── Marcar como enviado ao cliente ───────────────────────────────────────
  const marcarEnviado = useCallback(async () => {
    if (!compat?.id) return;

    const { error } = await (supabase as any)
      .from('compatibilizacoes_analises_ia')
      .update({ status: 'enviado' })
      .eq('id', compat.id);

    if (error) {
      console.error('[useCompatibilizacaoIA] marcarEnviado:', error);
      throw error;
    }

    setStatusCompat('enviado');
    await carregarCompat();
  }, [compat?.id, carregarCompat]);

  // Limpa estado imediatamente ao trocar de orçamento, antes do fetch chegar
  useEffect(() => {
    setCompat(null);
    setStatusCompat('idle');
  }, [orcamentoId]);

  useEffect(() => {
    carregarCompat();
    return () => stopPolling();
  }, [carregarCompat, stopPolling]);

  return {
    compat,
    statusCompat,
    solicitarCompatibilizacao,
    salvarAjusteRanking,
    salvarNotaConsultor,
    aprovarCompatibilizacao,
    marcarEnviado,
    recarregar: carregarCompat,
  };
};
