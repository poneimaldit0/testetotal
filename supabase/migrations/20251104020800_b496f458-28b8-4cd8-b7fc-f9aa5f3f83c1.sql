-- Remover o constraint antigo que não inclui gestor_marcenaria
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_tipo_usuario_check;

-- Criar novo constraint incluindo gestor_marcenaria
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_tipo_usuario_check 
CHECK (tipo_usuario = ANY (ARRAY[
  'master'::text, 
  'admin'::text, 
  'fornecedor'::text, 
  'gestor_conta'::text, 
  'cliente'::text, 
  'sdr'::text, 
  'customer_success'::text,
  'gestor_marcenaria'::text
]));

-- Log da alteração
COMMENT ON CONSTRAINT profiles_tipo_usuario_check ON public.profiles IS 
'Validação de tipo de usuário: master, admin, fornecedor, gestor_conta, cliente, sdr, customer_success, gestor_marcenaria';