-- Criar bucket para arquivos de perfil de fornecedores
INSERT INTO storage.buckets (id, name, public) 
VALUES ('fornecedor-perfis', 'fornecedor-perfis', true);

-- Políticas para o bucket fornecedor-perfis
CREATE POLICY "Fornecedores podem ver arquivos de perfil" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'fornecedor-perfis');

CREATE POLICY "Fornecedores podem fazer upload de seus arquivos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'fornecedor-perfis' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Fornecedores podem atualizar seus arquivos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'fornecedor-perfis' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Fornecedores podem deletar seus arquivos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'fornecedor-perfis' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Adicionar novos campos à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS site_url text,
ADD COLUMN IF NOT EXISTS endereco text,
ADD COLUMN IF NOT EXISTS whatsapp text;