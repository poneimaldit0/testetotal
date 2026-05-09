-- Fix the relatorio_logins_fornecedor function to properly count access_sistema logs
CREATE OR REPLACE FUNCTION public.relatorio_logins_fornecedor(p_fornecedor_id uuid DEFAULT NULL::uuid, p_data_inicio date DEFAULT NULL::date, p_data_fim date DEFAULT NULL::date)
 RETURNS TABLE(fornecedor_id uuid, nome text, empresa text, email text, data_inicio_contrato timestamp with time zone, data_termino_contrato date, status_contrato text, total_logins_desde_inicio bigint, total_logins_periodo bigint, ultimo_login timestamp with time zone, dias_sem_login integer, media_logins_mes numeric, dias_contrato_total integer, dias_contrato_restantes integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  WITH fornecedores_data AS (
    SELECT 
      p.id,
      p.nome,
      p.empresa,
      p.email,
      p.data_criacao,
      p.data_termino_contrato,
      CASE 
        WHEN p.status = 'ativo' AND (p.data_termino_contrato IS NULL OR p.data_termino_contrato >= CURRENT_DATE) THEN 'ativo'
        WHEN p.data_termino_contrato < CURRENT_DATE THEN 'vencido'
        ELSE p.status
      END as status_contrato,
      CASE 
        WHEN p.data_termino_contrato IS NOT NULL THEN 
          (p.data_termino_contrato - p.data_criacao::date)::integer
        ELSE NULL
      END as dias_contrato_total,
      CASE 
        WHEN p.data_termino_contrato IS NOT NULL THEN 
          GREATEST(0, (p.data_termino_contrato - CURRENT_DATE)::integer)
        ELSE NULL
      END as dias_contrato_restantes
    FROM public.profiles p
    WHERE p.tipo_usuario = 'fornecedor'
      AND (p_fornecedor_id IS NULL OR p.id = p_fornecedor_id)
      AND public.is_admin()
  ),
  login_stats AS (
    SELECT 
      f.id as fornecedor_id,
      -- Total de logins desde o início do contrato (contando apenas acao = 'acesso_sistema')
      COUNT(CASE WHEN l.data_acesso >= f.data_criacao AND l.acao = 'acesso_sistema' THEN 1 END) as total_logins_desde_inicio,
      -- Total de logins no período especificado (contando apenas acao = 'acesso_sistema')
      COUNT(CASE WHEN 
        l.acao = 'acesso_sistema' 
        AND (p_data_inicio IS NULL OR l.data_acesso::date >= p_data_inicio)
        AND (p_data_fim IS NULL OR l.data_acesso::date <= p_data_fim)
        THEN 1 END) as total_logins_periodo,
      -- Último login (apenas acao = 'acesso_sistema')
      MAX(CASE WHEN l.acao = 'acesso_sistema' THEN l.data_acesso END) as ultimo_login
    FROM fornecedores_data f
    LEFT JOIN public.logs_acesso l ON l.user_id = f.id
    GROUP BY f.id
  )
  SELECT 
    f.id::uuid as fornecedor_id,
    f.nome,
    f.empresa,
    f.email,
    f.data_criacao as data_inicio_contrato,
    f.data_termino_contrato,
    f.status_contrato,
    COALESCE(ls.total_logins_desde_inicio, 0) as total_logins_desde_inicio,
    COALESCE(ls.total_logins_periodo, 0) as total_logins_periodo,
    ls.ultimo_login,
    CASE 
      WHEN ls.ultimo_login IS NULL THEN NULL
      ELSE (CURRENT_DATE - ls.ultimo_login::date)::integer
    END as dias_sem_login,
    -- Média de logins por mês desde o início do contrato
    CASE 
      WHEN f.data_criacao IS NOT NULL THEN
        ROUND(
          COALESCE(ls.total_logins_desde_inicio, 0) / 
          GREATEST(1, 
            EXTRACT(EPOCH FROM (COALESCE(f.data_termino_contrato::timestamp, CURRENT_TIMESTAMP) - f.data_criacao)) / (30.44 * 24 * 3600)
          )::numeric, 
          2
        )
      ELSE 0
    END as media_logins_mes,
    f.dias_contrato_total,
    f.dias_contrato_restantes
  FROM fornecedores_data f
  LEFT JOIN login_stats ls ON ls.fornecedor_id = f.id
  ORDER BY f.nome;
$function$