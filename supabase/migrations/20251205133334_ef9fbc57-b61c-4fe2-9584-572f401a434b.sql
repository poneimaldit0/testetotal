-- Recriar relatorio_fornecedores_completo com todos os 5 parâmetros corretos
DROP FUNCTION IF EXISTS public.relatorio_fornecedores_completo(text, date, date);
DROP FUNCTION IF EXISTS public.relatorio_fornecedores_completo(text[], date, date, integer, text);

CREATE FUNCTION public.relatorio_fornecedores_completo(
  p_status_filtro text[] DEFAULT NULL,
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL,
  p_vencimento_proximo_dias integer DEFAULT NULL,
  p_busca_texto text DEFAULT NULL
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
  data_termino_contrato date,
  dias_para_vencimento integer
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
  p.data_termino_contrato,
  CASE 
    WHEN p.data_termino_contrato IS NOT NULL 
    THEN (p.data_termino_contrato - CURRENT_DATE)
    ELSE NULL 
  END as dias_para_vencimento
FROM public.profiles p
LEFT JOIN public.candidaturas_fornecedores cf ON p.id = cf.fornecedor_id AND cf.data_desistencia IS NULL
WHERE p.tipo_usuario = 'fornecedor'
  AND public.can_manage_suppliers()
  AND (p_status_filtro IS NULL OR p.status = ANY(p_status_filtro))
  AND (p_data_inicio IS NULL OR p.created_at::date >= p_data_inicio)
  AND (p_data_fim IS NULL OR p.created_at::date <= p_data_fim)
  AND (p_vencimento_proximo_dias IS NULL OR (p.data_termino_contrato IS NOT NULL AND (p.data_termino_contrato - CURRENT_DATE) <= p_vencimento_proximo_dias))
  AND (p_busca_texto IS NULL OR p.nome ILIKE '%' || p_busca_texto || '%' OR p.empresa ILIKE '%' || p_busca_texto || '%' OR p.email ILIKE '%' || p_busca_texto || '%')
GROUP BY p.id, p.nome, p.empresa, p.email, p.telefone, p.status, p.created_at, p.ultimo_login, p.data_termino_contrato
ORDER BY p.created_at DESC;
$$;