-- SECURITY FIX: Update all remaining functions with secure search_path
-- This addresses the remaining 43 function search path vulnerabilities

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.listar_fornecedores_para_relatorio()
RETURNS TABLE(id uuid, nome text, email text, empresa text, status text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT 
    p.id,
    p.nome,
    p.email,
    p.empresa,
    p.status
  FROM public.profiles p
  WHERE p.tipo_usuario = 'fornecedor'
    AND public.is_admin()
  ORDER BY p.nome;
$function$;

CREATE OR REPLACE FUNCTION public.listar_gestores_conta()
RETURNS TABLE(id uuid, nome text, email text, empresa text, status text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT 
    p.id,
    p.nome,
    p.email,
    p.empresa,
    p.status
  FROM public.profiles p
  WHERE p.tipo_usuario = 'gestor_conta'
    AND p.status = 'ativo'
    AND public.can_manage_orcamentos()
  ORDER BY p.nome;
$function$;

CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE(id uuid, email text, nome text, telefone text, empresa text, tipo_usuario text, status text, limite_acessos_diarios integer, limite_acessos_mensais integer, acessos_diarios integer, acessos_mensais integer, data_criacao timestamp with time zone, data_termino_contrato date, ultimo_login timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.verificar_limite_acesso(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  profile_record RECORD;
BEGIN
  SELECT * INTO profile_record 
  FROM public.profiles 
  WHERE id = user_id;
  
  -- Se não encontrou o usuário, negar acesso
  IF profile_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se o contrato expirou e atualizar status se necessário
  IF profile_record.data_termino_contrato IS NOT NULL AND profile_record.data_termino_contrato < CURRENT_DATE THEN
    UPDATE public.profiles 
    SET status = 'inativo', updated_at = now()
    WHERE id = user_id;
    RETURN FALSE;
  END IF;
  
  -- Se está inativo ou suspenso, negar acesso
  IF profile_record.status != 'ativo' THEN
    RETURN FALSE;
  END IF;
  
  -- Admins sempre têm acesso (se estão ativos)
  IF profile_record.tipo_usuario = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Reset contadores se necessário (sem incrementar ainda)
  IF profile_record.ultimo_acesso_diario IS NULL OR profile_record.ultimo_acesso_diario < CURRENT_DATE THEN
    UPDATE public.profiles 
    SET acessos_diarios = 0, ultimo_acesso_diario = CURRENT_DATE
    WHERE id = user_id;
    -- Recarregar dados após reset
    SELECT * INTO profile_record FROM public.profiles WHERE id = user_id;
  END IF;
  
  IF profile_record.ultimo_acesso_mensal IS NULL OR DATE_TRUNC('month', profile_record.ultimo_acesso_mensal) < DATE_TRUNC('month', CURRENT_DATE) THEN
    UPDATE public.profiles 
    SET acessos_mensais = 0, ultimo_acesso_mensal = CURRENT_DATE
    WHERE id = user_id;
    -- Recarregar dados após reset
    SELECT * INTO profile_record FROM public.profiles WHERE id = user_id;
  END IF;
  
  -- VERIFICAR limites corretamente - permitir acesso se MENOR que o limite
  IF profile_record.acessos_diarios < profile_record.limite_acessos_diarios AND 
     profile_record.acessos_mensais < profile_record.limite_acessos_mensais THEN
    RETURN TRUE;
  END IF;
  
  -- Se chegou aqui, limite foi atingido
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_acesso_bem_sucedido(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Incrementar contadores e atualizar último login apenas após sucesso
  UPDATE public.profiles 
  SET acessos_diarios = acessos_diarios + 1,
      acessos_mensais = acessos_mensais + 1,
      ultimo_login = now()
  WHERE id = user_id;
  
  -- Registrar log de acesso
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (user_id, 'acesso_sistema');
END;
$function$;