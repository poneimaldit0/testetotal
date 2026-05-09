-- Remover constraint antigo que não inclui SDR
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_tipo_usuario_check;

-- Adicionar novo constraint incluindo SDR
ALTER TABLE profiles 
ADD CONSTRAINT profiles_tipo_usuario_check 
CHECK (tipo_usuario IN ('master', 'admin', 'fornecedor', 'gestor_conta', 'cliente', 'sdr'));

-- Alterar Maria Luisa Martins para SDR
UPDATE profiles 
SET 
  tipo_usuario = 'sdr',
  updated_at = now()
WHERE id = 'ebdbd36f-2922-4316-b2e0-93877f422ee2';