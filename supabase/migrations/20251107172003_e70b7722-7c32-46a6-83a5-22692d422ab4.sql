-- Atualizar função relatorio_funil_crm com valores reais e tempo médio

DROP FUNCTION IF EXISTS public.relatorio_funil_crm(DATE, DATE, UUID);

CREATE OR REPLACE FUNCTION public.relatorio_funil_crm(
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
      EXTRACT(DAY FROM (COALESCE(oct.updated_at, NOW()) - oct.data_entrada_etapa_atual)) as dias_na_etapa
    FROM public.orcamentos o
    INNER JOIN public.orcamentos_crm_tracking oct ON oct.orcamento_id = o.id
    WHERE 
      (data_inicio IS NULL OR o.data_publicacao::date >= data_inicio)
      AND (data_fim IS NULL OR o.data_publicacao::date <= data_fim)
      AND (gestor_id IS NULL OR oct.concierge_responsavel_id = gestor_id)
      AND public.is_admin()
  ),
  total_orcamentos AS (
    SELECT COUNT(*) as total FROM orcamentos_filtrados
  ),
  dados_etapa AS (
    SELECT 
      of.etapa_crm,
      COUNT(*) as qtd,
      SUM(of.valor_lead) as total_valor,
      AVG(of.valor_lead) FILTER (WHERE of.valor_lead > 0) as media_valor,
      AVG(of.dias_na_etapa) as tempo_medio,
      CASE of.etapa_crm
        WHEN 'orcamento_postado' THEN 1
        WHEN 'contato_agendamento' THEN 2
        WHEN 'em_orcamento' THEN 3
        WHEN 'propostas_enviadas' THEN 4
        WHEN 'compatibilizacao' THEN 5
        WHEN 'fechamento_contrato' THEN 6
        WHEN 'pos_venda_feedback' THEN 7
        WHEN 'ganho' THEN 8
        WHEN 'perdido' THEN 9
        ELSE 99
      END as ordem_etapa
    FROM orcamentos_filtrados of
    GROUP BY of.etapa_crm
  )
  SELECT 
    de.etapa_crm::TEXT,
    de.qtd::BIGINT,
    ROUND(COALESCE(de.total_valor, 0), 2),
    ROUND(COALESCE(de.media_valor, 0), 2),
    CASE 
      WHEN (SELECT total FROM total_orcamentos) > 0 
      THEN ROUND((de.qtd::NUMERIC / (SELECT total FROM total_orcamentos)::NUMERIC) * 100, 2)
      ELSE 0
    END,
    CASE 
      WHEN LAG(de.qtd) OVER (ORDER BY de.ordem_etapa) IS NOT NULL 
           AND LAG(de.qtd) OVER (ORDER BY de.ordem_etapa) > 0
      THEN ROUND((de.qtd::NUMERIC / LAG(de.qtd) OVER (ORDER BY de.ordem_etapa)::NUMERIC) * 100, 2)
      ELSE 100.00
    END,
    ROUND(COALESCE(de.tempo_medio, 0), 1),
    de.ordem_etapa
  FROM dados_etapa de
  ORDER BY de.ordem_etapa;
$$;