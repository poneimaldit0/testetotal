import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StatusPropostaData {
  status: string | null;
  propostaEnviada: boolean;
  loading: boolean;
}

export const useStatusProposta = (candidaturaId?: string): StatusPropostaData => {
  const [status, setStatus] = useState<string | null>(null);
  const [propostaEnviada, setPropostaEnviada] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!candidaturaId) {
      setStatus(null);
      setPropostaEnviada(false);
      setLoading(false);
      return;
    }

    const carregarStatusProposta = async () => {
      try {
        setLoading(true);

        // Buscar proposta e candidatura
        const [propostaResult, candidaturaResult] = await Promise.all([
          supabase
            .from('checklist_propostas')
            .select('status')
            .eq('candidatura_id', candidaturaId)
            .maybeSingle(),
          
          supabase
            .from('candidaturas_fornecedores')
            .select('proposta_enviada')
            .eq('id', candidaturaId)
            .single()
        ]);

        const { data: proposta } = propostaResult;
        const { data: candidatura } = candidaturaResult;

        const statusProposta = proposta?.status || null;
        const enviada = candidatura?.proposta_enviada || false;

        setStatus(statusProposta);
        setPropostaEnviada(enviada || statusProposta === 'enviado' || statusProposta === 'finalizada' || statusProposta === 'em_revisao' || statusProposta === 'pendente_revisao');
        
      } catch (error) {
        console.error('Erro ao carregar status da proposta:', error);
        setStatus(null);
        setPropostaEnviada(false);
      } finally {
        setLoading(false);
      }
    };

    carregarStatusProposta();
  }, [candidaturaId]);

  return {
    status,
    propostaEnviada,
    loading
  };
};