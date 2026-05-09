-- Adicionar nova política RLS para permitir fornecedores verem todos os orçamentos (abertos e fechados)
-- para fins de consulta histórica

CREATE POLICY "Fornecedores podem ver todos os orçamentos para consulta histórica" 
ON public.orcamentos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.tipo_usuario = 'fornecedor'
      AND profiles.status = 'ativo'
  )
);