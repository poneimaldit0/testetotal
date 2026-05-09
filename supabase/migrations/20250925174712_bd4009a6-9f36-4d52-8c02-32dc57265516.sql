-- Corrigir verificação de permissões na função relatorio_lt_churn
CREATE OR REPLACE FUNCTION public.relatorio_lt_churn(
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_agrupamento TEXT DEFAULT 'mensal'
)
RETURNS TABLE (
  total_fornecedores BIGINT,
  fornecedores_ativos BIGINT,
  fornecedores_churned BIGINT,
  lt_medio_geral NUMERIC,
  lt_medio_ativos NUMERIC,
  lt_medio_churned NUMERIC,
  churn_rate_periodo NUMERIC,
  churn_rate_mensal NUMERIC,
  coortes_dados JSONB,
  distribuicao_lt JSONB,
  curva_sobrevivencia JSONB,
  comparacao_periodo_anterior JSONB
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  data_inicio_efetiva DATE;
  data_fim_efetiva DATE;
  periodo_anterior_inicio DATE;
  periodo_anterior_fim DATE;
  total_dias INTEGER;
  user_tipo TEXT;
BEGIN
  -- Verificar tipo de usuário do usuário atual
  SELECT p.tipo_usuario INTO user_tipo
  FROM public.profiles p
  WHERE p.id = auth.uid();
  
  -- Verificar se o usuário tem permissão (admin, master ou gestor_conta)
  IF user_tipo IS NULL OR user_tipo NOT IN ('admin', 'master', 'gestor_conta') THEN
    RAISE EXCEPTION 'Acesso negado. Usuário sem permissão para acessar relatórios. Tipo: %', COALESCE(user_tipo, 'NULL');
  END IF;

  -- Definir período padrão se não especificado (últimos 12 meses)
  data_inicio_efetiva := COALESCE(p_data_inicio, CURRENT_DATE - INTERVAL '12 months');
  data_fim_efetiva := COALESCE(p_data_fim, CURRENT_DATE);
  
  -- Calcular período anterior para comparação
  total_dias := data_fim_efetiva - data_inicio_efetiva;
  periodo_anterior_fim := data_inicio_efetiva - INTERVAL '1 day';
  periodo_anterior_inicio := periodo_anterior_fim - (total_dias || ' days')::INTERVAL;

  RETURN QUERY
  WITH fornecedores_base AS (
    SELECT 
      p.id,
      p.data_criacao,
      p.status,
      p.ultimo_login,
      -- Calcular lifetime em dias (até agora ou até se tornar inativo)
      CASE 
        WHEN p.status = 'ativo' THEN 
          EXTRACT(DAY FROM (CURRENT_TIMESTAMP - p.data_criacao))::INTEGER
        ELSE 
          EXTRACT(DAY FROM (COALESCE(p.ultimo_login, p.data_criacao) - p.data_criacao))::INTEGER
      END as lifetime_dias,
      -- Determinar se é churned (inativo há mais de 30 dias)
      CASE 
        WHEN p.status != 'ativo' OR 
             (p.ultimo_login IS NOT NULL AND p.ultimo_login < CURRENT_TIMESTAMP - INTERVAL '30 days') 
        THEN true 
        ELSE false 
      END as is_churned,
      -- Coorte baseada no mês/trimestre/ano de cadastro
      CASE 
        WHEN p_agrupamento = 'mensal' THEN 
          TO_CHAR(p.data_criacao, 'YYYY-MM')
        WHEN p_agrupamento = 'trimestral' THEN 
          TO_CHAR(p.data_criacao, 'YYYY') || '-Q' || 
          EXTRACT(QUARTER FROM p.data_criacao)::TEXT
        WHEN p_agrupamento = 'anual' THEN 
          TO_CHAR(p.data_criacao, 'YYYY')
        ELSE TO_CHAR(p.data_criacao, 'YYYY-MM')
      END as coorte
    FROM public.profiles p
    WHERE p.tipo_usuario = 'fornecedor'
      AND p.data_criacao >= data_inicio_efetiva
      AND p.data_criacao <= data_fim_efetiva
  ),
  metricas_gerais AS (
    SELECT 
      COUNT(*) as total_fornecedores,
      COUNT(*) FILTER (WHERE NOT is_churned) as fornecedores_ativos,
      COUNT(*) FILTER (WHERE is_churned) as fornecedores_churned,
      ROUND(AVG(lifetime_dias)::NUMERIC, 2) as lt_medio_geral,
      ROUND(AVG(lifetime_dias) FILTER (WHERE NOT is_churned)::NUMERIC, 2) as lt_medio_ativos,
      ROUND(AVG(lifetime_dias) FILTER (WHERE is_churned)::NUMERIC, 2) as lt_medio_churned,
      ROUND(
        (COUNT(*) FILTER (WHERE is_churned) * 100.0 / NULLIF(COUNT(*), 0))::NUMERIC, 2
      ) as churn_rate_periodo
    FROM fornecedores_base
  ),
  coortes_analise AS (
    SELECT 
      coorte,
      COUNT(*) as total_cadastrados,
      COUNT(*) FILTER (WHERE NOT is_churned) as ainda_ativos,
      COUNT(*) FILTER (WHERE is_churned) as churned,
      ROUND(
        (COUNT(*) FILTER (WHERE is_churned) * 100.0 / NULLIF(COUNT(*), 0))::NUMERIC, 2
      ) as churn_rate,
      ROUND(AVG(lifetime_dias)::NUMERIC, 2) as lt_medio
    FROM fornecedores_base
    GROUP BY coorte
    ORDER BY coorte
  ),
  distribuicao_analise AS (
    SELECT 
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY lifetime_dias) as p25,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY lifetime_dias) as p50,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY lifetime_dias) as p75,
      PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY lifetime_dias) as p90,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY lifetime_dias) as p95
    FROM fornecedores_base
  ),
  faixas_distribuicao AS (
    SELECT 
      CASE 
        WHEN lifetime_dias <= 30 THEN '0-30 dias'
        WHEN lifetime_dias <= 90 THEN '31-90 dias'
        WHEN lifetime_dias <= 180 THEN '91-180 dias'
        WHEN lifetime_dias <= 365 THEN '181-365 dias'
        ELSE 'Mais de 1 ano'
      END as faixa,
      COUNT(*) as quantidade
    FROM fornecedores_base
    GROUP BY 
      CASE 
        WHEN lifetime_dias <= 30 THEN '0-30 dias'
        WHEN lifetime_dias <= 90 THEN '31-90 dias'
        WHEN lifetime_dias <= 180 THEN '91-180 dias'
        WHEN lifetime_dias <= 365 THEN '181-365 dias'
        ELSE 'Mais de 1 ano'
      END
  ),
  curva_sobrevivencia_dados AS (
    SELECT 
      dias,
      COUNT(*) as sobreviventes,
      ROUND(
        (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM fornecedores_base))::NUMERIC, 2
      ) as taxa_sobrevivencia
    FROM (
      SELECT DISTINCT lifetime_dias as dias
      FROM fornecedores_base
      ORDER BY lifetime_dias
    ) dias_unicos
    JOIN fornecedores_base ON fornecedores_base.lifetime_dias >= dias_unicos.dias
    GROUP BY dias
    ORDER BY dias
  )
  SELECT 
    mg.total_fornecedores::BIGINT,
    mg.fornecedores_ativos::BIGINT,  
    mg.fornecedores_churned::BIGINT,
    mg.lt_medio_geral,
    mg.lt_medio_ativos,
    mg.lt_medio_churned,
    mg.churn_rate_periodo,
    ROUND((mg.churn_rate_periodo / 12.0)::NUMERIC, 2) as churn_rate_mensal, -- Estimativa mensal
    -- Dados das coortes
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'coorte', ca.coorte,
          'total_cadastrados', ca.total_cadastrados,
          'ainda_ativos', ca.ainda_ativos,
          'churned', ca.churned,
          'churn_rate', ca.churn_rate,
          'lt_medio', ca.lt_medio
        ) ORDER BY ca.coorte
      )
      FROM coortes_analise ca
    ) as coortes_dados,
    -- Distribuição de lifetime
    jsonb_build_object(
      'percentis', jsonb_build_object(
        'p25', da.p25,
        'p50', da.p50, 
        'p75', da.p75,
        'p90', da.p90,
        'p95', da.p95
      ),
      'faixas', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'faixa', fd.faixa,
            'quantidade', fd.quantidade,
            'percentual', ROUND(
              (fd.quantidade * 100.0 / NULLIF(mg.total_fornecedores, 0))::NUMERIC, 2
            )
          )
        )
        FROM faixas_distribuicao fd
      )
    ) as distribuicao_lt,
    -- Curva de sobrevivência (sample dos dados)
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'dias', cs.dias,
          'sobreviventes', cs.sobreviventes,
          'taxa_sobrevivencia', cs.taxa_sobrevivencia
        ) ORDER BY cs.dias
      )
      FROM (
        SELECT * FROM curva_sobrevivencia_dados 
        WHERE dias % 30 = 0 OR dias <= 90 -- Sample: a cada 30 dias ou primeiros 90 dias
        LIMIT 50
      ) cs
    ) as curva_sobrevivencia,
    -- Comparação com período anterior (placeholder por enquanto)
    '{}'::JSONB as comparacao_periodo_anterior
  FROM metricas_gerais mg
  CROSS JOIN distribuicao_analise da;
END;
$$;