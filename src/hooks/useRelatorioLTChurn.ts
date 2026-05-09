import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RelatorioLTChurnData, FiltrosRelatorioLTChurn } from '@/types/relatorios';
import { toast } from 'sonner';

export function useRelatorioLTChurn() {
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState<RelatorioLTChurnData | null>(null);

  const buscarRelatorio = useCallback(async (filtros: FiltrosRelatorioLTChurn = {}) => {
    console.log('🔍 [useRelatorioLTChurn] Iniciando busca do relatório', filtros);
    setLoading(true);
    try {
      console.log('🔍 [useRelatorioLTChurn] Chamando supabase.rpc com parâmetros:', {
        p_data_inicio: filtros.dataInicio || null,
        p_data_fim: filtros.dataFim || null,
        p_agrupamento: filtros.agrupamento || 'mensal'
      });

      const { data, error } = await supabase.rpc('relatorio_lt_churn', {
        p_data_inicio: filtros.dataInicio || null,
        p_data_fim: filtros.dataFim || null,
        p_agrupamento: filtros.agrupamento || 'mensal'
      });

      console.log('🔍 [useRelatorioLTChurn] Resposta do Supabase:', { data, error });

      if (error) {
        console.error('Erro ao buscar relatório LT/Churn:', error);
        toast.error('Erro ao carregar dados do relatório');
        return;
      }

      if (data && data.length > 0) {
        const resultado = data[0];
        
        setDados({
          total_fornecedores: Number(resultado.total_fornecedores || 0),
          fornecedores_ativos: Number(resultado.fornecedores_ativos || 0),
          fornecedores_churned: Number(resultado.fornecedores_churned || 0),
          lt_medio_geral: Number(resultado.lt_medio_geral || 0),
          lt_medio_ativos: Number(resultado.lt_medio_ativos || 0),
          lt_medio_churned: Number(resultado.lt_medio_churned || 0),
          churn_rate_periodo: Number(resultado.churn_rate_periodo || 0),
          churn_rate_mensal: Number(resultado.churn_rate_mensal || 0),
          coortes_dados: (resultado.coortes_dados as any) || [],
          distribuicao_lt: (resultado.distribuicao_lt as any) || { percentis: { p25: 0, p50: 0, p75: 0, p90: 0, p95: 0 }, faixas: [] },
          curva_sobrevivencia: (resultado.curva_sobrevivencia as any) || [],
          comparacao_periodo_anterior: (resultado.comparacao_periodo_anterior as any) || {}
        });

        toast.success('Relatório carregado com sucesso');
      } else {
        setDados(null);
        toast.info('Nenhum dado encontrado para o período selecionado');
      }
    } catch (error) {
      console.error('Erro ao buscar relatório:', error);
      toast.error('Erro interno do sistema');
    } finally {
      setLoading(false);
    }
  }, []);

  const limparDados = useCallback(() => {
    setDados(null);
  }, []);

  return {
    loading,
    dados,
    buscarRelatorio,
    limparDados
  };
}