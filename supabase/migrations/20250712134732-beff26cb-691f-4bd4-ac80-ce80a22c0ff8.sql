-- Criar política RLS para permitir fornecedores ativos verem orçamentos abertos
CREATE POLICY "Fornecedores podem ver orçamentos abertos" 
ON public.orcamentos 
FOR SELECT 
USING (
  status = 'aberto' 
  AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.tipo_usuario = 'fornecedor'
      AND profiles.status = 'ativo'
  )
);