-- Criar função relatorio_funil_crm_acumulado para mostrar quantos leads passaram por cada etapa

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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  WITH leads_por_etapa AS (
    SELECT DISTINCT ON (h.orcamento_id, h.etapa_nova)
      h.orcamento_id,
      h.etapa_nova,
      h.data_movimentacao,
      CASE h.etapa_nova
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
    FROM public.orcamentos_crm_historico h
    INNER JOIN public.orcamentos_crm_tracking oct ON oct.orcamento_id = h.orcamento_id
    WHERE 
      (data_inicio IS NULL OR h.data_movimentacao >= data_inicio)
      AND (data_fim IS NULL OR h.data_movimentacao <= data_fim)
      AND (gestor_id IS NULL OR oct.concierge_responsavel_id = gestor_id)
      AND public.is_admin()
  ),
  contagem_por_etapa AS (
    SELECT 
      lpe.etapa_nova,
      lpe.ordem_etapa,
      COUNT(DISTINCT lpe.orcamento_id) as total_passou
    FROM leads_por_etapa lpe
    GROUP BY lpe.etapa_nova, lpe.ordem_etapa
  ),
  total_geral AS (
    SELECT COUNT(DISTINCT orcamento_id) as total FROM leads_por_etapa
  ),
  proxima_etapa AS (
    SELECT 
      cpe.etapa_nova,
      cpe.ordem_etapa,
      cpe.total_passou,
      LEAD(cpe.total_passou) OVER (ORDER BY cpe.ordem_etapa) as proxima_qtd
    FROM contagem_por_etapa cpe
  )
  SELECT 
    pe.etapa_nova::TEXT,
    pe.total_passou::BIGINT,
    ROUND((pe.total_passou::NUMERIC / NULLIF(tg.total, 0)) * 100, 1) as percentual_total,
    CASE 
      WHEN pe.proxima_qtd IS NOT NULL AND pe.total_passou > 0 
      THEN ROUND((pe.proxima_qtd::NUMERIC / pe.total_passou) * 100, 1)
      ELSE NULL
    END as taxa_conversao_proxima,
    pe.ordem_etapa::INTEGER
  FROM proxima_etapa pe
  CROSS JOIN total_geral tg
  WHERE pe.etapa_nova NOT IN ('ganho', 'perdido')
  ORDER BY pe.ordem_etapa;
$$;