import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { 
  DadosFunilCRM, 
  DadosForecastCRM, 
  MetricasGeraisCRM 
} from '@/types/crm';

export const useRelatorioCRM = () => {
  const [carregando, setCarregando] = useState(false);

  const buscarFunilCRM = async (
    dataInicio?: Date,
    dataFim?: Date,
    gestorId?: string,
    fornecedorId?: string
  ): Promise<DadosFunilCRM[]> => {
    try {
      setCarregando(true);
      
      const { data, error } = await supabase.rpc('relatorio_funil_crm' as any, {
        data_inicio: dataInicio?.toISOString().split('T')[0] || null,
        data_fim: dataFim?.toISOString().split('T')[0] || null,
        gestor_id: gestorId || null,
        fornecedor_id: fornecedorId || null,
      });

      if (error) throw error;

      return (data as any) || [];
    } catch (error: any) {
      console.error('Erro ao buscar funil CRM:', error);
      toast({
        title: 'Erro ao carregar funil',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    } finally {
      setCarregando(false);
    }
  };

  const buscarForecast = async (
    mes?: number,
    ano?: number,
    gestorId?: string
  ): Promise<DadosForecastCRM[]> => {
    try {
      setCarregando(true);
      
      const { data, error } = await supabase.rpc('relatorio_forecast_crm' as any, {
        mes: mes || null,
        ano: ano || null,
        gestor_id: gestorId || null,
      });

      if (error) throw error;

      return (data as any) || [];
    } catch (error: any) {
      console.error('Erro ao buscar forecast CRM:', error);
      toast({
        title: 'Erro ao carregar forecast',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    } finally {
      setCarregando(false);
    }
  };

  const buscarMetricasCRM = async (
    dataInicio?: Date,
    dataFim?: Date,
    gestorId?: string,
    fornecedorId?: string
  ): Promise<MetricasGeraisCRM | null> => {
    try {
      setCarregando(true);
      
      const { data, error } = await supabase.rpc('relatorio_metricas_crm' as any, {
        data_inicio: dataInicio?.toISOString().split('T')[0] || null,
        data_fim: dataFim?.toISOString().split('T')[0] || null,
        gestor_id: gestorId || null,
        fornecedor_id: fornecedorId || null,
      });

      if (error) throw error;

      return (data as any)?.[0] || null;
    } catch (error: any) {
      console.error('Erro ao buscar métricas CRM:', error);
      toast({
        title: 'Erro ao carregar métricas',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setCarregando(false);
    }
  };

  const buscarFunilAcumulado = async (
    dataInicio?: Date,
    dataFim?: Date,
    gestorId?: string,
    fornecedorId?: string
  ): Promise<any[]> => {
    try {
      setCarregando(true);
      
      const { data, error } = await supabase.rpc('relatorio_funil_crm_acumulado' as any, {
        data_inicio: dataInicio?.toISOString().split('T')[0] || null,
        data_fim: dataFim?.toISOString().split('T')[0] || null,
        gestor_id: gestorId || null,
        fornecedor_id: fornecedorId || null,
      });

      if (error) throw error;

      // Mapear etapa_nome para etapa para compatibilidade com o componente
      return (data as any[])?.map(item => ({
        ...item,
        etapa: item.etapa_nome,
      })) || [];
    } catch (error: any) {
      console.error('Erro ao buscar funil acumulado CRM:', error);
      toast({
        title: 'Erro ao carregar funil acumulado',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    } finally {
      setCarregando(false);
    }
  };

  return {
    carregando,
    buscarFunilCRM,
    buscarFunilAcumulado,
    buscarForecast,
    buscarMetricasCRM,
  };
};
