-- Atualizar políticas RLS para codigos_acesso_propostas
-- Permitir que fornecedores insiram códigos para suas próprias candidaturas

-- Remover política existente se houver
DROP POLICY IF EXISTS "Fornecedores podem inserir códigos para suas candidaturas" ON public.codigos_acesso_propostas;

-- Permitir fornecedores criarem códigos para suas próprias candidaturas
CREATE POLICY "Fornecedores podem inserir códigos para suas candidaturas" 
ON public.codigos_acesso_propostas 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.candidaturas_fornecedores cf
    WHERE cf.id = candidatura_id 
      AND cf.fornecedor_id = auth.uid()
  )
);

-- Permitir fornecedores atualizarem códigos de suas próprias candidaturas
CREATE POLICY "Fornecedores podem atualizar seus códigos" 
ON public.codigos_acesso_propostas 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.candidaturas_fornecedores cf
    WHERE cf.id = candidatura_id 
      AND cf.fornecedor_id = auth.uid()
  )
);