-- Adicionar 'consultor_marcenaria' à constraint de tipo_usuario
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_tipo_usuario_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_tipo_usuario_check 
CHECK (tipo_usuario = ANY (ARRAY[
  'master'::text, 
  'admin'::text, 
  'fornecedor'::text, 
  'gestor_conta'::text, 
  'cliente'::text, 
  'sdr'::text, 
  'customer_success'::text, 
  'gestor_marcenaria'::text,
  'consultor_marcenaria'::text
]));