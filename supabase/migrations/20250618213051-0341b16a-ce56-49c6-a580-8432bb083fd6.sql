
-- Garantir que as políticas RLS da tabela candidaturas_fornecedores estão corretas
-- Primeiro, remover políticas existentes se houver
DROP POLICY IF EXISTS "Fornecedores podem ver suas próprias candidaturas" ON public.candidaturas_fornecedores;
DROP POLICY IF EXISTS "Fornecedores podem criar suas próprias candidaturas" ON public.candidaturas_fornecedores;
DROP POLICY IF EXISTS "Fornecedores podem atualizar suas próprias candidaturas" ON public.candidaturas_fornecedores;
DROP POLICY IF EXISTS "Admins podem ver todas as candidaturas" ON public.candidaturas_fornecedores;

-- Política para fornecedores verem suas próprias candidaturas (sem restrição de status do orçamento)
CREATE POLICY "Fornecedores podem ver suas próprias candidaturas" 
ON public.candidaturas_fornecedores 
FOR SELECT 
USING (fornecedor_id = auth.uid());

-- Política para fornecedores criarem suas próprias candidaturas
CREATE POLICY "Fornecedores podem criar suas próprias candidaturas" 
ON public.candidaturas_fornecedores 
FOR INSERT 
WITH CHECK (fornecedor_id = auth.uid());

-- Política para fornecedores atualizarem suas próprias candidaturas
CREATE POLICY "Fornecedores podem atualizar suas próprias candidaturas" 
ON public.candidaturas_fornecedores 
FOR UPDATE 
USING (fornecedor_id = auth.uid());

-- Política para admins verem todas as candidaturas
CREATE POLICY "Admins podem ver todas as candidaturas" 
ON public.candidaturas_fornecedores 
FOR ALL 
USING (public.is_admin());

-- Garantir que fornecedores podem ver orçamentos onde têm candidaturas (mesmo fechados)
-- Primeiro, remover política existente se houver
DROP POLICY IF EXISTS "Fornecedores podem ver orçamentos onde se candidataram" ON public.orcamentos;

-- Política para fornecedores verem orçamentos onde se candidataram
CREATE POLICY "Fornecedores podem ver orçamentos onde se candidataram" 
ON public.orcamentos 
FOR SELECT 
USING (
  id IN (
    SELECT orcamento_id 
    FROM public.candidaturas_fornecedores 
    WHERE fornecedor_id = auth.uid()
  )
);

-- Política para admins verem todos os orçamentos
DROP POLICY IF EXISTS "Admins podem ver todos os orçamentos" ON public.orcamentos;
CREATE POLICY "Admins podem ver todos os orçamentos" 
ON public.orcamentos 
FOR ALL 
USING (public.is_admin());

-- Política para usuários autenticados verem orçamentos abertos
DROP POLICY IF EXISTS "Usuários autenticados podem ver orçamentos abertos" ON public.orcamentos;
CREATE POLICY "Usuários autenticados podem ver orçamentos abertos" 
ON public.orcamentos 
FOR SELECT 
USING (status = 'aberto' AND auth.uid() IS NOT NULL);
