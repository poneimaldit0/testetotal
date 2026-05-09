-- Remover política restritiva existente
DROP POLICY IF EXISTS "Fornecedores podem ver arquivos de perfil" ON storage.objects;

-- Criar nova política que permite acesso público irrestrito ao bucket fornecedor-perfis
CREATE POLICY "Acesso público aos perfis de fornecedores" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'fornecedor-perfis');