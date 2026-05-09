-- Drop da função existente e recriação com novo formato
DROP FUNCTION IF EXISTS public.listar_fornecedores_para_relatorio();

-- Criar função atualizada para incluir todos os fornecedores (ativos e inativos)
CREATE OR REPLACE FUNCTION public.listar_fornecedores_para_relatorio()
 RETURNS TABLE(id uuid, nome text, email text, empresa text, status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT 
    p.id,
    p.nome,
    p.email,
    p.empresa,
    p.status
  FROM public.profiles p
  WHERE p.tipo_usuario = 'fornecedor'
    AND public.is_admin()
  ORDER BY p.nome;
$function$