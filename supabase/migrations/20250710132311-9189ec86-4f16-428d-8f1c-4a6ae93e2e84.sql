-- Fase 1: Adicionar tipo de usuário "master" e estrutura de permissões

-- Modificar a coluna tipo_usuario para permitir o valor 'master'
-- Como não há enum definido, a coluna aceita text, então apenas precisamos documentar os valores válidos
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

-- Criar o primeiro usuário master (usando um ID específico - você deve alterar este email)
-- IMPORTANTE: Altere o email abaixo para o email do usuário que deve ser master
UPDATE public.profiles 
SET tipo_usuario = 'master', 
    updated_at = now()
WHERE email = 'raphael.nardi@reforma100.com' 
  AND tipo_usuario = 'admin';

-- Adicionar políticas RLS para futuras tabelas financeiras
-- (estas serão usadas quando criarmos as tabelas financeiras na Fase 2)

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