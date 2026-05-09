-- Criar políticas de storage para o bucket orcamentos-anexos
CREATE POLICY "Admins podem fazer upload de arquivos de orçamentos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'orcamentos-anexos' 
  AND public.can_manage_orcamentos()
);

CREATE POLICY "Todos podem visualizar arquivos de orçamentos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'orcamentos-anexos');

CREATE POLICY "Admins podem atualizar arquivos de orçamentos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'orcamentos-anexos' 
  AND public.can_manage_orcamentos()
);

CREATE POLICY "Admins podem deletar arquivos de orçamentos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'orcamentos-anexos' 
  AND public.can_manage_orcamentos()
);