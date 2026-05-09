-- Atualizar função is_admin_or_gestor() para incluir SDR
CREATE OR REPLACE FUNCTION public.is_admin_or_gestor()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND tipo_usuario IN ('admin', 'master', 'gestor_conta', 'sdr')
  );
$$;

-- Criar política RLS para SDR visualizar orçamentos
CREATE POLICY "SDR podem ver todos os orçamentos"
ON public.orcamentos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND tipo_usuario = 'sdr'
    AND status = 'ativo'
  )
);