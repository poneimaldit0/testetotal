import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DadosFunilVendas {
  etapa: string;
  quantidade: number;
  percentual_total: number;
  taxa_conversao: number;
}

export const useRelatorioFunilVendas = () => {
  const [loading, setLoading] = useState(false);

  const buscarDadosFunil = useCallback(async (dataInicio: string, dataFim: string): Promise<DadosFunilVendas[]> => {
    setLoading(true);
    try {
      console.log('🔄 Buscando dados do funil de vendas...');

      const { data, error } = await supabase.rpc('relatorio_funil_vendas', {
        p_data_inicio: dataInicio || null,
        p_data_fim: dataFim || null,
      });

      if (error) {
        console.error('❌ Erro ao buscar dados do funil:', error);
        toast.error('Erro ao carregar dados do funil de vendas');
        return [];
      }

      console.log('✅ Dados do funil carregados:', data);
      return data || [];
    } catch (error) {
      console.error('❌ Erro inesperado:', error);
      toast.error('Erro inesperado ao carregar relatório');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    buscarDadosFunil,
  };
};