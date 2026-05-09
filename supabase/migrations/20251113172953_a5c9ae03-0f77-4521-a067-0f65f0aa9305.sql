-- Criar políticas RLS para o bucket crm-marcenaria-anexos

-- Política de INSERT (Upload de Arquivos)
CREATE POLICY "Usuários autorizados podem fazer upload de anexos marcenaria"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'crm-marcenaria-anexos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario IN ('master', 'admin', 'gestor_marcenaria', 'consultor_marcenaria', 'customer_success')
  )
);

-- Política de SELECT (Visualização de Arquivos)
CREATE POLICY "Usuários autorizados podem visualizar anexos marcenaria"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'crm-marcenaria-anexos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario IN ('master', 'admin', 'gestor_marcenaria', 'consultor_marcenaria', 'customer_success')
  )
);

-- Política de DELETE (Remoção de Arquivos)
CREATE POLICY "Usuários autorizados podem deletar anexos marcenaria"
ON storage.objects FOR DELETE
TO public
USING (
  bucket_id = 'crm-marcenaria-anexos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario IN ('master', 'admin', 'gestor_marcenaria', 'customer_success')
  )
);