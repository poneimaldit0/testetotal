-- Corrigir tipos ENUM nas funções de relatório CRM

-- Drop das funções existentes
DROP FUNCTION IF EXISTS relatorio_funil_crm(DATE, DATE, UUID);
DROP FUNCTION IF EXISTS relatorio_forecast_crm(INTEGER, INTEGER, UUID);
DROP FUNCTION IF EXISTS relatorio_metricas_crm(DATE, DATE, UUID);

-- Recriar função relatorio_funil_crm com tipos corretos
CREATE OR REPLACE FUNCTION relatorio_funil_crm(
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_gestor_id UUID DEFAULT NULL
)
RETURNS TABLE(
  etapa_crm TEXT,
  total_orcamentos BIGINT,
  valor_total NUMERIC,
  ticket_medio NUMERIC,
  conversao_proxima_etapa NUMERIC,
  tempo_medio_dias NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH orcamentos_filtrados AS (
    SELECT 
      o.id,
      o.etapa_crm,
      o.valor_total,
      o.created_at,
      o.updated_at,
      CASE o.etapa_crm
        WHEN 'orcamento_postado'::etapa_crm_enum THEN 1
        WHEN 'contato_agendamento'::etapa_crm_enum THEN 2
        WHEN 'em_orcamento'::etapa_crm_enum THEN 3
        WHEN 'propostas_enviadas'::etapa_crm_enum THEN 4
        WHEN 'compatibilizacao'::etapa_crm_enum THEN 5
        WHEN 'fechamento_contrato'::etapa_crm_enum THEN 6
        WHEN 'pos_venda_feedback'::etapa_crm_enum THEN 7
        ELSE 8
      END as ordem_etapa
    FROM orcamentos o
    WHERE o.etapa_crm NOT IN ('ganho'::etapa_crm_enum, 'perdido'::etapa_crm_enum)
      AND (p_data_inicio IS NULL OR o.created_at >= p_data_inicio)
      AND (p_data_fim IS NULL OR o.created_at <= p_data_fim)
      AND (p_gestor_id IS NULL OR o.gestor_conta_id = p_gestor_id)
  ),
  totais_por_etapa AS (
    SELECT
      o.etapa_crm::TEXT as etapa,
      COUNT(o.id) as total,
      SUM(o.valor_total) as valor,
      AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at))/86400) as tempo_medio,
      o.ordem_etapa
    FROM orcamentos_filtrados o
    GROUP BY o.etapa_crm, o.ordem_etapa
  ),
  conversoes AS (
    SELECT
      e1.etapa,
      CASE 
        WHEN e2.total IS NOT NULL AND e1.total > 0 
        THEN (e2.total::NUMERIC / e1.total::NUMERIC) * 100
        ELSE 0
      END as taxa_conversao
    FROM totais_por_etapa e1
    LEFT JOIN totais_por_etapa e2 ON e2.ordem_etapa = e1.ordem_etapa + 1
  )
  SELECT
    t.etapa,
    t.total,
    COALESCE(t.valor, 0) as valor_total,
    CASE WHEN t.total > 0 THEN t.valor / t.total ELSE 0 END as ticket_medio,
    COALESCE(c.taxa_conversao, 0) as conversao,
    COALESCE(t.tempo_medio, 0) as tempo_medio
  FROM totais_por_etapa t
  LEFT JOIN conversoes c ON c.etapa = t.etapa
  ORDER BY t.ordem_etapa;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar função relatorio_forecast_crm com tipos corretos
CREATE OR REPLACE FUNCTION relatorio_forecast_crm(
  p_mes INTEGER DEFAULT NULL,
  p_ano INTEGER DEFAULT NULL,
  p_gestor_id UUID DEFAULT NULL
)
RETURNS TABLE(
  etapa_crm TEXT,
  pipeline_bruto NUMERIC,
  probabilidade NUMERIC,
  pipeline_ponderado NUMERIC,
  quantidade BIGINT,
  ticket_medio NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH probabilidades AS (
    SELECT 'orcamento_postado'::etapa_crm_enum as etapa_crm, 0.10 as prob, 1 as ordem
    UNION ALL SELECT 'contato_agendamento'::etapa_crm_enum, 0.20, 2
    UNION ALL SELECT 'em_orcamento'::etapa_crm_enum, 0.40, 3
    UNION ALL SELECT 'propostas_enviadas'::etapa_crm_enum, 0.60, 4
    UNION ALL SELECT 'compatibilizacao'::etapa_crm_enum, 0.75, 5
    UNION ALL SELECT 'fechamento_contrato'::etapa_crm_enum, 0.90, 6
    UNION ALL SELECT 'pos_venda_feedback'::etapa_crm_enum, 0.95, 7
  ),
  orcamentos_filtrados AS (
    SELECT 
      o.etapa_crm,
      o.valor_total,
      p.prob,
      p.ordem
    FROM orcamentos o
    INNER JOIN probabilidades p ON o.etapa_crm = p.etapa_crm
    WHERE (p_mes IS NULL OR EXTRACT(MONTH FROM o.created_at) = p_mes)
      AND (p_ano IS NULL OR EXTRACT(YEAR FROM o.created_at) = p_ano)
      AND (p_gestor_id IS NULL OR o.gestor_conta_id = p_gestor_id)
      AND o.etapa_crm NOT IN ('ganho'::etapa_crm_enum, 'perdido'::etapa_crm_enum)
  )
  SELECT
    of.etapa_crm::TEXT,
    SUM(of.valor_total) as pipeline_bruto,
    (of.prob * 100) as probabilidade,
    SUM(of.valor_total * of.prob) as pipeline_ponderado,
    COUNT(*)::BIGINT as quantidade,
    AVG(of.valor_total) as ticket_medio
  FROM orcamentos_filtrados of
  GROUP BY of.etapa_crm, of.prob, of.ordem
  ORDER BY of.ordem;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar função relatorio_metricas_crm com tipos corretos
CREATE OR REPLACE FUNCTION relatorio_metricas_crm(
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_gestor_id UUID DEFAULT NULL
)
RETURNS TABLE(
  total_orcamentos_ativos BIGINT,
  valor_total_pipeline NUMERIC,
  ticket_medio_geral NUMERIC,
  total_ganhos BIGINT,
  total_perdidos BIGINT,
  taxa_conversao_geral NUMERIC,
  pipeline_ponderado_total NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH metricas AS (
    SELECT
      COUNT(CASE WHEN etapa_crm NOT IN ('ganho'::etapa_crm_enum, 'perdido'::etapa_crm_enum) THEN 1 END) as ativos,
      SUM(CASE WHEN etapa_crm NOT IN ('ganho'::etapa_crm_enum, 'perdido'::etapa_crm_enum) THEN valor_total ELSE 0 END) as pipeline,
      COUNT(CASE WHEN etapa_crm = 'ganho'::etapa_crm_enum THEN 1 END) as ganhos,
      COUNT(CASE WHEN etapa_crm = 'perdido'::etapa_crm_enum THEN 1 END) as perdidos
    FROM orcamentos
    WHERE (p_data_inicio IS NULL OR created_at >= p_data_inicio)
      AND (p_data_fim IS NULL OR created_at <= p_data_fim)
      AND (p_gestor_id IS NULL OR gestor_conta_id = p_gestor_id)
  ),
  ponderacao AS (
    SELECT
      SUM(
        o.valor_total * 
        CASE o.etapa_crm
          WHEN 'orcamento_postado'::etapa_crm_enum THEN 0.10
          WHEN 'contato_agendamento'::etapa_crm_enum THEN 0.20
          WHEN 'em_orcamento'::etapa_crm_enum THEN 0.40
          WHEN 'propostas_enviadas'::etapa_crm_enum THEN 0.60
          WHEN 'compatibilizacao'::etapa_crm_enum THEN 0.75
          WHEN 'fechamento_contrato'::etapa_crm_enum THEN 0.90
          WHEN 'pos_venda_feedback'::etapa_crm_enum THEN 0.95
          ELSE 0
        END
      ) as pipeline_ponderado
    FROM orcamentos o
    WHERE (p_data_inicio IS NULL OR o.created_at >= p_data_inicio)
      AND (p_data_fim IS NULL OR o.created_at <= p_data_fim)
      AND (p_gestor_id IS NULL OR o.gestor_conta_id = p_gestor_id)
      AND o.etapa_crm NOT IN ('ganho'::etapa_crm_enum, 'perdido'::etapa_crm_enum)
  )
  SELECT
    m.ativos,
    COALESCE(m.pipeline, 0) as pipeline,
    CASE WHEN m.ativos > 0 THEN m.pipeline / m.ativos ELSE 0 END as ticket_medio,
    m.ganhos,
    m.perdidos,
    CASE WHEN (m.ganhos + m.perdidos) > 0 
      THEN (m.ganhos::NUMERIC / (m.ganhos + m.perdidos)::NUMERIC) * 100
      ELSE 0 
    END as taxa_conversao,
    COALESCE(p.pipeline_ponderado, 0) as pipeline_ponderado
  FROM metricas m
  CROSS JOIN ponderacao p;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;