-- Criar função RPC para relatório de orçamentos apropriados por concierge
CREATE OR REPLACE FUNCTION public.relatorio_orcamentos_por_concierge(
  p_data_inicio date,
  p_data_fim date
)
RETURNS TABLE (
  mes date,
  gestor_conta_id uuid,
  gestor_nome text,
  total_orcamentos bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    DATE_TRUNC('month', o.created_at)::date as mes,
    o.gestor_conta_id,
    p.nome as gestor_nome,
    COUNT(*) as total_orcamentos
  FROM orcamentos o
  INNER JOIN profiles p ON o.gestor_conta_id = p.id
  WHERE o.gestor_conta_id IS NOT NULL
    AND o.created_at >= p_data_inicio
    AND o.created_at < (p_data_fim + interval '1 day')
  GROUP BY DATE_TRUNC('month', o.created_at), o.gestor_conta_id, p.nome
  ORDER BY mes DESC, total_orcamentos DESC;
$$;