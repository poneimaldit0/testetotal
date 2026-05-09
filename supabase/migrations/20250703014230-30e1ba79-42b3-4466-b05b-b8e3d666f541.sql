
-- Remover a política existente que só permite ver orçamentos abertos
DROP POLICY IF EXISTS "Fornecedores podem ver orçamentos abertos" ON public.orcamentos;

-- Criar nova política que permite ver orçamentos abertos E fechados
CREATE POLICY "Fornecedores podem ver orçamentos disponíveis" 
ON public.orcamentos 
FOR SELECT 
USING (
  (status IN ('aberto'::text, 'fechado'::text)) 
  AND 
  (EXISTS ( 
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.tipo_usuario = 'fornecedor'::text
  ))
);
