-- Corrigir função listar_fornecedores_para_relatorio para incluir gestor_conta
-- Substituir is_admin() por can_manage_orcamentos()

CREATE OR REPLACE FUNCTION public.listar_fornecedores_para_relatorio()
RETURNS TABLE(id uuid, nome text, email text, empresa text, status text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT 
    p.id,
    p.nome,
    p.email,
    p.empresa,
    p.status
  FROM public.profiles p
  WHERE p.tipo_usuario = 'fornecedor'
    AND public.can_manage_orcamentos()
  ORDER BY p.nome;
$function$;

-- Adicionar comentário para documentação
COMMENT ON FUNCTION public.listar_fornecedores_para_relatorio() IS 
'Lista todos os fornecedores para uso em relatórios. Acessível por admin, master e gestor_conta.';