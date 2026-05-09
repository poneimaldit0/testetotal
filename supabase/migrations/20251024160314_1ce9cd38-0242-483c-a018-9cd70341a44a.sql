-- Permitir que SDR vejam dados de gestores de conta para apropriação
CREATE POLICY "SDR podem ver dados de gestores de conta"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- SDR autenticado pode ver perfis de gestores de conta
  (
    EXISTS (
      SELECT 1 
      FROM public.profiles p
      WHERE p.id = auth.uid() 
        AND p.tipo_usuario = 'sdr'
        AND p.status = 'ativo'
    )
    AND tipo_usuario IN ('gestor_conta', 'admin', 'master')
  )
);