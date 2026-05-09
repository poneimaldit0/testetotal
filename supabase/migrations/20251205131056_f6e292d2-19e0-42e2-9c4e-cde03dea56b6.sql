-- Adicionar política RLS para permitir Customer Success ver candidaturas de fornecedores
CREATE POLICY "Customer Success podem ver todas as candidaturas"
ON public.candidaturas_fornecedores
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = 'customer_success'
    AND profiles.status = 'ativo'
  )
);