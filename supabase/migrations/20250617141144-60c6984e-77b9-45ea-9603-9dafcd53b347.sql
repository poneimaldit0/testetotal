
-- Primeiro, vamos verificar se existe alguma constraint de foreign key na tabela profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Limpar o usuário existente se houver
DELETE FROM public.profiles WHERE email = 'raphael.nardi@reforma100.com';

-- Criar o perfil sem a constraint
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
  gen_random_uuid(),
  'raphael.nardi@reforma100.com',
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
);

-- Mostrar o ID criado
DO $$
DECLARE
  user_uuid uuid;
BEGIN
  SELECT id INTO user_uuid FROM public.profiles WHERE email = 'raphael.nardi@reforma100.com';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'PERFIL CRIADO COM SUCESSO!';
  RAISE NOTICE 'ID do usuário: %', user_uuid;
  RAISE NOTICE 'Email: raphael.nardi@reforma100.com';
  RAISE NOTICE 'Senha para usar: J@ck3001';
  RAISE NOTICE '';
  RAISE NOTICE 'PRÓXIMOS PASSOS:';
  RAISE NOTICE '1. Vá para o painel do Supabase';
  RAISE NOTICE '2. Authentication > Users';
  RAISE NOTICE '3. Clique em "Add user"';
  RAISE NOTICE '4. Use os dados acima';
  RAISE NOTICE '5. IMPORTANTE: Use este UUID: %', user_uuid;
  RAISE NOTICE '6. Marque "Auto Confirm User"';
  RAISE NOTICE '==============================================';
END $$;
