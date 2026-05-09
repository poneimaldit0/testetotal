-- Permitir que usuários admin e master visualizem todas as reuniões do funil
CREATE POLICY "admin_master_select_funil_reunioes"
ON public.funil_reunioes
FOR SELECT
TO authenticated
USING (is_admin_or_master(auth.uid()));