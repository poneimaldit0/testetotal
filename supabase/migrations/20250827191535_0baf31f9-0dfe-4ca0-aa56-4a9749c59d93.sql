-- Adicionar políticas RLS para permitir que fornecedores gerenciem seus próprios depoimentos

-- Política para permitir que fornecedores criem seus próprios depoimentos
CREATE POLICY "Fornecedores podem criar seus próprios depoimentos" 
ON public.depoimentos_fornecedores 
FOR INSERT 
WITH CHECK (fornecedor_id = auth.uid());

-- Política para permitir que fornecedores atualizem seus próprios depoimentos
CREATE POLICY "Fornecedores podem atualizar seus próprios depoimentos" 
ON public.depoimentos_fornecedores 
FOR UPDATE 
USING (fornecedor_id = auth.uid());

-- Política para permitir que fornecedores excluam seus próprios depoimentos
CREATE POLICY "Fornecedores podem excluir seus próprios depoimentos" 
ON public.depoimentos_fornecedores 
FOR DELETE 
USING (fornecedor_id = auth.uid());