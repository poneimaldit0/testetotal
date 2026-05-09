-- Adicionar parâmetro fornecedor_id aos RPCs de relatório CRM

-- ============================================================================
-- 1. Atualizar relatorio_funil_crm para filtrar por fornecedor
-- ============================================================================
CREATE OR REPLACE FUNCTION relatorio_funil_crm(
  data_inicio date DEFAULT NULL,
  data_fim date DEFAULT NULL,
  gestor_id uuid DEFAULT NULL,
  fornecedor_id uuid DEFAULT NULL
)
RETURNS TABLE (
  etapa text,
  quantidade bigint,
  valor_total numeric,
  ticket_medio numeric,
  taxa_conversao numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH orcamentos_filtrados AS (
    SELECT 
      o.id,
      o.etapa_crm,
      o.budget_informado,
      o.created_at
    FROM orcamentos o
    LEFT JOIN orcamentos_crm_tracking oct ON oct.orcamento_id = o.id
    WHERE 
      o.etapa_crm IS NOT NULL
      AND (data_inicio IS NULL OR o.created_at::date >= data_inicio)
      AND (data_fim IS NULL OR o.created_at::date <= data_fim)
      AND (gestor_id IS NULL OR oct.concierge_responsavel_id = gestor_id)
      AND (fornecedor_id IS NULL OR EXISTS (
        SELECT 1 FROM candidaturas_fornecedores cf 
        WHERE cf.orcamento_id = o.id 
        AND cf.fornecedor_id = relatorio_funil_crm.fornecedor_id
      ))
  ),
  totais_por_etapa AS (
    SELECT 
      etapa_crm as etapa,
      COUNT(*) as quantidade,
      COALESCE(SUM(budget_informado), 0) as valor_total,
      CASE 
        WHEN COUNT(*) > 0 THEN COALESCE(SUM(budget_informado), 0) / COUNT(*)
        ELSE 0 
      END as ticket_medio
    FROM orcamentos_filtrados
    GROUP BY etapa_crm
  ),
  total_leads AS (
    SELECT COUNT(*) as total FROM orcamentos_filtrados
  )
  SELECT 
    t.etapa::text,
    t.quantidade,
    t.valor_total,
    t.ticket_medio,
    CASE 
      WHEN tl.total > 0 THEN (t.quantidade::numeric / tl.total::numeric) * 100
      ELSE 0 
    END as taxa_conversao
  FROM totais_por_etapa t
  CROSS JOIN total_leads tl
  ORDER BY t.etapa;
END;
$$;

-- ============================================================================
-- 2. Atualizar relatorio_funil_crm_acumulado para filtrar por fornecedor
-- ============================================================================
CREATE OR REPLACE FUNCTION relatorio_funil_crm_acumulado(
  data_inicio date DEFAULT NULL,
  data_fim date DEFAULT NULL,
  gestor_id uuid DEFAULT NULL,
  fornecedor_id uuid DEFAULT NULL
)
RETURNS TABLE (
  etapa text,
  quantidade bigint,
  percentual numeric,
  taxa_conversao_proxima numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_orcamentos bigint;
BEGIN
  -- Contar total de orçamentos que passaram pelo funil
  SELECT COUNT(DISTINCT o.id) INTO total_orcamentos
  FROM orcamentos o
  LEFT JOIN orcamentos_crm_tracking oct ON oct.orcamento_id = o.id
  LEFT JOIN crm_historico_movimentacoes chm ON chm.orcamento_id = o.id
  WHERE 
    (data_inicio IS NULL OR o.created_at::date >= data_inicio)
    AND (data_fim IS NULL OR o.created_at::date <= data_fim)
    AND (gestor_id IS NULL OR oct.concierge_responsavel_id = gestor_id)
    AND (fornecedor_id IS NULL OR EXISTS (
      SELECT 1 FROM candidaturas_fornecedores cf 
      WHERE cf.orcamento_id = o.id 
      AND cf.fornecedor_id = relatorio_funil_crm_acumulado.fornecedor_id
    ));

  RETURN QUERY
  WITH etapas_ordenadas AS (
    SELECT valor, ordem 
    FROM crm_etapas_config 
    WHERE tipo = 'orcamento' AND ativo = true
    ORDER BY ordem
  ),
  orcamentos_por_etapa AS (
    SELECT DISTINCT
      o.id as orcamento_id,
      COALESCE(chm.etapa_nova, o.etapa_crm) as etapa
    FROM orcamentos o
    LEFT JOIN orcamentos_crm_tracking oct ON oct.orcamento_id = o.id
    LEFT JOIN crm_historico_movimentacoes chm ON chm.orcamento_id = o.id
    WHERE 
      (data_inicio IS NULL OR o.created_at::date >= data_inicio)
      AND (data_fim IS NULL OR o.created_at::date <= data_fim)
      AND (gestor_id IS NULL OR oct.concierge_responsavel_id = gestor_id)
      AND (fornecedor_id IS NULL OR EXISTS (
        SELECT 1 FROM candidaturas_fornecedores cf 
        WHERE cf.orcamento_id = o.id 
        AND cf.fornecedor_id = relatorio_funil_crm_acumulado.fornecedor_id
      ))
  ),
  contagem_por_etapa AS (
    SELECT 
      ope.etapa,
      COUNT(DISTINCT ope.orcamento_id) as quantidade,
      eo.ordem
    FROM orcamentos_por_etapa ope
    JOIN etapas_ordenadas eo ON eo.valor = ope.etapa
    GROUP BY ope.etapa, eo.ordem
  )
  SELECT 
    cpe.etapa::text,
    cpe.quantidade,
    CASE 
      WHEN total_orcamentos > 0 THEN (cpe.quantidade::numeric / total_orcamentos::numeric) * 100
      ELSE 0 
    END as percentual,
    CASE 
      WHEN LAG(cpe.quantidade) OVER (ORDER BY cpe.ordem) > 0 
      THEN (cpe.quantidade::numeric / LAG(cpe.quantidade) OVER (ORDER BY cpe.ordem)::numeric) * 100
      ELSE 0 
    END as taxa_conversao_proxima
  FROM contagem_por_etapa cpe
  ORDER BY cpe.ordem;
END;
$$;

-- ============================================================================
-- 3. Atualizar relatorio_metricas_crm para filtrar por fornecedor
-- ============================================================================
CREATE OR REPLACE FUNCTION relatorio_metricas_crm(
  data_inicio date DEFAULT NULL,
  data_fim date DEFAULT NULL,
  gestor_id uuid DEFAULT NULL,
  fornecedor_id uuid DEFAULT NULL
)
RETURNS TABLE (
  total_orcamentos bigint,
  orcamentos_ganhos bigint,
  orcamentos_perdidos bigint,
  valor_total_ganhos numeric,
  valor_total_perdidos numeric,
  ticket_medio_ganhos numeric,
  taxa_conversao_ganhos numeric,
  taxa_conversao_perdidos numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH orcamentos_filtrados AS (
    SELECT 
      o.id,
      o.etapa_crm,
      o.budget_informado
    FROM orcamentos o
    LEFT JOIN orcamentos_crm_tracking oct ON oct.orcamento_id = o.id
    WHERE 
      o.etapa_crm IS NOT NULL
      AND (data_inicio IS NULL OR o.created_at::date >= data_inicio)
      AND (data_fim IS NULL OR o.created_at::date <= data_fim)
      AND (gestor_id IS NULL OR oct.concierge_responsavel_id = gestor_id)
      AND (fornecedor_id IS NULL OR EXISTS (
        SELECT 1 FROM candidaturas_fornecedores cf 
        WHERE cf.orcamento_id = o.id 
        AND cf.fornecedor_id = relatorio_metricas_crm.fornecedor_id
      ))
  )
  SELECT 
    COUNT(*)::bigint as total_orcamentos,
    COUNT(*) FILTER (WHERE etapa_crm = 'ganho')::bigint as orcamentos_ganhos,
    COUNT(*) FILTER (WHERE etapa_crm = 'perdido')::bigint as orcamentos_perdidos,
    COALESCE(SUM(budget_informado) FILTER (WHERE etapa_crm = 'ganho'), 0) as valor_total_ganhos,
    COALESCE(SUM(budget_informado) FILTER (WHERE etapa_crm = 'perdido'), 0) as valor_total_perdidos,
    CASE 
      WHEN COUNT(*) FILTER (WHERE etapa_crm = 'ganho') > 0 
      THEN COALESCE(SUM(budget_informado) FILTER (WHERE etapa_crm = 'ganho'), 0) / COUNT(*) FILTER (WHERE etapa_crm = 'ganho')
      ELSE 0 
    END as ticket_medio_ganhos,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE etapa_crm = 'ganho')::numeric / COUNT(*)::numeric) * 100
      ELSE 0 
    END as taxa_conversao_ganhos,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE etapa_crm = 'perdido')::numeric / COUNT(*)::numeric) * 100
      ELSE 0 
    END as taxa_conversao_perdidos
  FROM orcamentos_filtrados;
END;
$$;