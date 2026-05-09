-- Atualizar can_manage_orcamentos para incluir customer_success
CREATE OR REPLACE FUNCTION public.can_manage_orcamentos()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND tipo_usuario IN ('admin', 'master', 'gestor_conta', 'sdr', 'customer_success')
  );
$$;