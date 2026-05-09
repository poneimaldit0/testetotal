-- Permitir que SDR cadastrem novos orçamentos
CREATE POLICY "SDR podem inserir orçamentos"
ON public.orcamentos
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.profiles
    WHERE id = auth.uid() 
      AND tipo_usuario = 'sdr'
      AND status = 'ativo'
  )
);