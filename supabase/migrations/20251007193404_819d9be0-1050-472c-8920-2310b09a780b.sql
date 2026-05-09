-- Adicionar policy para permitir fornecedores verem todas candidaturas para contagem
CREATE POLICY "Fornecedores ativos podem ver todas candidaturas para contagem"
ON public.candidaturas_fornecedores
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.tipo_usuario = 'fornecedor'
    AND profiles.status = 'ativo'
  )
);