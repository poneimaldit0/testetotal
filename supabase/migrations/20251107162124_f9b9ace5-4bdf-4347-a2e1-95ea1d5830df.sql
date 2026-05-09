-- Corrigir nomes dos campos retornados por relatorio_metricas_crm para coincidir com a interface TypeScript

DROP FUNCTION IF EXISTS relatorio_metricas_crm(DATE, DATE, UUID);

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
  total_perdas BIGINT,
  taxa_conversao_geral NUMERIC,
  pipeline_ponderado_total NUMERIC
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  probabilidades_etapa RECORD;
BEGIN
  RETURN QUERY
  WITH dados_base AS (
    SELECT 
      COUNT(*) FILTER (WHERE o.etapa_crm NOT IN ('ganho'::etapa_crm_enum, 'perdido'::etapa_crm_enum))::BIGINT as orcamentos_ativos,
      COUNT(*) FILTER (WHERE o.etapa_crm = 'ganho'::etapa_crm_enum)::BIGINT as ganhos,
      COUNT(*) FILTER (WHERE o.etapa_crm = 'perdido'::etapa_crm_enum)::BIGINT as perdas,
      SUM(COALESCE(o.valor_lead_estimado, 0)) FILTER (WHERE o.etapa_crm NOT IN ('ganho'::etapa_crm_enum, 'perdido'::etapa_crm_enum))::NUMERIC as pipeline,
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
      AND (p_gestor_id IS NULL OR o.gestor_conta_id = p_gestor_id)
  ),
  pipeline_ponderado AS (
    SELECT 
      SUM(
        COALESCE(o.valor_lead_estimado, 0) * 
        CASE o.etapa_crm
          WHEN 'novo_lead'::etapa_crm_enum THEN 0.10
          WHEN 'contato_inicial'::etapa_crm_enum THEN 0.20
          WHEN 'qualificacao'::etapa_crm_enum THEN 0.40
          WHEN 'proposta'::etapa_crm_enum THEN 0.60
          WHEN 'negociacao'::etapa_crm_enum THEN 0.80
          WHEN 'fechamento'::etapa_crm_enum THEN 0.90
          ELSE 0
        END
      )::NUMERIC as valor_ponderado
    FROM view_orcamentos_crm_com_checklist o
    WHERE 
      (p_data_inicio IS NULL OR o.data_publicacao::DATE >= p_data_inicio)
      AND (p_data_fim IS NULL OR o.data_publicacao::DATE <= p_data_fim)
      AND (p_gestor_id IS NULL OR o.gestor_conta_id = p_gestor_id)
      AND o.etapa_crm NOT IN ('ganho'::etapa_crm_enum, 'perdido'::etapa_crm_enum)
  )
  SELECT 
    db.orcamentos_ativos,
    COALESCE(db.pipeline, 0) as valor_total_pipeline,
    COALESCE(db.ticket_medio, 0) as ticket_medio_geral,
    db.ganhos,
    db.perdas,
    CASE 
      WHEN (db.ganhos + db.perdas) > 0 
      THEN ROUND((db.ganhos * 100.0 / (db.ganhos + db.perdas))::NUMERIC, 2)
      ELSE 0
    END as taxa_conversao_geral,
    COALESCE(ROUND(pp.valor_ponderado, 2), 0) as pipeline_ponderado_total
  FROM dados_base db
  CROSS JOIN pipeline_ponderado pp;
END;
$$;