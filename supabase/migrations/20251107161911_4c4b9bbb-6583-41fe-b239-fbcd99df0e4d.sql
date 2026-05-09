-- Correção definitiva: usar view_orcamentos_crm_com_checklist em todas as funções do relatório CRM

-- 1. DROP das funções atuais (quebradas)
DROP FUNCTION IF EXISTS relatorio_funil_crm(DATE, DATE, UUID);
DROP FUNCTION IF EXISTS relatorio_forecast_crm(INTEGER, INTEGER, UUID);
DROP FUNCTION IF EXISTS relatorio_metricas_crm(DATE, DATE, UUID);

-- 2. Recriar relatorio_funil_crm usando a view correta
CREATE OR REPLACE FUNCTION relatorio_funil_crm(
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_gestor_id UUID DEFAULT NULL
)
RETURNS TABLE(
  etapa TEXT,
  quantidade BIGINT,
  valor_total NUMERIC,
  taxa_conversao NUMERIC
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN QUERY
  WITH dados_etapa AS (
    SELECT 
      o.etapa_crm::TEXT as etapa_texto,
      COUNT(*) as qtd,
      SUM(COALESCE(o.valor_lead_estimado, 0)) as valor
    FROM view_orcamentos_crm_com_checklist o
    WHERE 
      (p_data_inicio IS NULL OR o.data_publicacao::DATE >= p_data_inicio)
      AND (p_data_fim IS NULL OR o.data_publicacao::DATE <= p_data_fim)
      AND (p_gestor_id IS NULL OR o.gestor_conta_id = p_gestor_id)
      AND o.etapa_crm IS NOT NULL
    GROUP BY o.etapa_crm
  ),
  total_leads AS (
    SELECT SUM(qtd) as total FROM dados_etapa
  )
  SELECT 
    de.etapa_texto,
    de.qtd,
    de.valor,
    CASE 
      WHEN tl.total > 0 THEN ROUND((de.qtd * 100.0 / tl.total)::NUMERIC, 2)
      ELSE 0
    END as taxa_conversao
  FROM dados_etapa de
  CROSS JOIN total_leads tl
  ORDER BY 
    CASE de.etapa_texto
      WHEN 'novo_lead' THEN 1
      WHEN 'contato_inicial' THEN 2
      WHEN 'qualificacao' THEN 3
      WHEN 'proposta' THEN 4
      WHEN 'negociacao' THEN 5
      WHEN 'fechamento' THEN 6
      WHEN 'ganho' THEN 7
      WHEN 'perdido' THEN 8
      ELSE 9
    END;
END;
$$;

-- 3. Recriar relatorio_forecast_crm usando a view correta
CREATE OR REPLACE FUNCTION relatorio_forecast_crm(
  p_mes INTEGER DEFAULT NULL,
  p_ano INTEGER DEFAULT NULL,
  p_gestor_id UUID DEFAULT NULL
)
RETURNS TABLE(
  etapa TEXT,
  quantidade BIGINT,
  valor_pipeline NUMERIC,
  probabilidade_conversao NUMERIC,
  valor_ponderado NUMERIC
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN QUERY
  WITH probabilidades AS (
    SELECT 'novo_lead'::etapa_crm_enum as etapa_crm, 10 as prob
    UNION ALL SELECT 'contato_inicial'::etapa_crm_enum, 20
    UNION ALL SELECT 'qualificacao'::etapa_crm_enum, 40
    UNION ALL SELECT 'proposta'::etapa_crm_enum, 60
    UNION ALL SELECT 'negociacao'::etapa_crm_enum, 80
    UNION ALL SELECT 'fechamento'::etapa_crm_enum, 90
    UNION ALL SELECT 'ganho'::etapa_crm_enum, 100
    UNION ALL SELECT 'perdido'::etapa_crm_enum, 0
  ),
  dados_pipeline AS (
    SELECT 
      o.etapa_crm::TEXT as etapa_texto,
      COUNT(*) as qtd,
      SUM(COALESCE(o.valor_lead_estimado, 0)) as valor_total,
      p.prob as probabilidade
    FROM view_orcamentos_crm_com_checklist o
    INNER JOIN probabilidades p ON o.etapa_crm = p.etapa_crm
    WHERE 
      (p_mes IS NULL OR EXTRACT(MONTH FROM o.data_publicacao) = p_mes)
      AND (p_ano IS NULL OR EXTRACT(YEAR FROM o.data_publicacao) = p_ano)
      AND (p_gestor_id IS NULL OR o.gestor_conta_id = p_gestor_id)
      AND o.etapa_crm NOT IN ('ganho'::etapa_crm_enum, 'perdido'::etapa_crm_enum)
    GROUP BY o.etapa_crm, p.prob
  )
  SELECT 
    dp.etapa_texto,
    dp.qtd,
    dp.valor_total,
    dp.probabilidade::NUMERIC,
    ROUND((dp.valor_total * dp.probabilidade / 100.0)::NUMERIC, 2) as valor_ponderado
  FROM dados_pipeline dp
  ORDER BY dp.probabilidade DESC;
END;
$$;

-- 4. Recriar relatorio_metricas_crm usando a view correta
CREATE OR REPLACE FUNCTION relatorio_metricas_crm(
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_gestor_id UUID DEFAULT NULL
)
RETURNS TABLE(
  total_leads BIGINT,
  leads_ativos BIGINT,
  leads_ganhos BIGINT,
  leads_perdidos BIGINT,
  taxa_conversao NUMERIC,
  valor_pipeline NUMERIC,
  valor_ganho NUMERIC,
  ticket_medio NUMERIC
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_leads,
    COUNT(*) FILTER (WHERE o.etapa_crm NOT IN ('ganho'::etapa_crm_enum, 'perdido'::etapa_crm_enum))::BIGINT as leads_ativos,
    COUNT(*) FILTER (WHERE o.etapa_crm = 'ganho'::etapa_crm_enum)::BIGINT as leads_ganhos,
    COUNT(*) FILTER (WHERE o.etapa_crm = 'perdido'::etapa_crm_enum)::BIGINT as leads_perdidos,
    CASE 
      WHEN COUNT(*) FILTER (WHERE o.etapa_crm NOT IN ('perdido'::etapa_crm_enum)) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE o.etapa_crm = 'ganho'::etapa_crm_enum) * 100.0 / 
                  COUNT(*) FILTER (WHERE o.etapa_crm NOT IN ('perdido'::etapa_crm_enum)))::NUMERIC, 2)
      ELSE 0
    END as taxa_conversao,
    SUM(COALESCE(o.valor_lead_estimado, 0)) FILTER (WHERE o.etapa_crm NOT IN ('ganho'::etapa_crm_enum, 'perdido'::etapa_crm_enum))::NUMERIC as valor_pipeline,
    SUM(COALESCE(o.valor_lead_estimado, 0)) FILTER (WHERE o.etapa_crm = 'ganho'::etapa_crm_enum)::NUMERIC as valor_ganho,
    CASE 
      WHEN COUNT(*) FILTER (WHERE o.etapa_crm = 'ganho'::etapa_crm_enum) > 0 
      THEN ROUND((SUM(COALESCE(o.valor_lead_estimado, 0)) FILTER (WHERE o.etapa_crm = 'ganho'::etapa_crm_enum) / 
                  COUNT(*) FILTER (WHERE o.etapa_crm = 'ganho'::etapa_crm_enum))::NUMERIC, 2)
      ELSE 0
    END as ticket_medio
  FROM view_orcamentos_crm_com_checklist o
  WHERE 
    (p_data_inicio IS NULL OR o.data_publicacao::DATE >= p_data_inicio)
    AND (p_data_fim IS NULL OR o.data_publicacao::DATE <= p_data_fim)
    AND (p_gestor_id IS NULL OR o.gestor_conta_id = p_gestor_id);
END;
$$;