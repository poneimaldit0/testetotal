-- Drop das funções existentes
DROP FUNCTION IF EXISTS relatorio_funil_crm(DATE, DATE, UUID, UUID);
DROP FUNCTION IF EXISTS relatorio_funil_crm_acumulado(DATE, DATE, UUID, UUID);
DROP FUNCTION IF EXISTS relatorio_metricas_crm(DATE, DATE, UUID, UUID);

-- Recriar função relatorio_funil_crm com correções
CREATE OR REPLACE FUNCTION relatorio_funil_crm(
  data_inicio DATE DEFAULT NULL,
  data_fim DATE DEFAULT NULL,
  gestor_id UUID DEFAULT NULL,
  fornecedor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  etapa TEXT,
  quantidade BIGINT,
  valor_total NUMERIC,
  ticket_medio NUMERIC,
  taxa_conversao NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH dados_funil AS (
    SELECT 
      oct.etapa_crm,
      COUNT(DISTINCT o.id) as qtd,
      COALESCE(SUM(o.orcamento_estimado), 0) as valor
    FROM orcamentos o
    INNER JOIN orcamentos_crm_tracking oct ON oct.orcamento_id = o.id
    LEFT JOIN candidaturas_fornecedores cf ON cf.orcamento_id = o.id
    WHERE 
      oct.etapa_crm IS NOT NULL
      AND oct.etapa_crm NOT IN ('ganho', 'perdido')
      AND (data_inicio IS NULL OR o.created_at::date >= data_inicio)
      AND (data_fim IS NULL OR o.created_at::date <= data_fim)
      AND (gestor_id IS NULL OR oct.concierge_responsavel_id = gestor_id)
      AND (fornecedor_id IS NULL OR cf.fornecedor_id = fornecedor_id)
    GROUP BY oct.etapa_crm
  ),
  total_orcamentos AS (
    SELECT SUM(qtd) as total FROM dados_funil
  )
  SELECT 
    df.etapa_crm::TEXT as etapa,
    df.qtd as quantidade,
    df.valor as valor_total,
    CASE WHEN df.qtd > 0 THEN df.valor / df.qtd ELSE 0 END as ticket_medio,
    CASE WHEN t.total > 0 THEN (df.qtd::NUMERIC / t.total::NUMERIC) * 100 ELSE 0 END as taxa_conversao
  FROM dados_funil df
  CROSS JOIN total_orcamentos t
  ORDER BY 
    CASE df.etapa_crm
      WHEN 'qualificacao' THEN 1
      WHEN 'apresentacao' THEN 2
      WHEN 'negociacao' THEN 3
      WHEN 'proposta' THEN 4
      WHEN 'fechamento' THEN 5
      ELSE 999
    END;
END;
$$ LANGUAGE plpgsql;

-- Recriar função relatorio_funil_crm_acumulado com correções
CREATE OR REPLACE FUNCTION relatorio_funil_crm_acumulado(
  data_inicio DATE DEFAULT NULL,
  data_fim DATE DEFAULT NULL,
  gestor_id UUID DEFAULT NULL,
  fornecedor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  etapa TEXT,
  quantidade_passou BIGINT,
  percentual_total NUMERIC,
  taxa_conversao_proxima NUMERIC,
  ordem INT
) AS $$
BEGIN
  RETURN QUERY
  WITH orcamentos_filtrados AS (
    SELECT DISTINCT o.id
    FROM orcamentos o
    INNER JOIN orcamentos_crm_tracking oct ON oct.orcamento_id = o.id
    LEFT JOIN candidaturas_fornecedores cf ON cf.orcamento_id = o.id
    WHERE 
      (data_inicio IS NULL OR o.created_at::date >= data_inicio)
      AND (data_fim IS NULL OR o.created_at::date <= data_fim)
      AND (gestor_id IS NULL OR oct.concierge_responsavel_id = gestor_id)
      AND (fornecedor_id IS NULL OR cf.fornecedor_id = fornecedor_id)
  ),
  etapas_passadas AS (
    SELECT 
      och.etapa_nova as etapa,
      COUNT(DISTINCT och.orcamento_id) as qtd
    FROM orcamentos_crm_historico och
    INNER JOIN orcamentos_filtrados of ON of.id = och.orcamento_id
    WHERE och.etapa_nova IS NOT NULL
      AND och.etapa_nova NOT IN ('ganho', 'perdido')
    GROUP BY och.etapa_nova
  ),
  etapa_atual AS (
    SELECT 
      oct.etapa_crm as etapa,
      COUNT(DISTINCT oct.orcamento_id) as qtd
    FROM orcamentos_crm_tracking oct
    INNER JOIN orcamentos_filtrados of ON of.id = oct.orcamento_id
    WHERE oct.etapa_crm IS NOT NULL
      AND oct.etapa_crm NOT IN ('ganho', 'perdido')
    GROUP BY oct.etapa_crm
  ),
  todas_etapas AS (
    SELECT etapa, qtd FROM etapas_passadas
    UNION
    SELECT etapa, qtd FROM etapa_atual
  ),
  agrupado AS (
    SELECT 
      etapa,
      SUM(qtd) as total
    FROM todas_etapas
    GROUP BY etapa
  ),
  total_geral AS (
    SELECT SUM(total) as total FROM agrupado
  ),
  com_ordem AS (
    SELECT 
      a.etapa,
      a.total,
      CASE 
        WHEN a.etapa = 'qualificacao' THEN 1
        WHEN a.etapa = 'apresentacao' THEN 2
        WHEN a.etapa = 'negociacao' THEN 3
        WHEN a.etapa = 'proposta' THEN 4
        WHEN a.etapa = 'fechamento' THEN 5
        ELSE 999
      END as ordem
    FROM agrupado a
  )
  SELECT 
    co.etapa::TEXT,
    co.total as quantidade_passou,
    CASE WHEN tg.total > 0 THEN (co.total::NUMERIC / tg.total::NUMERIC) * 100 ELSE 0 END as percentual_total,
    CASE 
      WHEN LEAD(co.total) OVER (ORDER BY co.ordem) IS NOT NULL 
      THEN (LEAD(co.total) OVER (ORDER BY co.ordem)::NUMERIC / co.total::NUMERIC) * 100
      ELSE 0 
    END as taxa_conversao_proxima,
    co.ordem
  FROM com_ordem co
  CROSS JOIN total_geral tg
  ORDER BY co.ordem;
END;
$$ LANGUAGE plpgsql;

-- Recriar função relatorio_metricas_crm com correções
CREATE OR REPLACE FUNCTION relatorio_metricas_crm(
  data_inicio DATE DEFAULT NULL,
  data_fim DATE DEFAULT NULL,
  gestor_id UUID DEFAULT NULL,
  fornecedor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_orcamentos BIGINT,
  valor_total_pipeline NUMERIC,
  ticket_medio_geral NUMERIC,
  taxa_conversao_geral NUMERIC,
  total_ganhos BIGINT,
  total_perdidos BIGINT,
  valor_ganho NUMERIC,
  valor_perdido NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH base_dados AS (
    SELECT 
      o.id,
      o.orcamento_estimado,
      oct.etapa_crm
    FROM orcamentos o
    INNER JOIN orcamentos_crm_tracking oct ON oct.orcamento_id = o.id
    LEFT JOIN candidaturas_fornecedores cf ON cf.orcamento_id = o.id
    WHERE 
      (data_inicio IS NULL OR o.created_at::date >= data_inicio)
      AND (data_fim IS NULL OR o.created_at::date <= data_fim)
      AND (gestor_id IS NULL OR oct.concierge_responsavel_id = gestor_id)
      AND (fornecedor_id IS NULL OR cf.fornecedor_id = fornecedor_id)
  )
  SELECT 
    COUNT(DISTINCT bd.id)::BIGINT as total_orcamentos,
    COALESCE(SUM(bd.orcamento_estimado), 0)::NUMERIC as valor_total_pipeline,
    CASE 
      WHEN COUNT(DISTINCT bd.id) > 0 
      THEN (COALESCE(SUM(bd.orcamento_estimado), 0) / COUNT(DISTINCT bd.id))::NUMERIC 
      ELSE 0 
    END as ticket_medio_geral,
    CASE 
      WHEN COUNT(DISTINCT bd.id) > 0 
      THEN ((COUNT(DISTINCT CASE WHEN bd.etapa_crm = 'ganho' THEN bd.id END)::NUMERIC / COUNT(DISTINCT bd.id)::NUMERIC) * 100)::NUMERIC
      ELSE 0 
    END as taxa_conversao_geral,
    COUNT(DISTINCT CASE WHEN bd.etapa_crm = 'ganho' THEN bd.id END)::BIGINT as total_ganhos,
    COUNT(DISTINCT CASE WHEN bd.etapa_crm = 'perdido' THEN bd.id END)::BIGINT as total_perdidos,
    COALESCE(SUM(CASE WHEN bd.etapa_crm = 'ganho' THEN bd.orcamento_estimado ELSE 0 END), 0)::NUMERIC as valor_ganho,
    COALESCE(SUM(CASE WHEN bd.etapa_crm = 'perdido' THEN bd.orcamento_estimado ELSE 0 END), 0)::NUMERIC as valor_perdido
  FROM base_dados bd;
END;
$$ LANGUAGE plpgsql;