
-- Verificar se o trigger existe e criar função para inserir perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    nome,
    tipo_usuario,
    status,
    data_criacao,
    limite_acessos_diarios,
    limite_acessos_mensais
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', 'fornecedor'),
    'ativo',
    NOW(),
    10,
    100
  );
  RETURN NEW;
END;
$$;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar trigger que executa quando um usuário é criado
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verificar se o usuário criado existe na tabela profiles
-- Se não existir, inserir manualmente
DO $$
BEGIN
  -- Inserir o usuário que foi criado mas não aparece na lista
  INSERT INTO public.profiles (
    id,
    email,
    nome,
    tipo_usuario,
    status,
    data_criacao,
    limite_acessos_diarios,
    limite_acessos_mensais
  )
  SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data ->> 'nome', 'raphael nardi'),
    COALESCE(u.raw_user_meta_data ->> 'tipo_usuario', 'fornecedor'),
    'ativo',
    u.created_at,
    10,
    100
  FROM auth.users u
  WHERE u.id = '259d84e8-a132-4c2e-8044-a7d55e5a73be'
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = u.id
    );
END $$;
