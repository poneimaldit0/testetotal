-- Permitir que SDR excluam orçamentos
CREATE POLICY "SDR podem deletar orçamentos"
ON public.orcamentos
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles
    WHERE id = auth.uid() 
      AND tipo_usuario = 'sdr'
      AND status = 'ativo'
  )
);

-- Permitir que SDR atualizem orçamentos
CREATE POLICY "SDR podem atualizar orçamentos"
ON public.orcamentos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles
    WHERE id = auth.uid() 
      AND tipo_usuario = 'sdr'
      AND status = 'ativo'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.profiles
    WHERE id = auth.uid() 
      AND tipo_usuario = 'sdr'
      AND status = 'ativo'
  )
);