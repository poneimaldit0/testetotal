-- Atualizar função is_admin() para incluir customer_success
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND tipo_usuario IN ('admin', 'master', 'customer_success')
  );
$$;