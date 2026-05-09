-- Função para calcular métricas de Lifetime e Churn
CREATE OR REPLACE FUNCTION public.relatorio_lt_churn(
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_agrupamento TEXT DEFAULT 'mensal'
)
RETURNS TABLE(
  -- Métricas gerais
  total_fornecedores BIGINT,
  fornecedores_ativos BIGINT,
  fornecedores_churned BIGINT,
  
  -- Lifetime médios
  lt_medio_geral NUMERIC,
  lt_medio_ativos NUMERIC,
  lt_medio_churned NUMERIC,
  
  -- Churn rates
  churn_rate_periodo NUMERIC,
  churn_rate_mensal NUMERIC,
  
  -- Métricas por coorte
  coortes_dados JSONB,
  
  -- Distribuição de lifetime
  distribuicao_lt JSONB,
  
  -- Dados para curva de sobrevivência
  curva_sobrevivencia JSONB,
  
  -- Comparação com período anterior
  comparacao_periodo_anterior JSONB
)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
WITH periodo_filtro AS (
  SELECT 
    COALESCE(p_data_inicio, '2024-01-01'::date) as data_inicio,
    COALESCE(p_data_fim, CURRENT_DATE) as data_fim
),
fornecedores_base AS (
  SELECT 
    p.id,
    p.nome,
    p.email,
    p.empresa,
    p.status,
    p.data_criacao::date as data_cadastro,
    p.data_termino_contrato,
    -- Calcular lifetime em dias
    CASE 
      WHEN p.status = 'ativo' THEN 
        (CURRENT_DATE - p.data_criacao::date)::integer
      WHEN p.data_termino_contrato IS NOT NULL THEN
        (p.data_termino_contrato - p.data_criacao::date)::integer
      ELSE 
        (CURRENT_DATE - p.data_criacao::date)::integer
    END as lifetime_dias,
    -- Determinar se churned
    CASE 
      WHEN p.status != 'ativo' OR (p.data_termino_contrato IS NOT NULL AND p.data_termino_contrato < CURRENT_DATE) THEN true
      ELSE false
    END as is_churned,
    -- Coorte (mês/ano de cadastro)
    DATE_TRUNC('month', p.data_criacao) as coorte_mes
  FROM public.profiles p
  WHERE p.tipo_usuario = 'fornecedor'
    AND public.is_admin()
    AND p.data_criacao::date >= (SELECT data_inicio FROM periodo_filtro)
    AND p.data_criacao::date <= (SELECT data_fim FROM periodo_filtro)
),
metricas_gerais AS (
  SELECT 
    COUNT(*) as total_fornecedores,
    COUNT(*) FILTER (WHERE NOT is_churned) as fornecedores_ativos,
    COUNT(*) FILTER (WHERE is_churned) as fornecedores_churned,
    ROUND(AVG(lifetime_dias)::numeric, 1) as lt_medio_geral,
    ROUND(AVG(lifetime_dias) FILTER (WHERE NOT is_churned)::numeric, 1) as lt_medio_ativos,
    ROUND(AVG(lifetime_dias) FILTER (WHERE is_churned)::numeric, 1) as lt_medio_churned,
    ROUND((COUNT(*) FILTER (WHERE is_churned) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) as churn_rate_periodo
  FROM fornecedores_base
),
analise_coortes AS (
  SELECT jsonb_agg(
    jsonb_build_object(
      'coorte', coorte_mes,
      'total_cadastrados', total_cadastrados,
      'ainda_ativos', ainda_ativos,
      'churned', churned,
      'churn_rate', churn_rate,
      'lt_medio', lt_medio
    ) ORDER BY coorte_mes DESC
  ) as coortes_dados
  FROM (
    SELECT 
      coorte_mes,
      COUNT(*) as total_cadastrados,
      COUNT(*) FILTER (WHERE NOT is_churned) as ainda_ativos,
      COUNT(*) FILTER (WHERE is_churned) as churned,
      ROUND((COUNT(*) FILTER (WHERE is_churned) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) as churn_rate,
      ROUND(AVG(lifetime_dias)::numeric, 1) as lt_medio
    FROM fornecedores_base
    GROUP BY coorte_mes
  ) coorte_stats
),
distribuicao_lifetime AS (
  SELECT jsonb_build_object(
    'percentis', jsonb_build_object(
      'p25', PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY lifetime_dias),
      'p50', PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY lifetime_dias),
      'p75', PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY lifetime_dias),
      'p90', PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY lifetime_dias),
      'p95', PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY lifetime_dias)
    ),
    'faixas', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'faixa', faixa_nome,
          'quantidade', quantidade,
          'percentual', ROUND((quantidade * 100.0 / total_forn)::numeric, 2)
        )
      )
      FROM (
        SELECT 
          CASE 
            WHEN lifetime_dias <= 30 THEN '0-30 dias'
            WHEN lifetime_dias <= 90 THEN '31-90 dias'
            WHEN lifetime_dias <= 180 THEN '91-180 dias'
            WHEN lifetime_dias <= 365 THEN '181-365 dias'
            ELSE '> 365 dias'
          END as faixa_nome,
          COUNT(*) as quantidade,
          (SELECT COUNT(*) FROM fornecedores_base) as total_forn
        FROM fornecedores_base
        GROUP BY 1
      ) faixas_data
    )
  ) as distribuicao_lt
  FROM fornecedores_base
  LIMIT 1
),
sobrevivencia AS (
  SELECT jsonb_agg(
    jsonb_build_object(
      'dias', dias_marco,
      'sobreviventes', sobreviventes,
      'taxa_sobrevivencia', ROUND((sobreviventes * 100.0 / total_inicial)::numeric, 2)
    ) ORDER BY dias_marco
  ) as curva_sobrevivencia
  FROM (
    SELECT 
      marcos.dias_marco,
      COUNT(*) FILTER (WHERE fb.lifetime_dias >= marcos.dias_marco AND NOT fb.is_churned) as sobreviventes,
      (SELECT COUNT(*) FROM fornecedores_base) as total_inicial
    FROM (VALUES (30), (60), (90), (180), (365), (730)) AS marcos(dias_marco)
    CROSS JOIN fornecedores_base fb
    GROUP BY marcos.dias_marco
  ) sobrev_data
),
churn_mensal AS (
  SELECT ROUND(AVG(churn_mensal_rate)::numeric, 2) as churn_rate_mensal
  FROM (
    SELECT 
      DATE_TRUNC('month', data_cadastro + INTERVAL '1 month' * generate_series(0, 11)) as mes,
      (COUNT(*) FILTER (WHERE is_churned AND coorte_mes = DATE_TRUNC('month', data_cadastro)) * 100.0 / 
       NULLIF(COUNT(*) FILTER (WHERE coorte_mes = DATE_TRUNC('month', data_cadastro)), 0)) as churn_mensal_rate
    FROM fornecedores_base
    WHERE data_cadastro >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY mes, DATE_TRUNC('month', data_cadastro)
  ) churn_data
)
SELECT 
  mg.total_fornecedores,
  mg.fornecedores_ativos,
  mg.fornecedores_churned,
  mg.lt_medio_geral,
  mg.lt_medio_ativos,
  mg.lt_medio_churned,
  mg.churn_rate_periodo,
  COALESCE(cm.churn_rate_mensal, 0) as churn_rate_mensal,
  ac.coortes_dados,
  dl.distribuicao_lt,
  s.curva_sobrevivencia,
  '{}'::jsonb as comparacao_periodo_anterior  -- TODO: implementar comparação
FROM metricas_gerais mg
CROSS JOIN analise_coortes ac
CROSS JOIN distribuicao_lifetime dl
CROSS JOIN sobrevivencia s
CROSS JOIN churn_mensal cm;
$function$;