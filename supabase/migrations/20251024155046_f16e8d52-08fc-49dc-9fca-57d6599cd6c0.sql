-- Criar política RLS para SDR visualizar candidaturas de fornecedores
CREATE POLICY "SDR podem ver todas as candidaturas"
ON public.candidaturas_fornecedores
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

-- Criar política RLS para SDR visualizar inscrições de fornecedores
CREATE POLICY "SDR podem ver todas as inscrições"
ON public.inscricoes_fornecedores
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