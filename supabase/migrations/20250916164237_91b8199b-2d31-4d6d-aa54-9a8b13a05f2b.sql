-- Corrigir o constraint da tabela profiles para incluir 'cliente' como tipo_usuario válido
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_tipo_usuario_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_tipo_usuario_check 
CHECK (tipo_usuario IN ('master', 'admin', 'fornecedor', 'gestor_conta', 'cliente'));