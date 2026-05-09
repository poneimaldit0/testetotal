-- Criar tipo de usuário "gestor_conta" e ajustar permissões

-- Primeiro, atualizar constraint para incluir o novo tipo
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_tipo_usuario_check;

-- Adicionar nova constraint que inclui 'gestor_conta'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_tipo_usuario_check 
CHECK (tipo_usuario IN ('master', 'admin', 'fornecedor', 'gestor_conta'));

-- Documentar os tipos válidos
COMMENT ON COLUMN public.profiles.tipo_usuario IS 'Tipos válidos: master, admin, fornecedor, gestor_conta';

-- Criar função para verificar se o usuário é gestor de conta
CREATE OR REPLACE FUNCTION public.is_gestor_conta()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND tipo_usuario = 'gestor_conta'
  );
$function$;

-- Atualizar função is_admin para incluir gestor_conta no acesso a orçamentos
CREATE OR REPLACE FUNCTION public.can_manage_orcamentos()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND tipo_usuario IN ('admin', 'master', 'gestor_conta')
  );
$function$;

-- Adicionar políticas RLS para gestor_conta ter acesso aos orçamentos
CREATE POLICY "Gestores de conta podem ver todos os orçamentos"
ON public.orcamentos 
FOR SELECT 
USING (public.is_gestor_conta());

CREATE POLICY "Gestores de conta podem inserir orçamentos"
ON public.orcamentos 
FOR INSERT 
WITH CHECK (public.is_gestor_conta());

CREATE POLICY "Gestores de conta podem atualizar orçamentos"
ON public.orcamentos 
FOR UPDATE 
USING (public.is_gestor_conta());

CREATE POLICY "Gestores de conta podem deletar orçamentos"
ON public.orcamentos 
FOR DELETE 
USING (public.is_gestor_conta());

-- Permitir gestor_conta ver candidaturas dos orçamentos
CREATE POLICY "Gestores de conta podem ver candidaturas"
ON public.candidaturas_fornecedores 
FOR SELECT 
USING (public.is_gestor_conta());

-- Permitir gestor_conta ver inscrições dos orçamentos  
CREATE POLICY "Gestores de conta podem ver inscrições"
ON public.inscricoes_fornecedores 
FOR SELECT 
USING (public.is_gestor_conta());

-- Comentários para documentação
COMMENT ON FUNCTION public.is_gestor_conta() IS 'Verifica se o usuário logado é do tipo gestor_conta';
COMMENT ON FUNCTION public.can_manage_orcamentos() IS 'Verifica se o usuário tem permissão para gerenciar orçamentos (admin, master ou gestor_conta)';

-- Registrar log da criação da estrutura gestor_conta
INSERT INTO public.logs_acesso (user_id, acao)
VALUES (NULL, 'criacao_estrutura_usuario_gestor_conta');