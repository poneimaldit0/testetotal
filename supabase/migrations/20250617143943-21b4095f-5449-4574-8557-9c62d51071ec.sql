
-- PLANO COMPLETO DE RESOLUÇÃO DO USUÁRIO ADMIN
-- ================================================

-- 1. LIMPEZA COMPLETA DO ESTADO ATUAL
-- Remover qualquer vestígio do usuário problemático
DELETE FROM auth.users WHERE email = 'raphael.nardi@reforma100.com';
DELETE FROM public.profiles WHERE email = 'raphael.nardi@reforma100.com';

-- Remover constraint problemática se existir
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. RECRIAR A CONSTRAINT DE FOREIGN KEY CORRETAMENTE
-- Garantir integridade referencial entre auth.users e profiles
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. RECRIAR E ATIVAR O TRIGGER PARA NOVOS USUÁRIOS
-- Primeiro, remover trigger existente se houver
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recriar a função handle_new_user atualizada
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    nome,
    tipo_usuario,
    status,
    limite_acessos_diarios,
    limite_acessos_mensais,
    acessos_diarios,
    acessos_mensais,
    data_criacao,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', 'fornecedor'),
    'ativo',
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', 'fornecedor') = 'admin' THEN 999
      ELSE 10
    END,
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', 'fornecedor') = 'admin' THEN 9999
      ELSE 100
    END,
    0,
    0,
    now(),
    now(),
    now()
  );
  RETURN NEW;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. CRIAÇÃO AUTOMATIZADA DO USUÁRIO ADMIN
-- Função para criar o usuário admin completo
CREATE OR REPLACE FUNCTION public.criar_usuario_admin_completo()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
  admin_email text := 'raphael.nardi@reforma100.com';
  admin_password text := 'J@ck3001';
  encrypted_password text;
BEGIN
  -- Gerar UUID para o usuário
  admin_user_id := gen_random_uuid();
  
  -- Criar hash da senha (usando o mesmo método do Supabase)
  encrypted_password := crypt(admin_password, gen_salt('bf'));
  
  -- Inserir no auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    admin_user_id,
    'authenticated',
    'authenticated',
    admin_email,
    encrypted_password,
    now(),
    now(),
    '',
    now(),
    '',
    null,
    '',
    '',
    null,
    null,
    '{"provider": "email", "providers": ["email"]}',
    '{"nome": "Raphael Nardi", "tipo_usuario": "admin"}',
    false,
    now(),
    now(),
    null,
    null,
    '',
    '',
    null,
    '',
    0,
    null,
    '',
    null,
    false,
    null
  );
  
  -- O trigger handle_new_user criará automaticamente o perfil
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'USUÁRIO ADMIN CRIADO COM SUCESSO!';
  RAISE NOTICE 'Email: %', admin_email;
  RAISE NOTICE 'Senha: %', admin_password;
  RAISE NOTICE 'UUID: %', admin_user_id;
  RAISE NOTICE 'Status: Usuário criado em auth.users e profiles';
  RAISE NOTICE 'Pode fazer login imediatamente no sistema!';
  RAISE NOTICE '==============================================';
  
  RETURN admin_user_id;
END;
$$;

-- 5. EXECUTAR A CRIAÇÃO DO USUÁRIO ADMIN
SELECT public.criar_usuario_admin_completo();

-- 6. VALIDAÇÃO E LIMPEZA
-- Verificar se tudo foi criado corretamente
DO $$
DECLARE
  auth_count integer;
  profile_count integer;
  admin_uuid uuid;
BEGIN
  -- Contar registros criados
  SELECT COUNT(*) INTO auth_count FROM auth.users WHERE email = 'raphael.nardi@reforma100.com';
  SELECT COUNT(*) INTO profile_count FROM public.profiles WHERE email = 'raphael.nardi@reforma100.com';
  SELECT id INTO admin_uuid FROM public.profiles WHERE email = 'raphael.nardi@reforma100.com';
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'VALIDAÇÃO FINAL:';
  RAISE NOTICE 'Usuários em auth.users: %', auth_count;
  RAISE NOTICE 'Perfis em public.profiles: %', profile_count;
  RAISE NOTICE 'UUID sincronizado: %', admin_uuid;
  
  IF auth_count = 1 AND profile_count = 1 THEN
    RAISE NOTICE 'STATUS: ✅ SUCESSO - Usuário criado corretamente!';
  ELSE
    RAISE NOTICE 'STATUS: ❌ ERRO - Problema na sincronização!';
  END IF;
  RAISE NOTICE '==============================================';
END $$;

-- Remover função temporária por segurança
DROP FUNCTION IF EXISTS public.criar_usuario_admin_completo();
