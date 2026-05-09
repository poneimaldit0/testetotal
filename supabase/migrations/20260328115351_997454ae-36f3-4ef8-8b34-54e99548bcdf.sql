ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_tipo_usuario_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_tipo_usuario_check 
CHECK (tipo_usuario IN ('master', 'admin', 'fornecedor', 'gestor_conta', 'cliente', 'sdr', 'customer_success', 'gestor_marcenaria', 'consultor_marcenaria', 'closer', 'pre_vendas'));