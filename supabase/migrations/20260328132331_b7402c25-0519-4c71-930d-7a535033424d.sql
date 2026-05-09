
-- Allow pre_vendas to delete their own reunioes
CREATE POLICY "pre_vendas_delete_funil_reunioes"
ON public.funil_reunioes
FOR DELETE
TO authenticated
USING (
  public.get_user_tipo(auth.uid()) = 'pre_vendas'
  AND pre_vendas_id = auth.uid()
);

-- Allow admin to delete reunioes (already covered by FOR ALL policy)

-- Allow closer to delete their own daily records
CREATE POLICY "closer_delete_funil_vendas_registros"
ON public.funil_vendas_registros
FOR DELETE
TO authenticated
USING (closer_id = auth.uid());

-- Allow admin to delete daily records
CREATE POLICY "admin_delete_funil_vendas_registros"
ON public.funil_vendas_registros
FOR DELETE
TO authenticated
USING (public.get_user_tipo(auth.uid()) = 'admin');
