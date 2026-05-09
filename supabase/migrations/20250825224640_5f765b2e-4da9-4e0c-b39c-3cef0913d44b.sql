-- Criar função para relatório de perfil de orçamentos
CREATE OR REPLACE FUNCTION public.relatorio_perfil_orcamentos(
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS TABLE(
  total_orcamentos bigint,
  tamanho_medio numeric,
  tamanho_mediano numeric,
  -- Distribuição por faixas de tamanho
  faixa_0_10 bigint,
  faixa_10_30 bigint,
  faixa_30_60 bigint,
  faixa_60_100 bigint,
  faixa_100_150 bigint,
  faixa_acima_150 bigint,
  -- Percentuais das faixas
  perc_0_10 numeric,
  perc_10_30 numeric,
  perc_30_60 numeric,
  perc_60_100 numeric,
  perc_100_150 numeric,
  perc_acima_150 numeric,
  -- Distribuição por prazo
  prazo_imediato bigint,
  prazo_3_meses bigint,
  prazo_6_meses bigint,
  prazo_9_meses bigint,
  prazo_12_meses bigint,
  prazo_flexivel bigint,
  -- Percentuais dos prazos
  perc_prazo_imediato numeric,
  perc_prazo_3_meses numeric,
  perc_prazo_6_meses numeric,
  perc_prazo_9_meses numeric,
  perc_prazo_12_meses numeric,
  perc_prazo_flexivel numeric,
  -- Status
  status_abertos bigint,
  status_fechados bigint,
  perc_abertos numeric,
  perc_fechados numeric,
  -- Top categorias (JSON array)
  top_categorias jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
WITH orcamentos_filtrados AS (
  SELECT 
    o.*,
    CASE 
      WHEN o.tamanho_imovel IS NULL OR o.tamanho_imovel = 0 THEN 'sem_informacao'
      WHEN o.tamanho_imovel <= 10 THEN '0_10'
      WHEN o.tamanho_imovel <= 30 THEN '10_30'
      WHEN o.tamanho_imovel <= 60 THEN '30_60'
      WHEN o.tamanho_imovel <= 100 THEN '60_100'
      WHEN o.tamanho_imovel <= 150 THEN '100_150'
      ELSE 'acima_150'
    END as faixa_tamanho,
    CASE 
      WHEN o.prazo_inicio_texto ILIKE '%imediato%' OR o.prazo_inicio_texto ILIKE '%urgente%' THEN 'imediato'
      WHEN o.prazo_inicio_texto ILIKE '%3 meses%' OR o.prazo_inicio_texto ILIKE '%até 3%' THEN '3_meses'
      WHEN o.prazo_inicio_texto ILIKE '%6 meses%' OR o.prazo_inicio_texto ILIKE '%3 a 6%' THEN '6_meses'
      WHEN o.prazo_inicio_texto ILIKE '%9 meses%' OR o.prazo_inicio_texto ILIKE '%6 a 9%' THEN '9_meses'
      WHEN o.prazo_inicio_texto ILIKE '%12 meses%' OR o.prazo_inicio_texto ILIKE '%9 a 12%' THEN '12_meses'
      ELSE 'flexivel'
    END as categoria_prazo
  FROM public.orcamentos o
  WHERE 
    (p_data_inicio IS NULL OR o.data_publicacao::date >= p_data_inicio)
    AND (p_data_fim IS NULL OR o.data_publicacao::date <= p_data_fim)
    AND public.is_admin()
),
estatisticas_tamanho AS (
  SELECT 
    COUNT(*) as total,
    ROUND(AVG(tamanho_imovel), 2) as media,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY tamanho_imovel), 2) as mediana,
    COUNT(*) FILTER (WHERE faixa_tamanho = '0_10') as faixa_0_10,
    COUNT(*) FILTER (WHERE faixa_tamanho = '10_30') as faixa_10_30,
    COUNT(*) FILTER (WHERE faixa_tamanho = '30_60') as faixa_30_60,
    COUNT(*) FILTER (WHERE faixa_tamanho = '60_100') as faixa_60_100,
    COUNT(*) FILTER (WHERE faixa_tamanho = '100_150') as faixa_100_150,
    COUNT(*) FILTER (WHERE faixa_tamanho = 'acima_150') as faixa_acima_150
  FROM orcamentos_filtrados
  WHERE tamanho_imovel > 0
),
estatisticas_prazo AS (
  SELECT 
    COUNT(*) FILTER (WHERE categoria_prazo = 'imediato') as prazo_imediato,
    COUNT(*) FILTER (WHERE categoria_prazo = '3_meses') as prazo_3_meses,
    COUNT(*) FILTER (WHERE categoria_prazo = '6_meses') as prazo_6_meses,
    COUNT(*) FILTER (WHERE categoria_prazo = '9_meses') as prazo_9_meses,
    COUNT(*) FILTER (WHERE categoria_prazo = '12_meses') as prazo_12_meses,
    COUNT(*) FILTER (WHERE categoria_prazo = 'flexivel') as prazo_flexivel
  FROM orcamentos_filtrados
),
estatisticas_status AS (
  SELECT 
    COUNT(*) FILTER (WHERE status = 'aberto') as abertos,
    COUNT(*) FILTER (WHERE status != 'aberto') as fechados
  FROM orcamentos_filtrados
),
top_categorias AS (
  SELECT jsonb_agg(
    jsonb_build_object(
      'categoria', categoria,
      'quantidade', quantidade,
      'percentual', ROUND((quantidade * 100.0 / SUM(quantidade) OVER())::numeric, 2)
    ) ORDER BY quantidade DESC
  ) as categorias_json
  FROM (
    SELECT 
      unnest(categorias) as categoria,
      COUNT(*) as quantidade
    FROM orcamentos_filtrados
    GROUP BY unnest(categorias)
    ORDER BY COUNT(*) DESC
    LIMIT 10
  ) sub
)
SELECT 
  et.total,
  et.media,
  et.mediana,
  et.faixa_0_10,
  et.faixa_10_30,
  et.faixa_30_60,
  et.faixa_60_100,
  et.faixa_100_150,
  et.faixa_acima_150,
  ROUND((et.faixa_0_10 * 100.0 / NULLIF(et.total, 0))::numeric, 2) as perc_0_10,
  ROUND((et.faixa_10_30 * 100.0 / NULLIF(et.total, 0))::numeric, 2) as perc_10_30,
  ROUND((et.faixa_30_60 * 100.0 / NULLIF(et.total, 0))::numeric, 2) as perc_30_60,
  ROUND((et.faixa_60_100 * 100.0 / NULLIF(et.total, 0))::numeric, 2) as perc_60_100,
  ROUND((et.faixa_100_150 * 100.0 / NULLIF(et.total, 0))::numeric, 2) as perc_100_150,
  ROUND((et.faixa_acima_150 * 100.0 / NULLIF(et.total, 0))::numeric, 2) as perc_acima_150,
  ep.prazo_imediato,
  ep.prazo_3_meses,
  ep.prazo_6_meses,
  ep.prazo_9_meses,
  ep.prazo_12_meses,
  ep.prazo_flexivel,
  ROUND((ep.prazo_imediato * 100.0 / NULLIF(et.total, 0))::numeric, 2) as perc_prazo_imediato,
  ROUND((ep.prazo_3_meses * 100.0 / NULLIF(et.total, 0))::numeric, 2) as perc_prazo_3_meses,
  ROUND((ep.prazo_6_meses * 100.0 / NULLIF(et.total, 0))::numeric, 2) as perc_prazo_6_meses,
  ROUND((ep.prazo_9_meses * 100.0 / NULLIF(et.total, 0))::numeric, 2) as perc_prazo_9_meses,
  ROUND((ep.prazo_12_meses * 100.0 / NULLIF(et.total, 0))::numeric, 2) as perc_prazo_12_meses,
  ROUND((ep.prazo_flexivel * 100.0 / NULLIF(et.total, 0))::numeric, 2) as perc_prazo_flexivel,
  es.abertos,
  es.fechados,
  ROUND((es.abertos * 100.0 / NULLIF((es.abertos + es.fechados), 0))::numeric, 2) as perc_abertos,
  ROUND((es.fechados * 100.0 / NULLIF((es.abertos + es.fechados), 0))::numeric, 2) as perc_fechados,
  COALESCE(tc.categorias_json, '[]'::jsonb) as top_categorias
FROM estatisticas_tamanho et
CROSS JOIN estatisticas_prazo ep
CROSS JOIN estatisticas_status es
CROSS JOIN top_categorias tc;
$function$;