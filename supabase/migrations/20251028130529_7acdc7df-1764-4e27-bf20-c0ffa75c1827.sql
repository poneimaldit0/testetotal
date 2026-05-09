-- Corrigir função relatorio_experiencia_fornecedor para usar candidaturas_fornecedores
DROP FUNCTION IF EXISTS public.relatorio_experiencia_fornecedor();

CREATE OR REPLACE FUNCTION public.relatorio_experiencia_fornecedor()
RETURNS TABLE (
  id uuid,
  nome text,
  empresa text,
  email text,
  telefone text,
  data_cadastro timestamptz,
  dias_plataforma integer,
  ultimo_acesso timestamptz,
  dias_inativo integer,
  total_inscricoes bigint,
  orcamentos_abertos bigint,
  propostas_enviadas bigint,
  taxa_conversao numeric,
  data_termino_contrato date,
  dias_restantes_contrato integer,
  status_contrato text,
  nivel_alerta text,
  gatilhos_ativos jsonb,
  acao_sugerida jsonb,
  prioridade integer
) 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path TO ''
AS $$
WITH dados_fornecedor AS (
  SELECT 
    p.id,
    p.nome,
    p.empresa,
    p.email,
    p.telefone,
    p.created_at as data_cadastro,
    p.status as status_perfil,
    EXTRACT(DAY FROM (now() - p.created_at))::integer as dias_plataforma,
    p.ultimo_login as ultimo_acesso,
    COALESCE(EXTRACT(DAY FROM (now() - p.ultimo_login))::integer, 999) as dias_inativo,
    -- CORREÇÃO: Usar candidaturas_fornecedores em vez de inscricoes_fornecedores
    COUNT(DISTINCT cf.id) as total_inscricoes,
    COUNT(DISTINCT CASE WHEN o.status = 'aberto' THEN cf.orcamento_id END) as orcamentos_abertos,
    COUNT(DISTINCT CASE WHEN cf.proposta_enviada = true THEN cf.id END) as propostas_enviadas,
    p.data_termino_contrato,
    CASE 
      WHEN p.data_termino_contrato IS NOT NULL 
      THEN (p.data_termino_contrato - CURRENT_DATE)::integer
      ELSE NULL 
    END as dias_restantes_contrato
  FROM public.profiles p
  -- CORREÇÃO: Usar candidaturas_fornecedores
  LEFT JOIN public.candidaturas_fornecedores cf ON p.id = cf.fornecedor_id AND cf.data_desistencia IS NULL
  LEFT JOIN public.orcamentos o ON cf.orcamento_id = o.id
  WHERE p.tipo_usuario = 'fornecedor'
    AND public.is_admin()
  GROUP BY p.id, p.nome, p.empresa, p.email, p.telefone, p.created_at, p.status, p.ultimo_login, p.data_termino_contrato
),
fornecedor_com_metricas AS (
  SELECT 
    df.id,
    df.nome,
    df.empresa,
    df.email,
    df.telefone,
    df.data_cadastro,
    df.dias_plataforma,
    df.ultimo_acesso,
    df.dias_inativo,
    df.total_inscricoes,
    df.orcamentos_abertos,
    df.propostas_enviadas,
    df.data_termino_contrato,
    df.dias_restantes_contrato,
    CASE 
      WHEN df.total_inscricoes > 0 
      THEN ROUND((df.propostas_enviadas::numeric / df.total_inscricoes::numeric) * 100, 1)
      ELSE 0
    END as taxa_conversao,
    CASE
      WHEN df.status_perfil != 'ativo' THEN 
        CASE 
          WHEN df.data_termino_contrato IS NULL THEN 'sem_prazo_inativo'
          WHEN df.dias_restantes_contrato < 0 THEN 'vencido'
          ELSE 'inativo'
        END
      WHEN df.dias_restantes_contrato IS NULL THEN 'sem_prazo'
      WHEN df.dias_restantes_contrato < 0 THEN 'vencido'
      WHEN df.dias_restantes_contrato <= 30 THEN 'vencendo'
      ELSE 'ativo'
    END as status_contrato
  FROM dados_fornecedor df
)
SELECT 
  fm.id,
  fm.nome,
  fm.empresa,
  fm.email,
  fm.telefone,
  fm.data_cadastro,
  fm.dias_plataforma,
  fm.ultimo_acesso,
  fm.dias_inativo,
  fm.total_inscricoes,
  fm.orcamentos_abertos,
  fm.propostas_enviadas,
  fm.taxa_conversao,
  fm.data_termino_contrato,
  fm.dias_restantes_contrato,
  fm.status_contrato,
  CASE
    WHEN (fm.dias_inativo >= 30 AND fm.orcamentos_abertos >= 30) OR fm.orcamentos_abertos >= 50 THEN 'critico'
    WHEN fm.dias_inativo >= 20 OR fm.orcamentos_abertos >= 15 OR fm.dias_plataforma IN (30, 75) THEN 'atencao'
    WHEN fm.dias_inativo >= 5 OR fm.orcamentos_abertos >= 5 OR fm.dias_plataforma IN (1,2,3,4,5,10,20,45,60,90) THEN 'marco'
    ELSE 'ok'
  END as nivel_alerta,
  public.calcular_gatilhos_ativos(fm.dias_inativo, fm.orcamentos_abertos, fm.dias_plataforma) as gatilhos_ativos,
  public.definir_acao_sugerida(fm.dias_inativo, fm.orcamentos_abertos, fm.dias_plataforma, fm.nome) as acao_sugerida,
  public.calcular_prioridade(fm.dias_inativo, fm.orcamentos_abertos, fm.dias_plataforma, fm.status_contrato) as prioridade
FROM fornecedor_com_metricas fm
ORDER BY prioridade DESC, fm.dias_inativo DESC;
$$;