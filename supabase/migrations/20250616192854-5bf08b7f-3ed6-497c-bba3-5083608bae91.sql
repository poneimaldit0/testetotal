
-- Criar função para criar usuário master automaticamente
CREATE OR REPLACE FUNCTION public.criar_usuario_master()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  master_user_id uuid;
  master_email text := 'raphael.nardi@reforma100.com';
  master_password text := 'J@ck3001';
BEGIN
  -- Verificar se o usuário master já existe
  SELECT id INTO master_user_id 
  FROM public.profiles 
  WHERE email = master_email AND tipo_usuario = 'admin';
  
  -- Se já existe, não fazer nada
  IF master_user_id IS NOT NULL THEN
    RAISE NOTICE 'Usuário master já existe com ID: %', master_user_id;
    RETURN;
  END IF;
  
  -- Tentar criar o usuário usando a API do Supabase Auth
  -- Nota: Esta abordagem pode não funcionar em todos os ambientes
  -- mas vamos tentar primeiro
  
  -- Gerar um UUID para o usuário master
  master_user_id := gen_random_uuid();
  
  -- Inserir diretamente na tabela auth.users (pode falhar por segurança)
  BEGIN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role
    ) VALUES (
      master_user_id,
      '00000000-0000-0000-0000-000000000000',
      master_email,
      crypt(master_password, gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '',
      '',
      '',
      '{"provider": "email", "providers": ["email"]}',
      '{"nome": "Raphael Nardi", "tipo_usuario": "admin"}',
      false,
      'authenticated'
    );
    
    RAISE NOTICE 'Usuário criado no auth.users com sucesso';
    
  EXCEPTION WHEN OTHERS THEN
    -- Se falhou, vamos criar apenas o perfil e informar que precisa criar manualmente
    RAISE NOTICE 'Não foi possível criar no auth.users automaticamente. Criando apenas o perfil.';
    RAISE NOTICE 'Você precisará criar o usuário manualmente no painel do Supabase com o email: %', master_email;
    RAISE NOTICE 'Use a senha: %', master_password;
    RAISE NOTICE 'E depois execute: UPDATE public.profiles SET id = ''<UUID_DO_USUARIO_CRIADO>'' WHERE email = ''%'';', master_email;
  END;
  
  -- Criar o perfil na tabela profiles
  INSERT INTO public.profiles (
    id,
    email,
    nome,
    telefone,
    empresa,
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
    master_user_id,
    master_email,
    'Raphael Nardi',
    null,
    'Reforma100',
    'admin',
    'ativo',
    999,
    9999,
    0,
    0,
    now(),
    now(),
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome = EXCLUDED.nome,
    empresa = EXCLUDED.empresa,
    tipo_usuario = EXCLUDED.tipo_usuario,
    status = EXCLUDED.status,
    limite_acessos_diarios = EXCLUDED.limite_acessos_diarios,
    limite_acessos_mensais = EXCLUDED.limite_acessos_mensais,
    updated_at = now();
    
  RAISE NOTICE 'Perfil do usuário master criado com sucesso!';
  RAISE NOTICE 'Email: %', master_email;
  RAISE NOTICE 'Senha: %', master_password;
  RAISE NOTICE 'ID: %', master_user_id;
END;
$$;

-- Executar a função para criar o usuário master
SELECT public.criar_usuario_master();

-- Remover a função após usar (opcional, para segurança)
DROP FUNCTION IF EXISTS public.criar_usuario_master();
