import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePreOrcamentoStatus = (candidaturaId: string) => {
  const [temPreOrcamento, setTemPreOrcamento] = useState(false);
  const [loading, setLoading] = useState(false);

  const verificarPreOrcamento = useCallback(async () => {
    if (!candidaturaId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('checklist_propostas')
        .select('id, status')
        .eq('candidatura_id', candidaturaId)
        .eq('status', 'pre_orcamento')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar pré-orçamento:', error);
        return;
      }

      setTemPreOrcamento(!!data);
    } catch (error) {
      console.error('Erro ao verificar pré-orçamento:', error);
    } finally {
      setLoading(false);
    }
  }, [candidaturaId]);

  useEffect(() => {
    verificarPreOrcamento();
  }, [verificarPreOrcamento]);

  return {
    temPreOrcamento,
    loading,
    refetch: verificarPreOrcamento
  };
};