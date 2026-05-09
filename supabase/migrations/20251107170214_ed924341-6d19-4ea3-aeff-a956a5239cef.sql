-- Corrigir função relatorio_metricas_crm removendo referência a data_conclusao

DROP FUNCTION IF EXISTS public.relatorio_metricas_crm(DATE, DATE, UUID);

CREATE OR REPLACE FUNCTION public.relatorio_metricas_crm(
  data_inicio DATE DEFAULT NULL,
  data_fim DATE DEFAULT NULL,
  gestor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_orcamentos BIGINT,
  total_ganhos BIGINT,
  total_perdidos BIGINT,
  taxa_conversao NUMERIC,
  valor_total_ganho NUMERIC,
  ticket_medio NUMERIC,
  tempo_medio_fechamento NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_orcamentos,
    COUNT(*) FILTER (WHERE o.etapa_crm = 'ganho')::BIGINT as total_ganhos,
    COUNT(*) FILTER (WHERE o.etapa_crm = 'perdido')::BIGINT as total_perdidos,
    CASE 
      WHEN COUNT(*) FILTER (WHERE o.etapa_crm != 'perdido') > 0 
      THEN ROUND(
        (COUNT(*) FILTER (WHERE o.etapa_crm = 'ganho')::NUMERIC / 
         COUNT(*) FILTER (WHERE o.etapa_crm != 'perdido')::NUMERIC) * 100, 
        2
      )
      ELSE 0
    END as taxa_conversao,
    0::NUMERIC as valor_total_ganho,
    0::NUMERIC as ticket_medio,
    0::NUMERIC as tempo_medio_fechamento
  FROM view_orcamentos_crm o
  WHERE 
    (data_inicio IS NULL OR o.data_publicacao >= data_inicio)
    AND (data_fim IS NULL OR o.data_publicacao <= data_fim)
    AND (gestor_id IS NULL OR o.gestor_conta_id = gestor_id);
END;
$$;