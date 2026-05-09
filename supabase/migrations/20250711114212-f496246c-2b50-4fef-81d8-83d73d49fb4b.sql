-- Fase 1: Adicionar tipo de usuário "master" e estrutura de permissões

-- Primeiro, descobrir e remover a constraint que impede o valor 'master'
-- Vamos alterar a constraint para permitir 'master', 'admin', 'fornecedor'
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_tipo_usuario_check;

-- Adicionar nova constraint que inclui 'master'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_tipo_usuario_check 
CHECK (tipo_usuario IN ('master', 'admin', 'fornecedor'));

-- Documentar os tipos válidos
COMMENT ON COLUMN public.profiles.tipo_usuario IS 'Tipos válidos: master, admin, fornecedor';

-- Criar função para verificar se o usuário é master
CREATE OR REPLACE FUNCTION public.is_master()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND tipo_usuario = 'master'
  );
$function$;

-- Criar função para verificar se o usuário é master ou admin (hierarquia)
CREATE OR REPLACE FUNCTION public.is_master_or_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND tipo_usuario IN ('master', 'admin')
  );
$function$;

-- Atualizar a função is_admin para manter a hierarquia (master também é considerado admin para compatibilidade)
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND tipo_usuario IN ('admin', 'master')
  );
$function$;

-- Criar o primeiro usuário master
UPDATE public.profiles 
SET tipo_usuario = 'master', 
    updated_at = now()
WHERE email = 'raphael.nardi@reforma100.com' 
  AND tipo_usuario = 'admin';

-- Função utilitária para verificar acesso a dados financeiros (apenas master)
CREATE OR REPLACE FUNCTION public.can_access_financial()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT public.is_master();
$function$;

-- Registrar log da criação da estrutura master
INSERT INTO public.logs_acesso (user_id, acao)
VALUES (NULL, 'criacao_estrutura_usuario_master');

-- Comentários para documentação
COMMENT ON FUNCTION public.is_master() IS 'Verifica se o usuário logado é do tipo master';
COMMENT ON FUNCTION public.is_master_or_admin() IS 'Verifica se o usuário logado é master ou admin';
COMMENT ON FUNCTION public.can_access_financial() IS 'Verifica se o usuário tem acesso ao módulo financeiro (apenas master)';