import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calcularEstimativaLocal } from '@/utils/estimativaLocal';

export interface EstimativaTecnica {
  id:                string;
  orcamento_id:      string;
  status:            'pending' | 'completed' | 'failed' | 'local_fallback';
  faixa_min:         number | null;
  faixa_media:       number | null;
  faixa_alta:        number | null;
  custo_m2_estimado: number | null;
  tipologia:         string | null;
  perc_mao_obra:     number | null;
  perc_materiais:    number | null;
  perc_gestao:       number | null;
  observacoes:       string | null;
  confianca?:        'baixa' | 'media' | 'alta' | null;
  created_at:        string;
}

export type StatusEstimativa = 'idle' | 'pending' | 'completed' | 'failed' | 'local_fallback';

interface DadosLeadEstimativa {
  tamanho_imovel?: number | null;
  categorias?: string[] | null;
}

export const useEstimativaTecnica = (orcamentoId: string, dadosLead?: DadosLeadEstimativa) => {
  const [estimativa, setEstimativa] = useState<EstimativaTecnica | null>(null);
  const [status, setStatus]         = useState<StatusEstimativa>('idle');
  const tamanhoImovel = dadosLead?.tamanho_imovel ?? null;
  const categorias = dadosLead?.categorias ?? null;
  const categoriasChave = Array.isArray(categorias) ? categorias.join('|') : '';

  const aplicarFallbackLocal = useCallback((): boolean => {
    const estimativaLocal = calcularEstimativaLocal({
      tamanho_imovel: tamanhoImovel,
      categorias,
    });

    if (!estimativaLocal) {
      return false;
    }

    setEstimativa({
      id: `local-${orcamentoId}`,
      orcamento_id: orcamentoId,
      status: 'local_fallback',
      faixa_min: estimativaLocal.min,
      faixa_media: estimativaLocal.medio,
      faixa_alta: estimativaLocal.max,
      custo_m2_estimado: null,
      tipologia: null,
      perc_mao_obra: null,
      perc_materiais: null,
      perc_gestao: null,
      observacoes: estimativaLocal.observacao,
      confianca: estimativaLocal.confianca,
      created_at: new Date().toISOString(),
    });
    setStatus('local_fallback');
    return true;
  }, [categorias, orcamentoId, tamanhoImovel]);

  const carregar = useCallback(async () => {
    if (!orcamentoId) {
      setEstimativa(null);
      setStatus('idle');
      return;
    }

    const { data } = await (supabase as any)
      .from('estimativas_tecnicas')
      .select('*')
      .eq('orcamento_id', orcamentoId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const possuiEstimativaIAValida =
      data?.status === 'completed' &&
      data.faixa_min != null &&
      data.faixa_media != null &&
      data.faixa_alta != null;

    if (possuiEstimativaIAValida) {
      setEstimativa(data as EstimativaTecnica);
      setStatus('completed');
      return;
    }

    if (data?.status === 'pending') {
      setEstimativa(data as EstimativaTecnica);
      setStatus('pending');
      return;
    }

    if (aplicarFallbackLocal()) {
      return;
    }

    if (data) {
      setEstimativa(data as EstimativaTecnica);
      setStatus(data.status as StatusEstimativa);
    } else {
      setEstimativa(null);
      setStatus('idle');
    }
  }, [aplicarFallbackLocal, orcamentoId]);

  const solicitar = useCallback(async () => {
    if (!orcamentoId) return;
    setStatus('pending');

    try {
      const { data, error } = await supabase.functions.invoke('gerar-estimativa-tecnica', {
        body: { orcamento_id: orcamentoId },
      });

      if (error) {
        console.error('[useEstimativaTecnica] invoke error:', error);
        if (!aplicarFallbackLocal()) {
          setStatus('failed');
        }
        return;
      }

      if (data?.status === 'completed') {
        await carregar();
      } else {
        console.error('[useEstimativaTecnica] status inesperado:', data);
        setStatus('failed');
        await carregar();
      }
    } catch (err) {
      console.error('[useEstimativaTecnica] exception:', err);
      if (!aplicarFallbackLocal()) {
        setStatus('failed');
      }
    }
  }, [aplicarFallbackLocal, orcamentoId, carregar]);

  useEffect(() => {
    setEstimativa(null);
    setStatus('idle');
  }, [categoriasChave, orcamentoId, tamanhoImovel]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { estimativa, status, recarregar: carregar };
};
