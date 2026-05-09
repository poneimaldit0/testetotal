-- =====================================================
-- Atualização de Acesso aos Relatórios Administrativos
-- Libera acesso para customer_success usando can_manage_suppliers()
-- =====================================================

-- 3. relatorio_fornecedores_ativos_por_data
DROP FUNCTION IF EXISTS public.relatorio_fornecedores_ativos_por_data(date);
CREATE FUNCTION public.relatorio_fornecedores_ativos_por_data(p_data_consulta date)
RETURNS TABLE(
  total_ativos bigint,
  novos_no_mes bigint,
  vencendo_30_dias bigint,
  sem_prazo bigint,
  fornecedores json
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH fornecedores_ativos AS (
  SELECT 
    p.id,
    p.nome,
    p.empresa,
    p.email,
    p.telefone,
    p.created_at as data_cadastro,
    p.data_termino_contrato,
    CASE 
      WHEN p.data_termino_contrato IS NULL THEN 'sem_prazo'
      WHEN p.data_termino_contrato < p_data_consulta THEN 'vencido'
      WHEN p.data_termino_contrato <= p_data_consulta + interval '30 days' THEN 'vencendo'
      ELSE 'ativo'
    END as status_contrato
  FROM public.profiles p
  WHERE p.tipo_usuario = 'fornecedor'
    AND p.status = 'ativo'
    AND (p.data_termino_contrato IS NULL OR p.data_termino_contrato >= p_data_consulta)
    AND p.created_at::date <= p_data_consulta
    AND public.can_manage_suppliers()
)
SELECT 
  COUNT(*) as total_ativos,
  COUNT(CASE WHEN date_trunc('month', data_cadastro) = date_trunc('month', p_data_consulta::timestamp) THEN 1 END) as novos_no_mes,
  COUNT(CASE WHEN status_contrato = 'vencendo' THEN 1 END) as vencendo_30_dias,
  COUNT(CASE WHEN status_contrato = 'sem_prazo' THEN 1 END) as sem_prazo,
  json_agg(json_build_object(
    'id', id,
    'nome', nome,
    'empresa', empresa,
    'email', email,
    'telefone', telefone,
    'data_cadastro', data_cadastro,
    'data_termino_contrato', data_termino_contrato,
    'status_contrato', status_contrato
  ) ORDER BY nome) as fornecedores
FROM fornecedores_ativos;
$$;

-- 4. relatorio_fornecedores_completo
DROP FUNCTION IF EXISTS public.relatorio_fornecedores_completo(text, date, date);
CREATE FUNCTION public.relatorio_fornecedores_completo(
  p_status text DEFAULT NULL,
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  nome text,
  empresa text,
  email text,
  telefone text,
  status text,
  data_cadastro timestamp with time zone,
  ultimo_login timestamp with time zone,
  total_inscricoes bigint,
  propostas_enviadas bigint,
  taxa_conversao numeric,
  data_termino_contrato date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT 
  p.id,
  p.nome,
  p.empresa,
  p.email,
  p.telefone,
  p.status,
  p.created_at as data_cadastro,
  p.ultimo_login,
  COUNT(DISTINCT cf.id) as total_inscricoes,
  COUNT(DISTINCT CASE WHEN cf.proposta_enviada = true THEN cf.id END) as propostas_enviadas,
  CASE 
    WHEN COUNT(DISTINCT cf.id) > 0 
    THEN ROUND((COUNT(DISTINCT CASE WHEN cf.proposta_enviada = true THEN cf.id END)::numeric / COUNT(DISTINCT cf.id)::numeric) * 100, 1)
    ELSE 0
  END as taxa_conversao,
  p.data_termino_contrato
FROM public.profiles p
LEFT JOIN public.candidaturas_fornecedores cf ON p.id = cf.fornecedor_id AND cf.data_desistencia IS NULL
WHERE p.tipo_usuario = 'fornecedor'
  AND (p_status IS NULL OR p.status = p_status)
  AND (p_data_inicio IS NULL OR p.created_at::date >= p_data_inicio)
  AND (p_data_fim IS NULL OR p.created_at::date <= p_data_fim)
  AND public.can_manage_suppliers()
GROUP BY p.id, p.nome, p.empresa, p.email, p.telefone, p.status, p.created_at, p.ultimo_login, p.data_termino_contrato
ORDER BY p.created_at DESC;
$$;

-- 7. relatorio_logins_fornecedor
DROP FUNCTION IF EXISTS public.relatorio_logins_fornecedor(uuid, date, date);
CREATE FUNCTION public.relatorio_logins_fornecedor(
  p_fornecedor_id uuid DEFAULT NULL,
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS TABLE(
  fornecedor_id uuid,
  fornecedor_nome text,
  empresa text,
  data_login timestamp with time zone,
  dias_desde_ultimo_login integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT 
  p.id as fornecedor_id,
  p.nome as fornecedor_nome,
  p.empresa,
  p.ultimo_login as data_login,
  EXTRACT(DAY FROM (now() - p.ultimo_login))::integer as dias_desde_ultimo_login
FROM public.profiles p
WHERE p.tipo_usuario = 'fornecedor'
  AND (p_fornecedor_id IS NULL OR p.id = p_fornecedor_id)
  AND (p_data_inicio IS NULL OR p.ultimo_login::date >= p_data_inicio)
  AND (p_data_fim IS NULL OR p.ultimo_login::date <= p_data_fim)
  AND public.can_manage_suppliers()
ORDER BY p.ultimo_login DESC NULLS LAST;
$$;

-- 10. relatorio_lt_churn - Adicionar customer_success à lista de tipos permitidos
DROP FUNCTION IF EXISTS public.relatorio_lt_churn(date, date, text);
CREATE FUNCTION public.relatorio_lt_churn(
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL,
  p_agrupamento text DEFAULT 'mensal'
)
RETURNS TABLE(
  total_fornecedores bigint,
  fornecedores_ativos bigint,
  fornecedores_churned bigint,
  lt_medio_geral numeric,
  lt_medio_ativos numeric,
  lt_medio_churned numeric,
  churn_rate_periodo numeric,
  churn_rate_mensal numeric,
  coortes_dados json,
  distribuicao_lt json,
  curva_sobrevivencia json,
  comparacao_periodo_anterior json
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo_usuario text;
BEGIN
  -- Verificar permissão do usuário - INCLUINDO customer_success
  SELECT tipo_usuario INTO v_tipo_usuario
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF v_tipo_usuario NOT IN ('master', 'admin', 'customer_success') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  WITH parametros AS (
    SELECT 
      COALESCE(p_data_inicio, (CURRENT_DATE - interval '12 months')::date) as data_inicio,
      COALESCE(p_data_fim, CURRENT_DATE) as data_fim
  ),
  fornecedores_base AS (
    SELECT 
      p.id,
      p.created_at::date as data_cadastro,
      p.status,
      p.data_termino_contrato,
      CASE 
        WHEN p.status != 'ativo' OR (p.data_termino_contrato IS NOT NULL AND p.data_termino_contrato < CURRENT_DATE)
        THEN COALESCE(p.data_termino_contrato, p.updated_at::date)
        ELSE NULL
      END as data_churn,
      CASE 
        WHEN p.status != 'ativo' OR (p.data_termino_contrato IS NOT NULL AND p.data_termino_contrato < CURRENT_DATE)
        THEN 
          CASE 
            WHEN p.data_termino_contrato IS NOT NULL 
            THEN (p.data_termino_contrato - p.created_at::date)
            ELSE (p.updated_at::date - p.created_at::date)
          END
        ELSE (CURRENT_DATE - p.created_at::date)
      END as lifetime_dias,
      CASE 
        WHEN p.status = 'ativo' AND (p.data_termino_contrato IS NULL OR p.data_termino_contrato >= CURRENT_DATE)
        THEN true
        ELSE false
      END as is_ativo
    FROM public.profiles p
    WHERE p.tipo_usuario = 'fornecedor'
  ),
  metricas_gerais AS (
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN is_ativo THEN 1 END) as ativos,
      COUNT(CASE WHEN NOT is_ativo THEN 1 END) as churned,
      ROUND(AVG(lifetime_dias), 1) as lt_medio_geral,
      ROUND(AVG(CASE WHEN is_ativo THEN lifetime_dias END), 1) as lt_medio_ativos,
      ROUND(AVG(CASE WHEN NOT is_ativo THEN lifetime_dias END), 1) as lt_medio_churned
    FROM fornecedores_base
  ),
  churn_periodo AS (
    SELECT 
      COUNT(CASE WHEN NOT is_ativo AND data_churn BETWEEN (SELECT data_inicio FROM parametros) AND (SELECT data_fim FROM parametros) THEN 1 END) as churned_periodo,
      COUNT(CASE WHEN data_cadastro <= (SELECT data_inicio FROM parametros) THEN 1 END) as base_inicio
    FROM fornecedores_base
  ),
  coortes AS (
    SELECT 
      CASE p_agrupamento
        WHEN 'anual' THEN to_char(date_trunc('year', data_cadastro), 'YYYY')
        WHEN 'trimestral' THEN to_char(date_trunc('quarter', data_cadastro), 'YYYY-"Q"Q')
        ELSE to_char(date_trunc('month', data_cadastro), 'YYYY-MM')
      END as coorte,
      COUNT(*) as total_cadastrados,
      COUNT(CASE WHEN is_ativo THEN 1 END) as ainda_ativos,
      COUNT(CASE WHEN NOT is_ativo THEN 1 END) as churned,
      ROUND((COUNT(CASE WHEN NOT is_ativo THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 1) as churn_rate,
      ROUND(AVG(lifetime_dias), 1) as lt_medio
    FROM fornecedores_base
    WHERE data_cadastro BETWEEN (SELECT data_inicio FROM parametros) AND (SELECT data_fim FROM parametros)
    GROUP BY 1
    ORDER BY 1
  ),
  distribuicao AS (
    SELECT 
      percentile_cont(0.25) WITHIN GROUP (ORDER BY lifetime_dias) as p25,
      percentile_cont(0.50) WITHIN GROUP (ORDER BY lifetime_dias) as p50,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY lifetime_dias) as p75,
      percentile_cont(0.90) WITHIN GROUP (ORDER BY lifetime_dias) as p90,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY lifetime_dias) as p95
    FROM fornecedores_base
  ),
  faixas_lt AS (
    SELECT 
      CASE 
        WHEN lifetime_dias <= 30 THEN '0-30 dias'
        WHEN lifetime_dias <= 90 THEN '31-90 dias'
        WHEN lifetime_dias <= 180 THEN '91-180 dias'
        WHEN lifetime_dias <= 365 THEN '181-365 dias'
        ELSE '365+ dias'
      END as faixa,
      COUNT(*) as quantidade
    FROM fornecedores_base
    GROUP BY 1
  ),
  sobrevivencia AS (
    SELECT 
      dias,
      COUNT(CASE WHEN lifetime_dias >= dias THEN 1 END) as sobreviventes,
      ROUND((COUNT(CASE WHEN lifetime_dias >= dias THEN 1 END)::numeric / NULLIF((SELECT COUNT(*) FROM fornecedores_base), 0)) * 100, 1) as taxa
    FROM generate_series(0, 365, 30) as dias
    CROSS JOIN fornecedores_base
    GROUP BY dias
    ORDER BY dias
  )
  SELECT 
    mg.total,
    mg.ativos,
    mg.churned,
    mg.lt_medio_geral,
    mg.lt_medio_ativos,
    mg.lt_medio_churned,
    ROUND((cp.churned_periodo::numeric / NULLIF(cp.base_inicio, 0)) * 100, 1) as churn_rate_periodo,
    ROUND((cp.churned_periodo::numeric / NULLIF(cp.base_inicio, 0)) * 100 / 
          NULLIF(EXTRACT(MONTH FROM AGE((SELECT data_fim FROM parametros), (SELECT data_inicio FROM parametros))), 0), 1) as churn_rate_mensal,
    (SELECT json_agg(json_build_object(
      'coorte', coorte,
      'total_cadastrados', total_cadastrados,
      'ainda_ativos', ainda_ativos,
      'churned', churned,
      'churn_rate', churn_rate,
      'lt_medio', lt_medio
    ) ORDER BY coorte) FROM coortes),
    json_build_object(
      'percentis', json_build_object(
        'p25', d.p25,
        'p50', d.p50,
        'p75', d.p75,
        'p90', d.p90,
        'p95', d.p95
      ),
      'faixas', (SELECT json_agg(json_build_object(
        'faixa', faixa,
        'quantidade', quantidade,
        'percentual', ROUND((quantidade::numeric / NULLIF(mg.total, 0)) * 100, 1)
      )) FROM faixas_lt)
    ),
    (SELECT json_agg(json_build_object(
      'dias', dias,
      'sobreviventes', sobreviventes,
      'taxa_sobrevivencia', taxa
    ) ORDER BY dias) FROM sobrevivencia),
    json_build_object('nota', 'Comparação com período anterior não implementada')
  FROM metricas_gerais mg
  CROSS JOIN churn_periodo cp
  CROSS JOIN distribuicao d;
END;
$$;