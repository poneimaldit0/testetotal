
-- Allow pre_vendas users to see closer profiles (for reunion scheduling)
CREATE POLICY "pre_vendas_can_view_closers"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.get_user_tipo(auth.uid()) = 'pre_vendas'
  AND tipo_usuario = 'closer'
  AND status = 'ativo'
);

-- Allow closer users to see pre_vendas profiles
CREATE POLICY "closer_can_view_pre_vendas"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.get_user_tipo(auth.uid()) = 'closer'
  AND tipo_usuario = 'pre_vendas'
  AND status = 'ativo'
);
