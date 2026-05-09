-- Corrige a função relatorio_funil_crm_acumulado para usar o nome correto da coluna

CREATE OR REPLACE FUNCTION public.relatorio_funil_crm_acumulado(
  data_inicio DATE DEFAULT NULL,
  data_fim DATE DEFAULT NULL,
  gestor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  etapa TEXT,
  quantidade_passou BIGINT,
  percentual_total NUMERIC,
  taxa_conversao_proxima NUMERIC,
  ordem INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH leads_no_periodo AS (
    -- Identifica leads que ENTRARAM no CRM durante o período filtrado
    -- (primeira movimentação onde etapa_anterior IS NULL)
    SELECT DISTINCT och.orcamento_id
    FROM orcamentos_crm_historico och
    INNER JOIN orcamentos_crm_tracking oct ON och.orcamento_id = oct.orcamento_id
    WHERE och.etapa_anterior IS NULL  -- Primeira movimentação = entrada no CRM
      AND (data_inicio IS NULL OR och.data_movimentacao::date >= data_inicio)
      AND (data_fim IS NULL OR och.data_movimentacao::date <= data_fim)
      AND (gestor_id IS NULL OR oct.concierge_responsavel_id = gestor_id)
      AND is_admin()
  ),
  contagem_etapas AS (
    -- Conta quantos dos leads que entraram no período passaram por cada etapa
    -- (considera TODAS as movimentações desses leads, sem filtro de data)
    SELECT 
      och.etapa_nova::TEXT as etapa,
      COUNT(DISTINCT och.orcamento_id) as quantidade,
      CASE och.etapa_nova
        WHEN 'orcamento_postado' THEN 1
        WHEN 'contato_agendamento' THEN 2
        WHEN 'em_orcamento' THEN 3
        WHEN 'propostas_enviadas' THEN 4
        WHEN 'compatibilizacao' THEN 5
        WHEN 'fechamento_contrato' THEN 6
        WHEN 'pos_venda_feedback' THEN 7
        ELSE 99
      END as ordem_etapa
    FROM orcamentos_crm_historico och
    WHERE och.orcamento_id IN (SELECT orcamento_id FROM leads_no_periodo)
      AND och.etapa_nova NOT IN ('ganho', 'perdido')
    GROUP BY och.etapa_nova
  ),
  total_leads AS (
    -- Total de leads que entraram no período (primeira etapa)
    SELECT COALESCE(SUM(quantidade), 0) as total
    FROM contagem_etapas
    WHERE ordem_etapa = 1
  )
  SELECT 
    ce.etapa::TEXT,
    ce.quantidade::BIGINT as quantidade_passou,
    ROUND((ce.quantidade::NUMERIC / NULLIF(tl.total, 0)) * 100, 1) as percentual_total,
    -- Taxa de conversão para próxima etapa
    ROUND(
      (COALESCE(
        (SELECT quantidade FROM contagem_etapas WHERE ordem_etapa = ce.ordem_etapa + 1),
        0
      )::NUMERIC / NULLIF(ce.quantidade, 0)) * 100,
      1
    ) as taxa_conversao_proxima,
    ce.ordem_etapa::INTEGER as ordem
  FROM contagem_etapas ce
  CROSS JOIN total_leads tl
  ORDER BY ce.ordem_etapa;
END;
$$;