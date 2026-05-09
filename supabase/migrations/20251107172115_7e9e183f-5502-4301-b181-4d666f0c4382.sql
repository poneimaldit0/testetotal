-- Criar função relatorio_forecast_crm com pipeline ponderado por etapa (com DROP)

DROP FUNCTION IF EXISTS public.relatorio_forecast_crm(INTEGER, INTEGER, UUID);

CREATE OR REPLACE FUNCTION public.relatorio_forecast_crm(
  mes INTEGER DEFAULT NULL,
  ano INTEGER DEFAULT NULL,
  gestor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  etapa TEXT,
  pipeline_bruto NUMERIC,
  probabilidade NUMERIC,
  pipeline_ponderado NUMERIC,
  quantidade BIGINT,
  ticket_medio NUMERIC
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  WITH orcamentos_filtrados AS (
    SELECT 
      oct.etapa_crm,
      COALESCE(oct.valor_lead_estimado, 0) as valor_lead,
      CASE oct.etapa_crm
        WHEN 'orcamento_postado' THEN 0.05
        WHEN 'contato_agendamento' THEN 0.15
        WHEN 'em_orcamento' THEN 0.30
        WHEN 'propostas_enviadas' THEN 0.50
        WHEN 'compatibilizacao' THEN 0.70
        WHEN 'fechamento_contrato' THEN 0.90
        WHEN 'pos_venda_feedback' THEN 0.95
        ELSE 0
      END as probabilidade_conversao
    FROM public.orcamentos o
    INNER JOIN public.orcamentos_crm_tracking oct ON oct.orcamento_id = o.id
    WHERE 
      -- Filtro por mês/ano se fornecidos
      (mes IS NULL OR EXTRACT(MONTH FROM o.data_publicacao) = mes)
      AND (ano IS NULL OR EXTRACT(YEAR FROM o.data_publicacao) = ano)
      AND (gestor_id IS NULL OR oct.concierge_responsavel_id = gestor_id)
      -- Apenas orçamentos ativos (não ganho/perdido)
      AND oct.etapa_crm NOT IN ('ganho', 'perdido')
      AND public.is_admin()
  ),
  dados_por_etapa AS (
    SELECT 
      of.etapa_crm,
      SUM(of.valor_lead) as total_pipeline,
      AVG(of.probabilidade_conversao) as prob_media,
      SUM(of.valor_lead * of.probabilidade_conversao) as pipeline_pond,
      COUNT(*) as qtd,
      AVG(of.valor_lead) FILTER (WHERE of.valor_lead > 0) as ticket_med,
      CASE of.etapa_crm
        WHEN 'orcamento_postado' THEN 1
        WHEN 'contato_agendamento' THEN 2
        WHEN 'em_orcamento' THEN 3
        WHEN 'propostas_enviadas' THEN 4
        WHEN 'compatibilizacao' THEN 5
        WHEN 'fechamento_contrato' THEN 6
        WHEN 'pos_venda_feedback' THEN 7
        ELSE 99
      END as ordem
    FROM orcamentos_filtrados of
    GROUP BY of.etapa_crm
  )
  SELECT 
    dpe.etapa_crm::TEXT,
    ROUND(COALESCE(dpe.total_pipeline, 0), 2),
    ROUND(COALESCE(dpe.prob_media, 0) * 100, 0), -- converter para percentual
    ROUND(COALESCE(dpe.pipeline_pond, 0), 2),
    dpe.qtd::BIGINT,
    ROUND(COALESCE(dpe.ticket_med, 0), 2)
  FROM dados_por_etapa dpe
  ORDER BY dpe.ordem;
$$;