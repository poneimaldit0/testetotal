
-- Função para obter total de orçamentos criados no mês atual
CREATE OR REPLACE FUNCTION public.obter_orcamentos_mes_atual()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT COUNT(*)::integer
  FROM public.orcamentos
  WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);
$function$;

-- Função para obter inscrições do usuário no mês atual
CREATE OR REPLACE FUNCTION public.obter_inscricoes_usuario_mes(user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT COUNT(*)::integer
  FROM public.inscricoes_fornecedores
  WHERE fornecedor_id = user_id
    AND DATE_TRUNC('month', data_inscricao) = DATE_TRUNC('month', CURRENT_DATE);
$function$;

-- Função para obter total de inscrições do usuário desde o cadastro
CREATE OR REPLACE FUNCTION public.obter_inscricoes_usuario_total(user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT COUNT(*)::integer
  FROM public.inscricoes_fornecedores
  WHERE fornecedor_id = user_id;
$function$;
