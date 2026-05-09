-- Criar função para relatório completo de fornecedores
CREATE OR REPLACE FUNCTION public.relatorio_fornecedores_completo(
  p_status_filtro text[] DEFAULT NULL,
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL,
  p_vencimento_proximo_dias integer DEFAULT NULL,
  p_busca_texto text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  nome text,
  email text,
  empresa text,
  telefone text,
  whatsapp text,
  endereco text,
  site_url text,
  status text,
  status_contrato text,
  data_criacao timestamp with time zone,
  data_termino_contrato date,
  dias_restantes_contrato integer,
  limite_acessos_diarios integer,
  limite_acessos_mensais integer,
  limite_propostas_abertas integer,
  acessos_diarios integer,
  acessos_mensais integer,
  ultimo_login timestamp with time zone,
  dias_sem_login integer,
  penalidades_ativas integer,
  bloqueado_ate timestamp with time zone,
  total_candidaturas bigint,
  candidaturas_ativas bigint,
  media_logins_mes numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  WITH fornecedores_base AS (
    SELECT 
      p.id,
      p.nome,
      p.email,
      p.empresa,
      p.telefone,
      p.whatsapp,
      p.endereco,
      p.site_url,
      p.status,
      -- Determinar status real do contrato
      CASE 
        WHEN p.status = 'ativo' AND (p.data_termino_contrato IS NULL OR p.data_termino_contrato >= CURRENT_DATE) THEN 'ativo'
        WHEN p.data_termino_contrato IS NOT NULL AND p.data_termino_contrato < CURRENT_DATE THEN 'vencido'
        WHEN p.status = 'pendente_aprovacao' THEN 'pendente'
        WHEN p.status = 'suspenso' THEN 'suspenso'
        ELSE 'inativo'
      END as status_contrato,
      p.data_criacao,
      p.data_termino_contrato,
      -- Calcular dias restantes do contrato
      CASE 
        WHEN p.data_termino_contrato IS NOT NULL THEN 
          GREATEST(0, (p.data_termino_contrato - CURRENT_DATE)::integer)
        ELSE NULL
      END as dias_restantes_contrato,
      p.limite_acessos_diarios,
      p.limite_acessos_mensais,
      p.limite_propostas_abertas,
      p.acessos_diarios,
      p.acessos_mensais,
      p.ultimo_login,
      -- Calcular dias sem login
      CASE 
        WHEN p.ultimo_login IS NULL THEN NULL
        ELSE (CURRENT_DATE - p.ultimo_login::date)::integer
      END as dias_sem_login,
      p.penalidades_ativas,
      p.bloqueado_ate
    FROM public.profiles p
    WHERE p.tipo_usuario = 'fornecedor'
      AND public.is_admin()
  ),
  estatisticas_candidaturas AS (
    SELECT 
      cf.fornecedor_id,
      COUNT(*) as total_candidaturas,
      COUNT(*) FILTER (WHERE cf.data_desistencia IS NULL AND cf.proposta_enviada = false) as candidaturas_ativas
    FROM public.candidaturas_fornecedores cf
    GROUP BY cf.fornecedor_id
  ),
  estatisticas_login AS (
    SELECT 
      la.user_id,
      COUNT(*) FILTER (WHERE la.acao = 'acesso_sistema' AND la.data_acesso >= CURRENT_DATE - INTERVAL '30 days') as logins_mes
    FROM public.logs_acesso la
    WHERE la.data_acesso >= CURRENT_DATE - INTERVAL '365 days'
    GROUP BY la.user_id
  )
  SELECT 
    fb.id,
    fb.nome,
    fb.email,
    fb.empresa,
    fb.telefone,
    fb.whatsapp,
    fb.endereco,
    fb.site_url,
    fb.status,
    fb.status_contrato,
    fb.data_criacao,
    fb.data_termino_contrato,
    fb.dias_restantes_contrato,
    fb.limite_acessos_diarios,
    fb.limite_acessos_mensais,
    fb.limite_propostas_abertas,
    fb.acessos_diarios,
    fb.acessos_mensais,
    fb.ultimo_login,
    fb.dias_sem_login,
    fb.penalidades_ativas,
    fb.bloqueado_ate,
    COALESCE(ec.total_candidaturas, 0) as total_candidaturas,
    COALESCE(ec.candidaturas_ativas, 0) as candidaturas_ativas,
    -- Média de logins por mês
    CASE 
      WHEN fb.data_criacao IS NOT NULL THEN
        ROUND(
          COALESCE(el.logins_mes, 0)::numeric, 2
        )
      ELSE 0
    END as media_logins_mes
  FROM fornecedores_base fb
  LEFT JOIN estatisticas_candidaturas ec ON ec.fornecedor_id = fb.id
  LEFT JOIN estatisticas_login el ON el.user_id = fb.id
  WHERE 
    -- Filtro por status
    (p_status_filtro IS NULL OR fb.status_contrato = ANY(p_status_filtro))
    -- Filtro por período de cadastro
    AND (p_data_inicio IS NULL OR fb.data_criacao::date >= p_data_inicio)
    AND (p_data_fim IS NULL OR fb.data_criacao::date <= p_data_fim)
    -- Filtro por vencimento próximo
    AND (
      p_vencimento_proximo_dias IS NULL OR 
      (fb.dias_restantes_contrato IS NOT NULL AND fb.dias_restantes_contrato <= p_vencimento_proximo_dias)
    )
    -- Filtro por busca de texto
    AND (
      p_busca_texto IS NULL OR 
      fb.nome ILIKE '%' || p_busca_texto || '%' OR
      fb.email ILIKE '%' || p_busca_texto || '%' OR
      fb.empresa ILIKE '%' || p_busca_texto || '%'
    )
  ORDER BY 
    CASE fb.status_contrato
      WHEN 'vencido' THEN 1
      WHEN 'ativo' THEN 2
      WHEN 'suspenso' THEN 3
      WHEN 'inativo' THEN 4
      WHEN 'pendente' THEN 5
      ELSE 6
    END,
    fb.nome;
$function$;