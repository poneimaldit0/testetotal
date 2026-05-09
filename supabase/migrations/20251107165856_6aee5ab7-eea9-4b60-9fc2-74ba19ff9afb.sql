-- Corrigir relatórios CRM para usar view_orcamentos_crm com dados reais
-- Passo 1: Dropar funções e views existentes

DROP FUNCTION IF EXISTS public.relatorio_funil_crm(DATE, DATE, UUID);
DROP FUNCTION IF EXISTS public.relatorio_forecast_crm(INTEGER, INTEGER, UUID);
DROP FUNCTION IF EXISTS public.relatorio_metricas_crm(DATE, DATE, UUID);
DROP VIEW IF EXISTS public.orcamentos_crm CASCADE;

-- Passo 2: Criar função relatorio_funil_crm usando view_orcamentos_crm
CREATE OR REPLACE FUNCTION public.relatorio_funil_crm(
  data_inicio DATE DEFAULT NULL,
  data_fim DATE DEFAULT NULL,
  gestor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  etapa TEXT,
  quantidade BIGINT,
  valor_total NUMERIC,
  taxa_conversao NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH orcamentos_filtrados AS (
    SELECT 
      o.etapa_crm,
      o.valor_lead_estimado,
      o.data_publicacao
    FROM view_orcamentos_crm o
    WHERE 
      (data_inicio IS NULL OR o.data_publicacao >= data_inicio)
      AND (data_fim IS NULL OR o.data_publicacao <= data_fim)
      AND (gestor_id IS NULL OR o.gestor_conta_id = gestor_id)
  ),
  contagens AS (
    SELECT 
      etapa_crm,
      COUNT(*) as qtd,
      COALESCE(SUM(valor_lead_estimado), 0) as valor
    FROM orcamentos_filtrados
    GROUP BY etapa_crm
  ),
  total_inicial AS (
    SELECT COUNT(*) as total
    FROM orcamentos_filtrados
    WHERE etapa_crm != 'perdido'
  )
  SELECT 
    c.etapa_crm::TEXT as etapa,
    c.qtd as quantidade,
    c.valor as valor_total,
    CASE 
      WHEN t.total > 0 THEN ROUND((c.qtd::NUMERIC / t.total::NUMERIC) * 100, 2)
      ELSE 0
    END as taxa_conversao
  FROM contagens c
  CROSS JOIN total_inicial t
  ORDER BY 
    CASE c.etapa_crm
      WHEN 'orcamento_postado' THEN 1
      WHEN 'em_orcamento' THEN 2
      WHEN 'propostas_enviadas' THEN 3
      WHEN 'ganho' THEN 4
      WHEN 'perdido' THEN 5
      ELSE 6
    END;
END;
$$;

-- Passo 3: Criar função relatorio_forecast_crm
CREATE OR REPLACE FUNCTION public.relatorio_forecast_crm(
  mes INTEGER DEFAULT NULL,
  ano INTEGER DEFAULT NULL,
  gestor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  etapa TEXT,
  quantidade BIGINT,
  valor_estimado NUMERIC,
  probabilidade_fechamento NUMERIC,
  valor_ponderado NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  data_inicio DATE;
  data_fim DATE;
BEGIN
  -- Se mes e ano não forem fornecidos, usar mês atual
  IF mes IS NULL OR ano IS NULL THEN
    mes := EXTRACT(MONTH FROM CURRENT_DATE);
    ano := EXTRACT(YEAR FROM CURRENT_DATE);
  END IF;
  
  data_inicio := make_date(ano, mes, 1);
  data_fim := (data_inicio + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  RETURN QUERY
  WITH probabilidades AS (
    SELECT 
      'orcamento_postado'::TEXT as etapa, 
      10::NUMERIC as prob
    UNION ALL SELECT 'em_orcamento'::TEXT, 25::NUMERIC
    UNION ALL SELECT 'propostas_enviadas'::TEXT, 50::NUMERIC
    UNION ALL SELECT 'ganho'::TEXT, 100::NUMERIC
    UNION ALL SELECT 'perdido'::TEXT, 0::NUMERIC
  )
  SELECT 
    o.etapa_crm::TEXT as etapa,
    COUNT(*)::BIGINT as quantidade,
    COALESCE(SUM(o.valor_lead_estimado), 0)::NUMERIC as valor_estimado,
    p.prob as probabilidade_fechamento,
    ROUND(COALESCE(SUM(o.valor_lead_estimado), 0) * (p.prob / 100), 2)::NUMERIC as valor_ponderado
  FROM view_orcamentos_crm o
  JOIN probabilidades p ON o.etapa_crm::TEXT = p.etapa
  WHERE 
    o.data_publicacao >= data_inicio
    AND o.data_publicacao <= data_fim
    AND (gestor_id IS NULL OR o.gestor_conta_id = gestor_id)
    AND o.etapa_crm NOT IN ('perdido', 'ganho')
  GROUP BY o.etapa_crm, p.prob
  ORDER BY 
    CASE o.etapa_crm
      WHEN 'orcamento_postado' THEN 1
      WHEN 'em_orcamento' THEN 2
      WHEN 'propostas_enviadas' THEN 3
      ELSE 4
    END;
END;
$$;

-- Passo 4: Criar função relatorio_metricas_crm
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
    COALESCE(SUM(o.valor_lead_estimado) FILTER (WHERE o.etapa_crm = 'ganho'), 0)::NUMERIC as valor_total_ganho,
    CASE 
      WHEN COUNT(*) FILTER (WHERE o.etapa_crm = 'ganho') > 0
      THEN ROUND(
        COALESCE(SUM(o.valor_lead_estimado) FILTER (WHERE o.etapa_crm = 'ganho'), 0) / 
        COUNT(*) FILTER (WHERE o.etapa_crm = 'ganho'),
        2
      )
      ELSE 0
    END as ticket_medio,
    COALESCE(
      AVG(
        EXTRACT(EPOCH FROM (o.data_conclusao - o.data_publicacao)) / 86400
      ) FILTER (WHERE o.etapa_crm IN ('ganho', 'perdido') AND o.data_conclusao IS NOT NULL),
      0
    )::NUMERIC as tempo_medio_fechamento
  FROM view_orcamentos_crm o
  WHERE 
    (data_inicio IS NULL OR o.data_publicacao >= data_inicio)
    AND (data_fim IS NULL OR o.data_publicacao <= data_fim)
    AND (gestor_id IS NULL OR o.gestor_conta_id = gestor_id);
END;
$$;