
-- Adicionar coluna data_termino_contrato na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN data_termino_contrato DATE NULL;

-- Criar função para verificar e atualizar status de usuários com contrato expirado
CREATE OR REPLACE FUNCTION public.verificar_contratos_expirados()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar status para inativo quando a data de término do contrato passou
  UPDATE public.profiles 
  SET status = 'inativo',
      updated_at = now()
  WHERE data_termino_contrato IS NOT NULL 
    AND data_termino_contrato < CURRENT_DATE 
    AND status = 'ativo';
END;
$$;

-- Criar trigger para verificar contratos expirados automaticamente
CREATE OR REPLACE FUNCTION public.trigger_verificar_contratos()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar se a data de término passou e atualizar status
  IF NEW.data_termino_contrato IS NOT NULL AND NEW.data_termino_contrato < CURRENT_DATE THEN
    NEW.status := 'inativo';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Aplicar trigger na tabela profiles para verificar na inserção e atualização
DROP TRIGGER IF EXISTS trigger_verificar_contrato_expirado ON public.profiles;
CREATE TRIGGER trigger_verificar_contrato_expirado
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_verificar_contratos();

-- Atualizar a função verificar_limite_acesso para considerar contratos expirados
CREATE OR REPLACE FUNCTION public.verificar_limite_acesso(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  
  -- Reset contadores se necessário
  IF profile_record.ultimo_acesso_diario < CURRENT_DATE THEN
    UPDATE public.profiles 
    SET acessos_diarios = 0, ultimo_acesso_diario = CURRENT_DATE
    WHERE id = user_id;
  END IF;
  
  IF DATE_TRUNC('month', profile_record.ultimo_acesso_mensal) < DATE_TRUNC('month', CURRENT_DATE) THEN
    UPDATE public.profiles 
    SET acessos_mensais = 0, ultimo_acesso_mensal = CURRENT_DATE
    WHERE id = user_id;
  END IF;
  
  -- Verificar limites personalizados
  SELECT * INTO profile_record 
  FROM public.profiles 
  WHERE id = user_id;
  
  IF profile_record.acessos_diarios >= profile_record.limite_acessos_diarios OR 
     profile_record.acessos_mensais >= profile_record.limite_acessos_mensais THEN
    RETURN FALSE;
  END IF;
  
  -- Incrementar contadores e atualizar último login
  UPDATE public.profiles 
  SET acessos_diarios = acessos_diarios + 1,
      acessos_mensais = acessos_mensais + 1,
      ultimo_login = now()
  WHERE id = user_id;
  
  -- Registrar log de acesso
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (user_id, 'acesso_sistema');
  
  RETURN TRUE;
END;
$$;
