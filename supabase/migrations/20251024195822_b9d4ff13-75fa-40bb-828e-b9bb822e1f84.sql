-- Remover constraint antigo
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_tipo_usuario_check;

-- Adicionar constraint atualizado incluindo customer_success
ALTER TABLE public.profiles ADD CONSTRAINT profiles_tipo_usuario_check 
CHECK (tipo_usuario = ANY (ARRAY['master'::text, 'admin'::text, 'fornecedor'::text, 'gestor_conta'::text, 'cliente'::text, 'sdr'::text, 'customer_success'::text]));