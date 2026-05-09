-- Atualizar função relatorio_metricas_crm com cálculos completos e valores reais (corrigido)

DROP FUNCTION IF EXISTS public.relatorio_metricas_crm(DATE, DATE, UUID);

CREATE OR REPLACE FUNCTION public.relatorio_metricas_crm(
  data_inicio DATE DEFAULT NULL,
  data_fim DATE DEFAULT NULL,
  gestor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_orcamentos_ativos BIGINT,
  valor_total_pipeline NUMERIC,
  ticket_medio_geral NUMERIC,
  pipeline_ponderado_total NUMERIC,
  total_ganhos BIGINT,
  total_perdas BIGINT,
  taxa_conversao_geral NUMERIC
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  WITH orcamentos_filtrados AS (
    SELECT 
      oct.etapa_crm,
      COALESCE(oct.valor_lead_estimado, 0) as valor_lead
    FROM public.orcamentos o
    INNER JOIN public.orcamentos_crm_tracking oct ON oct.orcamento_id = o.id
    WHERE 
      (data_inicio IS NULL OR o.data_publicacao::date >= data_inicio)
      AND (data_fim IS NULL OR o.data_publicacao::date <= data_fim)
      AND (gestor_id IS NULL OR oct.concierge_responsavel_id = gestor_id)
      AND public.is_admin()
  ),
  metricas_base AS (
    SELECT 
      -- Total de orçamentos ativos (excluindo ganho e perdido)
      COUNT(*) FILTER (WHERE etapa_crm NOT IN ('ganho', 'perdido')) as total_ativos,
      
      -- Soma do pipeline (apenas ativos)
      SUM(valor_lead) FILTER (WHERE etapa_crm NOT IN ('ganho', 'perdido')) as pipeline_total,
      
      -- Ticket médio (apenas orçamentos ativos com valor > 0)
      AVG(valor_lead) FILTER (WHERE etapa_crm NOT IN ('ganho', 'perdido') AND valor_lead > 0) as ticket_medio,
      
      -- Pipeline ponderado (ativos com probabilidade por etapa)
      SUM(
        valor_lead * 
        CASE etapa_crm
          WHEN 'orcamento_postado' THEN 0.05
          WHEN 'contato_agendamento' THEN 0.15
          WHEN 'em_orcamento' THEN 0.30
          WHEN 'propostas_enviadas' THEN 0.50
          WHEN 'compatibilizacao' THEN 0.70
          WHEN 'fechamento_contrato' THEN 0.90
          WHEN 'pos_venda_feedback' THEN 0.95
          ELSE 0
        END
      ) FILTER (WHERE etapa_crm NOT IN ('ganho', 'perdido')) as pipeline_ponderado,
      
      -- Total de ganhos
      COUNT(*) FILTER (WHERE etapa_crm = 'ganho') as ganhos,
      
      -- Total de perdas
      COUNT(*) FILTER (WHERE etapa_crm = 'perdido') as perdas
    FROM orcamentos_filtrados
  )
  SELECT 
    mb.total_ativos::BIGINT,
    ROUND(COALESCE(mb.pipeline_total, 0), 2) as valor_total_pipeline,
    ROUND(COALESCE(mb.ticket_medio, 0), 2) as ticket_medio_geral,
    ROUND(COALESCE(mb.pipeline_ponderado, 0), 2) as pipeline_ponderado_total,
    mb.ganhos::BIGINT,
    mb.perdas::BIGINT,
    CASE 
      WHEN (mb.ganhos + mb.perdas) > 0 
      THEN ROUND((mb.ganhos * 100.0 / (mb.ganhos + mb.perdas))::numeric, 2)
      ELSE 0
    END as taxa_conversao_geral
  FROM metricas_base mb;
$$;