
-- Corrigir a função verificar_limite_acesso com lógica de comparação correta
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
$$;

-- Limpar dados inconsistentes e garantir valores corretos
UPDATE public.profiles 
SET acessos_diarios = COALESCE(acessos_diarios, 0),
    acessos_mensais = COALESCE(acessos_mensais, 0),
    ultimo_acesso_diario = COALESCE(ultimo_acesso_diario, CURRENT_DATE),
    ultimo_acesso_mensal = COALESCE(ultimo_acesso_mensal, CURRENT_DATE),
    limite_acessos_diarios = COALESCE(limite_acessos_diarios, 10),
    limite_acessos_mensais = COALESCE(limite_acessos_mensais, 100)
WHERE acessos_diarios IS NULL 
   OR acessos_mensais IS NULL 
   OR ultimo_acesso_diario IS NULL 
   OR ultimo_acesso_mensal IS NULL
   OR limite_acessos_diarios IS NULL
   OR limite_acessos_mensais IS NULL;
