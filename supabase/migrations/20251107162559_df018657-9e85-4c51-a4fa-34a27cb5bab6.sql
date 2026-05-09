-- Corrigir valores de enum nas funções de relatório CRM

-- 1. DROP das funções atuais
DROP FUNCTION IF EXISTS relatorio_funil_crm(DATE, DATE, UUID);
DROP FUNCTION IF EXISTS relatorio_forecast_crm(INTEGER, INTEGER, UUID);
DROP FUNCTION IF EXISTS relatorio_metricas_crm(DATE, DATE, UUID);

-- 2. Função relatorio_funil_crm com valores corretos
CREATE OR REPLACE FUNCTION relatorio_funil_crm(
  data_inicio DATE DEFAULT NULL,
  data_fim DATE DEFAULT NULL,
  gestor_id UUID DEFAULT NULL
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
) AS $$
BEGIN
  RETURN QUERY
  WITH dados_etapas AS (
    SELECT 
      o.etapa_crm::TEXT as etapa_texto,
      COUNT(*) as qtd,
      COALESCE(SUM(o.valor_lead_estimado), 0) as valor_total,
      COALESCE(AVG(o.valor_lead_estimado), 0) as ticket_medio,
      COALESCE(AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - o.ultima_atualizacao::timestamp)) / 86400), 0) as tempo_medio
    FROM orcamentos_crm o
    WHERE 
      (data_inicio IS NULL OR o.created_at::date >= data_inicio)
      AND (data_fim IS NULL OR o.created_at::date <= data_fim)
      AND (gestor_id IS NULL OR o.gestor_conta_id = gestor_id)
      AND o.etapa_crm NOT IN ('ganho', 'perdido')
    GROUP BY o.etapa_crm
  ),
  total_geral AS (
    SELECT COALESCE(SUM(qtd), 0) as total FROM dados_etapas
  )
  SELECT 
    de.etapa_texto as etapa,
    de.qtd as quantidade,
    de.valor_total,
    de.ticket_medio,
    CASE 
      WHEN tg.total > 0 THEN (de.qtd::NUMERIC / tg.total::NUMERIC * 100)
      ELSE 0 
    END as percentual_total,
    0::NUMERIC as taxa_conversao_proxima,
    de.tempo_medio as tempo_medio_dias,
    CASE de.etapa_texto
      WHEN 'orcamento_postado' THEN 1
      WHEN 'contato_agendamento' THEN 2
      WHEN 'em_orcamento' THEN 3
      WHEN 'propostas_enviadas' THEN 4
      WHEN 'compatibilizacao' THEN 5
      WHEN 'fechamento_contrato' THEN 6
      WHEN 'pos_venda_feedback' THEN 7
      WHEN 'ganho' THEN 8
      WHEN 'perdido' THEN 9
      ELSE 10
    END as ordem
  FROM dados_etapas de
  CROSS JOIN total_geral tg
  ORDER BY ordem;
END;
$$ LANGUAGE plpgsql;

-- 3. Função relatorio_forecast_crm com valores corretos
CREATE OR REPLACE FUNCTION relatorio_forecast_crm(
  mes INTEGER DEFAULT NULL,
  ano INTEGER DEFAULT NULL,
  gestor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  etapa TEXT,
  pipeline_bruto NUMERIC,
  probabilidade INTEGER,
  pipeline_ponderado NUMERIC,
  quantidade BIGINT,
  ticket_medio NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH probabilidades AS (
    SELECT 'orcamento_postado'::etapa_crm_enum as etapa_crm, 10 as prob
    UNION ALL SELECT 'contato_agendamento'::etapa_crm_enum, 20
    UNION ALL SELECT 'em_orcamento'::etapa_crm_enum, 40
    UNION ALL SELECT 'propostas_enviadas'::etapa_crm_enum, 60
    UNION ALL SELECT 'compatibilizacao'::etapa_crm_enum, 70
    UNION ALL SELECT 'fechamento_contrato'::etapa_crm_enum, 90
    UNION ALL SELECT 'pos_venda_feedback'::etapa_crm_enum, 95
    UNION ALL SELECT 'ganho'::etapa_crm_enum, 100
    UNION ALL SELECT 'perdido'::etapa_crm_enum, 0
  ),
  dados_orcamentos AS (
    SELECT 
      o.etapa_crm,
      COUNT(*) as qtd,
      COALESCE(SUM(o.valor_lead_estimado), 0) as valor_total,
      COALESCE(AVG(o.valor_lead_estimado), 0) as ticket_medio
    FROM orcamentos_crm o
    WHERE 
      (mes IS NULL OR EXTRACT(MONTH FROM o.created_at) = mes)
      AND (ano IS NULL OR EXTRACT(YEAR FROM o.created_at) = ano)
      AND (gestor_id IS NULL OR o.gestor_conta_id = gestor_id)
      AND o.etapa_crm NOT IN ('ganho', 'perdido')
    GROUP BY o.etapa_crm
  )
  SELECT 
    p.etapa_crm::TEXT as etapa,
    COALESCE(d.valor_total, 0) as pipeline_bruto,
    p.prob as probabilidade,
    COALESCE(d.valor_total * p.prob / 100.0, 0) as pipeline_ponderado,
    COALESCE(d.qtd, 0) as quantidade,
    COALESCE(d.ticket_medio, 0) as ticket_medio
  FROM probabilidades p
  LEFT JOIN dados_orcamentos d ON d.etapa_crm = p.etapa_crm
  WHERE p.etapa_crm NOT IN ('ganho', 'perdido')
  ORDER BY p.prob DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. Função relatorio_metricas_crm com valores corretos
CREATE OR REPLACE FUNCTION relatorio_metricas_crm(
  data_inicio DATE DEFAULT NULL,
  data_fim DATE DEFAULT NULL,
  gestor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_orcamentos_ativos BIGINT,
  valor_total_pipeline NUMERIC,
  ticket_medio_geral NUMERIC,
  total_ganhos BIGINT,
  total_perdas BIGINT,
  taxa_conversao_geral NUMERIC,
  pipeline_ponderado_total NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH orcamentos_ativos AS (
    SELECT 
      COUNT(*) as total,
      COALESCE(SUM(valor_lead_estimado), 0) as valor_total,
      COALESCE(AVG(valor_lead_estimado), 0) as ticket_medio,
      COALESCE(SUM(
        valor_lead_estimado * 
        CASE o.etapa_crm
          WHEN 'orcamento_postado'::etapa_crm_enum THEN 0.10
          WHEN 'contato_agendamento'::etapa_crm_enum THEN 0.20
          WHEN 'em_orcamento'::etapa_crm_enum THEN 0.40
          WHEN 'propostas_enviadas'::etapa_crm_enum THEN 0.60
          WHEN 'compatibilizacao'::etapa_crm_enum THEN 0.70
          WHEN 'fechamento_contrato'::etapa_crm_enum THEN 0.90
          WHEN 'pos_venda_feedback'::etapa_crm_enum THEN 0.95
          ELSE 0
        END
      ), 0) as pipeline_ponderado
    FROM orcamentos_crm o
    WHERE 
      (data_inicio IS NULL OR o.created_at::date >= data_inicio)
      AND (data_fim IS NULL OR o.created_at::date <= data_fim)
      AND (gestor_id IS NULL OR o.gestor_conta_id = gestor_id)
      AND o.etapa_crm NOT IN ('ganho', 'perdido')
  ),
  orcamentos_finalizados AS (
    SELECT 
      COUNT(*) FILTER (WHERE etapa_crm = 'ganho') as ganhos,
      COUNT(*) FILTER (WHERE etapa_crm = 'perdido') as perdas
    FROM orcamentos_crm o
    WHERE 
      (data_inicio IS NULL OR o.data_conclusao::date >= data_inicio)
      AND (data_fim IS NULL OR o.data_conclusao::date <= data_fim)
      AND (gestor_id IS NULL OR o.gestor_conta_id = gestor_id)
      AND o.etapa_crm IN ('ganho', 'perdido')
  )
  SELECT 
    oa.total as total_orcamentos_ativos,
    oa.valor_total as valor_total_pipeline,
    oa.ticket_medio as ticket_medio_geral,
    of.ganhos as total_ganhos,
    of.perdas as total_perdas,
    CASE 
      WHEN (of.ganhos + of.perdas) > 0 
      THEN (of.ganhos::NUMERIC / (of.ganhos + of.perdas)::NUMERIC * 100)
      ELSE 0 
    END as taxa_conversao_geral,
    oa.pipeline_ponderado as pipeline_ponderado_total
  FROM orcamentos_ativos oa
  CROSS JOIN orcamentos_finalizados of;
END;
$$ LANGUAGE plpgsql;