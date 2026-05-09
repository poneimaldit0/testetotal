-- Criar bucket para fotos do diário de obra
INSERT INTO storage.buckets (id, name, public) VALUES ('diario-obra-fotos', 'diario-obra-fotos', true);

-- Criar policies para o bucket de fotos do diário
CREATE POLICY "Fornecedores podem ver fotos de seus contratos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'diario-obra-fotos' AND
  EXISTS (
    SELECT 1 FROM public.diario_obra d
    WHERE d.fornecedor_id = auth.uid()
    AND storage.foldername(name)[1] = d.fornecedor_id::text
    AND storage.foldername(name)[2] = d.contrato_id::text
  )
);

CREATE POLICY "Fornecedores podem upload fotos em seus contratos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'diario-obra-fotos' AND
  storage.foldername(name)[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM public.contratos c
    WHERE c.id = storage.foldername(name)[2]::uuid
    AND c.fornecedor_id = auth.uid()
  )
);

CREATE POLICY "Fornecedores podem deletar fotos de seus contratos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'diario-obra-fotos' AND
  EXISTS (
    SELECT 1 FROM public.diario_obra d
    WHERE d.fornecedor_id = auth.uid()
    AND storage.foldername(name)[1] = d.fornecedor_id::text
    AND storage.foldername(name)[2] = d.contrato_id::text
  )
);

-- Clientes podem ver fotos dos seus projetos
CREATE POLICY "Clientes podem ver fotos de seus projetos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'diario-obra-fotos' AND
  EXISTS (
    SELECT 1 FROM public.diario_obra d
    JOIN public.contratos c ON c.id = d.contrato_id
    JOIN public.clientes cl ON cl.id = c.cliente_id
    WHERE cl.auth_user_id = auth.uid()
    AND d.visivel_cliente = true
    AND storage.foldername(name)[1] = d.fornecedor_id::text
    AND storage.foldername(name)[2] = d.contrato_id::text
  )
);

-- Admins podem gerenciar todas as fotos
CREATE POLICY "Admins podem gerenciar todas as fotos do diário"
ON storage.objects FOR ALL
USING (bucket_id = 'diario-obra-fotos' AND is_admin());