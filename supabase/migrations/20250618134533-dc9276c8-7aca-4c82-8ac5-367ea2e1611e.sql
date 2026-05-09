
-- 1. Habilitar RLS na tabela profiles se ainda não estiver habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Criar função auxiliar para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND tipo_usuario = 'admin'
  );
$$;

-- 3. Criar função auxiliar para verificar se o usuário é admin (com parâmetro)
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND tipo_usuario = 'admin'
  );
$$;

-- 4. Remover políticas existentes se houver
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem atualizar todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Perfis são visíveis para usuários autenticados" ON public.profiles;

-- 5. Criar políticas RLS adequadas
-- Política para SELECT: usuários podem ver seu próprio perfil, admins podem ver todos
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id OR public.is_admin()
  );

-- Política para UPDATE: usuários podem atualizar seu próprio perfil, admins podem atualizar todos
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id OR public.is_admin()
  );

-- Política para INSERT: apenas admins podem inserir novos perfis
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Política para DELETE: apenas admins podem deletar perfis
CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE
  USING (public.is_admin());

-- 6. Criar função para buscar todos os usuários (apenas para admins)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  nome text,
  telefone text,
  empresa text,
  tipo_usuario text,
  status text,
  limite_acessos_diarios integer,
  limite_acessos_mensais integer,
  acessos_diarios integer,
  acessos_mensais integer,
  data_criacao timestamp with time zone,
  data_termino_contrato date,
  ultimo_login timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    p.id,
    p.email,
    p.nome,
    p.telefone,
    p.empresa,
    p.tipo_usuario,
    p.status,
    p.limite_acessos_diarios,
    p.limite_acessos_mensais,
    p.acessos_diarios,
    p.acessos_mensais,
    p.data_criacao,
    p.data_termino_contrato,
    p.ultimo_login,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE public.is_admin();
$$;
