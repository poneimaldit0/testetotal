-- Função: relatorio_funil_crm
-- Retorna dados do funil de vendas CRM com conversão entre etapas
CREATE OR REPLACE FUNCTION relatorio_funil_crm(
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_gestor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  etapa TEXT,
  quantidade BIGINT,
  valor_total NUMERIC,
  ticket_medio NUMERIC,
  percentual_total NUMERIC,
  taxa_conversao_proxima NUMERIC,
  tempo_medio_dias NUMERIC,
  ordem INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_orcamentos BIGINT;
BEGIN
  -- Calcular total de orçamentos para percentual
  SELECT COUNT(*)::BIGINT INTO v_total_orcamentos
  FROM view_orcamentos_crm_com_checklist
  WHERE 
    etapa_crm NOT IN ('ganho', 'perdido')
    AND (p_data_inicio IS NULL OR data_publicacao::DATE >= p_data_inicio)
    AND (p_data_fim IS NULL OR data_publicacao::DATE <= p_data_fim)
    AND (p_gestor_id IS NULL OR gestor_conta_id = p_gestor_id);

  -- Retornar dados agregados por etapa
  RETURN QUERY
  WITH etapas_ordenadas AS (
    SELECT 
      o.etapa_crm,
      COUNT(*)::BIGINT as qtd,
      COALESCE(SUM(o.valor_lead_estimado), 0) as valor_total,
      COALESCE(AVG(o.valor_lead_estimado), 0) as ticket_medio,
      COALESCE(AVG(o.tempo_na_etapa_dias), 0) as tempo_medio,
      CASE o.etapa_crm
        WHEN 'orcamento_postado' THEN 1
        WHEN 'contato_agendamento' THEN 2
        WHEN 'em_orcamento' THEN 3
        WHEN 'propostas_enviadas' THEN 4
        WHEN 'compatibilizacao' THEN 5
        WHEN 'fechamento_contrato' THEN 6
        WHEN 'pos_venda_feedback' THEN 7
        ELSE 8
      END as ordem_etapa
    FROM view_orcamentos_crm_com_checklist o
    WHERE 
      o.etapa_crm NOT IN ('ganho', 'perdido')
      AND (p_data_inicio IS NULL OR o.data_publicacao::DATE >= p_data_inicio)
      AND (p_data_fim IS NULL OR o.data_publicacao::DATE <= p_data_fim)
      AND (p_gestor_id IS NULL OR o.gestor_conta_id = p_gestor_id)
    GROUP BY o.etapa_crm
  ),
  etapas_com_conversao AS (
    SELECT 
      e1.etapa_crm,
      e1.qtd,
      e1.valor_total,
      e1.ticket_medio,
      e1.tempo_medio,
      e1.ordem_etapa,
      CASE 
        WHEN e2.qtd IS NOT NULL AND e2.qtd > 0 
        THEN (e2.qtd::NUMERIC / NULLIF(e1.qtd, 0)::NUMERIC * 100)
        ELSE 0
      END as taxa_conversao
    FROM etapas_ordenadas e1
    LEFT JOIN etapas_ordenadas e2 ON e2.ordem_etapa = e1.ordem_etapa + 1
  )
  SELECT 
    ec.etapa_crm::TEXT,
    ec.qtd,
    ROUND(ec.valor_total, 2),
    ROUND(ec.ticket_medio, 2),
    CASE 
      WHEN v_total_orcamentos > 0 
      THEN ROUND((ec.qtd::NUMERIC / v_total_orcamentos::NUMERIC * 100), 2)
      ELSE 0
    END,
    ROUND(ec.taxa_conversao, 2),
    ROUND(ec.tempo_medio, 1),
    ec.ordem_etapa
  FROM etapas_com_conversao ec
  ORDER BY ec.ordem_etapa;
END;
$$;

-- Função: relatorio_forecast_crm
-- Retorna previsão de receita com pipeline ponderado por probabilidade
CREATE OR REPLACE FUNCTION relatorio_forecast_crm(
  p_mes INTEGER DEFAULT NULL,
  p_ano INTEGER DEFAULT NULL,
  p_gestor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  etapa TEXT,
  pipeline_bruto NUMERIC,
  probabilidade NUMERIC,
  pipeline_ponderado NUMERIC,
  quantidade BIGINT,
  ticket_medio NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH probabilidades AS (
    SELECT 'orcamento_postado'::TEXT as etapa_crm, 0.10 as prob, 1 as ordem
    UNION ALL SELECT 'contato_agendamento'::TEXT, 0.20, 2
    UNION ALL SELECT 'em_orcamento'::TEXT, 0.40, 3
    UNION ALL SELECT 'propostas_enviadas'::TEXT, 0.60, 4
    UNION ALL SELECT 'compatibilizacao'::TEXT, 0.75, 5
    UNION ALL SELECT 'fechamento_contrato'::TEXT, 0.90, 6
    UNION ALL SELECT 'pos_venda_feedback'::TEXT, 0.95, 7
  )
  SELECT 
    p.etapa_crm::TEXT,
    COALESCE(ROUND(SUM(o.valor_lead_estimado), 2), 0) as pipeline_bruto,
    p.prob as probabilidade,
    COALESCE(ROUND(SUM(o.valor_lead_estimado) * p.prob, 2), 0) as pipeline_ponderado,
    COUNT(o.id)::BIGINT as quantidade,
    COALESCE(ROUND(AVG(o.valor_lead_estimado), 2), 0) as ticket_medio
  FROM probabilidades p
  LEFT JOIN view_orcamentos_crm_com_checklist o 
    ON o.etapa_crm = p.etapa_crm
    AND o.etapa_crm NOT IN ('ganho', 'perdido')
    AND (p_mes IS NULL OR EXTRACT(MONTH FROM o.data_publicacao::DATE) = p_mes)
    AND (p_ano IS NULL OR EXTRACT(YEAR FROM o.data_publicacao::DATE) = p_ano)
    AND (p_gestor_id IS NULL OR o.gestor_conta_id = p_gestor_id)
  GROUP BY p.etapa_crm, p.prob, p.ordem
  ORDER BY p.ordem;
END;
$$;

-- Função: relatorio_metricas_crm
-- Retorna métricas gerais do CRM
CREATE OR REPLACE FUNCTION relatorio_metricas_crm(
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_gestor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_orcamentos_ativos BIGINT,
  valor_total_pipeline NUMERIC,
  ticket_medio_geral NUMERIC,
  total_ganhos BIGINT,
  total_perdas BIGINT,
  taxa_conversao_geral NUMERIC,
  pipeline_ponderado_total NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ganhos BIGINT;
  v_perdas BIGINT;
  v_pipeline_ponderado NUMERIC;
BEGIN
  -- Contar ganhos
  SELECT COUNT(*)::BIGINT INTO v_ganhos
  FROM view_orcamentos_crm_com_checklist
  WHERE 
    etapa_crm = 'ganho'
    AND (p_data_inicio IS NULL OR data_conclusao::DATE >= p_data_inicio)
    AND (p_data_fim IS NULL OR data_conclusao::DATE <= p_data_fim)
    AND (p_gestor_id IS NULL OR gestor_conta_id = p_gestor_id);

  -- Contar perdas
  SELECT COUNT(*)::BIGINT INTO v_perdas
  FROM view_orcamentos_crm_com_checklist
  WHERE 
    etapa_crm = 'perdido'
    AND (p_data_inicio IS NULL OR data_conclusao::DATE >= p_data_inicio)
    AND (p_data_fim IS NULL OR data_conclusao::DATE <= p_data_fim)
    AND (p_gestor_id IS NULL OR gestor_conta_id = p_gestor_id);

  -- Calcular pipeline ponderado
  SELECT COALESCE(SUM(pipeline_ponderado), 0) INTO v_pipeline_ponderado
  FROM relatorio_forecast_crm(
    EXTRACT(MONTH FROM COALESCE(p_data_inicio, CURRENT_DATE))::INTEGER,
    EXTRACT(YEAR FROM COALESCE(p_data_inicio, CURRENT_DATE))::INTEGER,
    p_gestor_id
  );

  RETURN QUERY
  SELECT 
    COUNT(o.id)::BIGINT as total_orcamentos_ativos,
    COALESCE(ROUND(SUM(o.valor_lead_estimado), 2), 0) as valor_total_pipeline,
    COALESCE(ROUND(AVG(o.valor_lead_estimado), 2), 0) as ticket_medio_geral,
    v_ganhos as total_ganhos,
    v_perdas as total_perdas,
    CASE 
      WHEN (v_ganhos + v_perdas) > 0 
      THEN ROUND((v_ganhos::NUMERIC / (v_ganhos + v_perdas)::NUMERIC * 100), 2)
      ELSE 0
    END as taxa_conversao_geral,
    ROUND(v_pipeline_ponderado, 2) as pipeline_ponderado_total
  FROM view_orcamentos_crm_com_checklist o
  WHERE 
    o.etapa_crm NOT IN ('ganho', 'perdido')
    AND (p_data_inicio IS NULL OR o.data_publicacao::DATE >= p_data_inicio)
    AND (p_data_fim IS NULL OR o.data_publicacao::DATE <= p_data_fim)
    AND (p_gestor_id IS NULL OR o.gestor_conta_id = p_gestor_id);
END;
$$;