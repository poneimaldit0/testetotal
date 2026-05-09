-- Permitir que administradores insiram e atualizem arquivos de orçamento
CREATE POLICY "Admins podem inserir arquivos de orçamento"
ON public.arquivos_orcamento
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_orcamentos());

CREATE POLICY "Admins podem atualizar arquivos de orçamento"
ON public.arquivos_orcamento
FOR UPDATE
TO authenticated
USING (public.can_manage_orcamentos());

CREATE POLICY "Admins podem deletar arquivos de orçamento"
ON public.arquivos_orcamento
FOR DELETE
TO authenticated
USING (public.can_manage_orcamentos());