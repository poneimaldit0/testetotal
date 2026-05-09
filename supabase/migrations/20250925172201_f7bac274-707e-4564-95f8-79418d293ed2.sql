-- Função para gerar relatório de fornecedores ativos por data
CREATE OR REPLACE FUNCTION public.relatorio_fornecedores_ativos_por_data(p_data_consulta DATE)
RETURNS TABLE(
  total_ativos BIGINT,
  novos_mes_atual BIGINT,
  contratos_vencendo_30_dias BIGINT,
  sem_data_termino BIGINT,
  fornecedores JSONB
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  WITH fornecedores_ativos AS (
    SELECT 
      p.id,
      p.nome,
      p.email,
      p.empresa,
      p.telefone,
      p.data_criacao,
      p.data_termino_contrato,
      p.status,
      -- Calcular dias restantes do contrato
      CASE 
        WHEN p.data_termino_contrato IS NOT NULL THEN 
          (p.data_termino_contrato - p_data_consulta)::integer
        ELSE NULL
      END as dias_restantes_contrato
    FROM public.profiles p
    WHERE p.tipo_usuario = 'fornecedor'
      AND p.data_criacao::date <= p_data_consulta
      AND (
        p.data_termino_contrato IS NULL OR 
        p.data_termino_contrato >= p_data_consulta
      )
      AND p.status = 'ativo'
      AND public.is_admin()
  ),
  metricas AS (
    SELECT 
      COUNT(*) as total_ativos,
      COUNT(*) FILTER (
        WHERE DATE_TRUNC('month', data_criacao::date) = DATE_TRUNC('month', p_data_consulta)
      ) as novos_mes_atual,
      COUNT(*) FILTER (
        WHERE dias_restantes_contrato IS NOT NULL 
        AND dias_restantes_contrato <= 30 
        AND dias_restantes_contrato >= 0
      ) as contratos_vencendo_30_dias,
      COUNT(*) FILTER (WHERE data_termino_contrato IS NULL) as sem_data_termino
    FROM fornecedores_ativos
  ),
  fornecedores_json AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', fa.id,
        'nome', fa.nome,
        'email', fa.email,
        'empresa', fa.empresa,
        'telefone', fa.telefone,
        'data_criacao', fa.data_criacao,
        'data_termino_contrato', fa.data_termino_contrato,
        'dias_restantes_contrato', fa.dias_restantes_contrato,
        'status_contrato', CASE 
          WHEN fa.data_termino_contrato IS NULL THEN 'sem_prazo'
          WHEN fa.dias_restantes_contrato <= 30 AND fa.dias_restantes_contrato >= 0 THEN 'vencendo'
          WHEN fa.dias_restantes_contrato > 30 THEN 'ativo'
          ELSE 'indefinido'
        END
      ) ORDER BY fa.nome
    ) as fornecedores_array
    FROM fornecedores_ativos fa
  )
  SELECT 
    m.total_ativos,
    m.novos_mes_atual,
    m.contratos_vencendo_30_dias,
    m.sem_data_termino,
    COALESCE(fj.fornecedores_array, '[]'::jsonb) as fornecedores
  FROM metricas m
  CROSS JOIN fornecedores_json fj;
$function$