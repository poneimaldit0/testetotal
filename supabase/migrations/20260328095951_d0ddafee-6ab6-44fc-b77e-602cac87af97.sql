
-- Update RLS functions to include pre_vendas
CREATE OR REPLACE FUNCTION public.is_closer_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
    AND tipo_usuario IN ('closer', 'admin', 'master', 'pre_vendas')
  )
$$;

-- Drop and recreate policies for funil_vendas_registros to include pre_vendas
DROP POLICY IF EXISTS "Closers podem ver seus registros" ON public.funil_vendas_registros;
DROP POLICY IF EXISTS "Closers podem inserir seus registros" ON public.funil_vendas_registros;
DROP POLICY IF EXISTS "Closers podem atualizar seus registros" ON public.funil_vendas_registros;

CREATE POLICY "Closers e pre_vendas podem ver seus registros"
ON public.funil_vendas_registros FOR SELECT TO authenticated
USING (
  closer_id = auth.uid()
  OR public.is_admin_or_master(auth.uid())
);

CREATE POLICY "Closers e pre_vendas podem inserir seus registros"
ON public.funil_vendas_registros FOR INSERT TO authenticated
WITH CHECK (
  closer_id = auth.uid()
  AND public.is_closer_or_admin(auth.uid())
);

CREATE POLICY "Closers e pre_vendas podem atualizar seus registros"
ON public.funil_vendas_registros FOR UPDATE TO authenticated
USING (
  closer_id = auth.uid()
  OR public.is_admin_or_master(auth.uid())
);
