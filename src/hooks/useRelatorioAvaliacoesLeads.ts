import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MetricasAvaliacoesLeads {
  total_avaliacoes: number;
  media_pontuacao: number;
  total_frios: number;
  total_mornos: number;
  total_quentes: number;
  percentual_frios: number;
  percentual_mornos: number;
  percentual_quentes: number;
}

export interface AvaliacaoLeadDetalhada {
  id: string;
  orcamento_id: string;
  codigo_orcamento: string | null;
  cliente_nome: string;
  pontuacao_total: number;
  perfil_ideal: boolean;
  orcamento_compativel: boolean;
  decisor_direto: boolean;
  prazo_curto: boolean;
  engajamento_alto: boolean;
  fornecedor_consegue_orcar: boolean;
  avaliado_por_nome: string | null;
  data_avaliacao: string;
}

export function useRelatorioAvaliacoesLeads() {
  const [carregando, setCarregando] = useState(false);

  const buscarMetricasAvaliacoes = useCallback(async (
    dataInicio?: string,
    dataFim?: string
  ): Promise<MetricasAvaliacoesLeads | null> => {
    setCarregando(true);
    try {
      const { data, error } = await supabase.rpc('relatorio_avaliacoes_leads', {
        p_data_inicio: dataInicio || null,
        p_data_fim: dataFim || null
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        return data[0] as MetricasAvaliacoesLeads;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar métricas de avaliações:', error);
      return null;
    } finally {
      setCarregando(false);
    }
  }, []);

  const buscarListaAvaliacoes = useCallback(async (
    dataInicio?: string,
    dataFim?: string
  ): Promise<AvaliacaoLeadDetalhada[]> => {
    setCarregando(true);
    try {
      const { data, error } = await supabase.rpc('listar_avaliacoes_leads', {
        p_data_inicio: dataInicio || null,
        p_data_fim: dataFim || null
      });

      if (error) throw error;
      
      return (data || []) as AvaliacaoLeadDetalhada[];
    } catch (error) {
      console.error('Erro ao buscar lista de avaliações:', error);
      return [];
    } finally {
      setCarregando(false);
    }
  }, []);

  return {
    carregando,
    buscarMetricasAvaliacoes,
    buscarListaAvaliacoes
  };
}
