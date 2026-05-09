-- Atualizar função can_manage_orcamentos para incluir SDR
-- O campo tipo_usuario é TEXT, não enum, então apenas atualizamos a função

CREATE OR REPLACE FUNCTION can_manage_orcamentos()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND tipo_usuario IN ('admin', 'master', 'gestor_conta', 'sdr')
  );
$function$;

COMMENT ON FUNCTION can_manage_orcamentos() IS 
'Verifica se o usuário atual tem permissão para gerenciar orçamentos (admin, master, gestor_conta ou sdr)';
