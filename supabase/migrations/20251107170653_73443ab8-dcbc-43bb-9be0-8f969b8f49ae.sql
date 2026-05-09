-- Corrigir função relatorio_funil_crm para retornar todos os campos esperados

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
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_orcamentos BIGINT;
BEGIN
  -- Calcular total de orçamentos para percentual
  SELECT COUNT(*) INTO total_orcamentos
  FROM view_orcamentos_crm o
  WHERE 
    (data_inicio IS NULL OR o.data_publicacao >= data_inicio)
    AND (data_fim IS NULL OR o.data_publicacao <= data_fim)
    AND (gestor_id IS NULL OR o.gestor_conta_id = gestor_id);

  RETURN QUERY
  WITH dados_etapa AS (
    SELECT 
      o.etapa_crm,
      COUNT(*)::BIGINT as qtd
    FROM view_orcamentos_crm o
    WHERE 
      (data_inicio IS NULL OR o.data_publicacao >= data_inicio)
      AND (data_fim IS NULL OR o.data_publicacao <= data_fim)
      AND (gestor_id IS NULL OR o.gestor_conta_id = gestor_id)
    GROUP BY o.etapa_crm
  ),
  dados_com_ordem AS (
    SELECT 
      de.etapa_crm,
      de.qtd,
      CASE de.etapa_crm
        WHEN 'qualificacao' THEN 1
        WHEN 'contato' THEN 2
        WHEN 'apresentacao' THEN 3
        WHEN 'proposta' THEN 4
        WHEN 'negociacao' THEN 5
        WHEN 'fechamento' THEN 6
        WHEN 'ganho' THEN 7
        WHEN 'perdido' THEN 8
        ELSE 99
      END as ordem_etapa
    FROM dados_etapa de
  )
  SELECT 
    dco.etapa_crm::TEXT as etapa,
    dco.qtd as quantidade,
    0::NUMERIC as valor_total,
    0::NUMERIC as ticket_medio,
    CASE 
      WHEN total_orcamentos > 0 
      THEN ROUND((dco.qtd::NUMERIC / total_orcamentos::NUMERIC) * 100, 2)
      ELSE 0
    END as percentual_total,
    CASE 
      WHEN LAG(dco.qtd) OVER (ORDER BY dco.ordem_etapa) IS NOT NULL AND LAG(dco.qtd) OVER (ORDER BY dco.ordem_etapa) > 0
      THEN ROUND((dco.qtd::NUMERIC / LAG(dco.qtd) OVER (ORDER BY dco.ordem_etapa)::NUMERIC) * 100, 2)
      ELSE 100.00
    END as taxa_conversao_proxima,
    0::NUMERIC as tempo_medio_dias,
    dco.ordem_etapa as ordem
  FROM dados_com_ordem dco
  ORDER BY dco.ordem_etapa;
END;
$$;