-- Admins e gestores podem deletar qualquer arquivo de proposta
-- (permite consultor/admin remover arquivo enviado pelo fornecedor)
CREATE POLICY "Admins podem deletar propostas"
ON public.propostas_arquivos
FOR DELETE
TO authenticated
USING (public.is_admin_or_gestor());

-- Admins e gestores podem atualizar status de análises
-- (permite cancelar análise antiga antes de reenviar)
CREATE POLICY "Admins podem atualizar análises"
ON public.propostas_analises_ia
FOR UPDATE
TO authenticated
USING (public.is_admin_or_gestor());
