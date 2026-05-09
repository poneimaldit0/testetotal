-- Adicionar novos campos para separar candidaturas de logins
ALTER TABLE public.profiles 
ADD COLUMN candidaturas_diarias INTEGER DEFAULT 0,
ADD COLUMN candidaturas_mensais INTEGER DEFAULT 0,
ADD COLUMN ultimo_acesso_candidatura_diario DATE DEFAULT CURRENT_DATE,
ADD COLUMN ultimo_acesso_candidatura_mensal DATE DEFAULT CURRENT_DATE;

-- Atualizar função para resetar contadores de candidaturas
CREATE OR REPLACE FUNCTION public.reset_contadores_candidatura_diarios()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Reset contadores de candidaturas diárias para todos os usuários às 00:00
  UPDATE public.profiles 
  SET candidaturas_diarias = 0,
      ultimo_acesso_candidatura_diario = CURRENT_DATE
  WHERE ultimo_acesso_candidatura_diario < CURRENT_DATE OR ultimo_acesso_candidatura_diario IS NULL;
  
  -- Reset contadores mensais se necessário
  UPDATE public.profiles 
  SET candidaturas_mensais = 0,
      ultimo_acesso_candidatura_mensal = CURRENT_DATE
  WHERE ultimo_acesso_candidatura_mensal < DATE_TRUNC('month', CURRENT_DATE) OR ultimo_acesso_candidatura_mensal IS NULL;
  
  -- Log da operação
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (NULL, 'reset_contadores_candidatura_automatico');
END;
$function$;

-- Função para verificar limite específico de candidaturas
CREATE OR REPLACE FUNCTION public.verificar_limite_candidatura(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  profile_record RECORD;
BEGIN
  -- Buscar dados do perfil
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE id = user_id;
  
  -- Se usuário não existe, retornar false
  IF profile_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Resetar contadores se mudou o dia/mês
  IF profile_record.ultimo_acesso_candidatura_diario IS NULL OR profile_record.ultimo_acesso_candidatura_diario < CURRENT_DATE THEN
    UPDATE public.profiles
    SET candidaturas_diarias = 0,
        ultimo_acesso_candidatura_diario = CURRENT_DATE
    WHERE id = user_id;
    
    -- Recarregar dados
    SELECT * INTO profile_record FROM public.profiles WHERE id = user_id;
  END IF;
  
  IF profile_record.ultimo_acesso_candidatura_mensal IS NULL OR profile_record.ultimo_acesso_candidatura_mensal < DATE_TRUNC('month', CURRENT_DATE)::date THEN
    UPDATE public.profiles
    SET candidaturas_mensais = 0,
        ultimo_acesso_candidatura_mensal = DATE_TRUNC('month', CURRENT_DATE)::date
    WHERE id = user_id;
    
    -- Recarregar dados
    SELECT * INTO profile_record FROM public.profiles WHERE id = user_id;
  END IF;
  
  -- Verificar se ainda pode fazer candidaturas
  RETURN (profile_record.candidaturas_diarias < profile_record.limite_acessos_diarios) 
     AND (profile_record.candidaturas_mensais < profile_record.limite_acessos_mensais);
END;
$function$;

-- Função para registrar candidatura bem-sucedida
CREATE OR REPLACE FUNCTION public.registrar_candidatura_bem_sucedida(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Incrementar contadores de candidaturas
  UPDATE public.profiles 
  SET candidaturas_diarias = candidaturas_diarias + 1,
      candidaturas_mensais = candidaturas_mensais + 1
  WHERE id = user_id;
  
  -- Registrar log de candidatura
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (user_id, 'candidatura_orcamento');
END;
$function$;

-- Atualizar função de registro de acesso (apenas para logins, sem limites)
CREATE OR REPLACE FUNCTION public.registrar_acesso_bem_sucedido(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Apenas atualizar último login (logins são ilimitados)
  UPDATE public.profiles 
  SET ultimo_login = now()
  WHERE id = user_id;
  
  -- Registrar log de acesso
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (user_id, 'acesso_sistema');
END;
$function$;

-- Atualizar função principal de candidatura
CREATE OR REPLACE FUNCTION public.processar_candidatura_fornecedor(p_orcamento_id uuid, p_fornecedor_id uuid, p_nome text, p_email text, p_telefone text, p_empresa text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  limite_ok BOOLEAN;
  profile_record RECORD;
  candidatura_existente RECORD;
  orcamento_record RECORD;
  count_candidaturas INTEGER;
  limite_diario_excedido BOOLEAN;
  limite_mensal_excedido BOOLEAN;
  result JSONB;
BEGIN
  -- Verificar se já está candidatado
  SELECT * INTO candidatura_existente
  FROM public.candidaturas_fornecedores
  WHERE orcamento_id = p_orcamento_id 
    AND fornecedor_id = p_fornecedor_id;
  
  IF candidatura_existente IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_applied',
      'message', 'Você já se candidatou a este orçamento'
    );
  END IF;
  
  -- BLOQUEIO ATÔMICO: Bloquear o orçamento para verificação atômica
  SELECT * INTO orcamento_record
  FROM public.orcamentos
  WHERE id = p_orcamento_id
  FOR UPDATE;
  
  -- Verificar se o orçamento existe
  IF orcamento_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'orcamento_not_found',
      'message', 'Orçamento não encontrado'
    );
  END IF;
  
  -- Verificar se o orçamento já está fechado
  IF orcamento_record.status = 'fechado' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'orcamento_fechado',
      'message', 'Este orçamento já está fechado para novas candidaturas'
    );
  END IF;
  
  -- VERIFICAÇÃO ATÔMICA: Contar candidaturas ANTES de inserir
  SELECT COUNT(*) INTO count_candidaturas
  FROM public.candidaturas_fornecedores
  WHERE orcamento_id = p_orcamento_id;
  
  -- Verificar se já atingiu o limite de 3 candidaturas
  IF count_candidaturas >= 3 THEN
    -- Marcar orçamento como fechado se ainda não estiver
    UPDATE public.orcamentos
    SET status = 'fechado', updated_at = now()
    WHERE id = p_orcamento_id AND status != 'fechado';
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'limite_candidaturas_atingido',
      'message', 'Este orçamento já atingiu o limite máximo de 3 candidaturas',
      'total_candidaturas', count_candidaturas
    );
  END IF;
  
  -- Obter dados do perfil
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE id = p_fornecedor_id;
  
  -- Verificar limite de candidaturas (admins não têm limites)
  IF profile_record.tipo_usuario = 'admin' THEN
    limite_ok := true;
  ELSE
    SELECT public.verificar_limite_candidatura(p_fornecedor_id) INTO limite_ok;
    
    -- Se limite foi excedido, verificar qual limite especificamente
    IF NOT limite_ok THEN
      -- Recarregar dados do perfil após possível reset na função verificar_limite_candidatura
      SELECT * INTO profile_record FROM public.profiles WHERE id = p_fornecedor_id;
      
      -- Verificar quais limites foram excedidos
      limite_diario_excedido := profile_record.candidaturas_diarias >= profile_record.limite_acessos_diarios;
      limite_mensal_excedido := profile_record.candidaturas_mensais >= profile_record.limite_acessos_mensais;
      
      -- Retornar mensagem específica baseada no limite excedido
      IF limite_diario_excedido AND limite_mensal_excedido THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'limit_exceeded',
          'message', 'Limites diário e mensal de candidaturas atingidos',
          'limite_diario', profile_record.limite_acessos_diarios,
          'candidaturas_hoje', profile_record.candidaturas_diarias,
          'limite_mensal', profile_record.limite_acessos_mensais,
          'candidaturas_mes', profile_record.candidaturas_mensais
        );
      ELSIF limite_diario_excedido THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'daily_limit_exceeded',
          'message', 'Limite diário de candidaturas atingido',
          'limite_diario', profile_record.limite_acessos_diarios,
          'candidaturas_hoje', profile_record.candidaturas_diarias,
          'limite_mensal', profile_record.limite_acessos_mensais,
          'candidaturas_mes', profile_record.candidaturas_mensais
        );
      ELSIF limite_mensal_excedido THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'monthly_limit_exceeded',
          'message', 'Limite mensal de candidaturas atingido',
          'limite_diario', profile_record.limite_acessos_diarios,
          'candidaturas_hoje', profile_record.candidaturas_diarias,
          'limite_mensal', profile_record.limite_acessos_mensais,
          'candidaturas_mes', profile_record.candidaturas_mensais
        );
      ELSE
        -- Fallback genérico (não deveria acontecer)
        RETURN jsonb_build_object(
          'success', false,
          'error', 'limit_exceeded',
          'message', 'Limite de candidaturas atingido',
          'limite_diario', profile_record.limite_acessos_diarios,
          'candidaturas_hoje', profile_record.candidaturas_diarias,
          'limite_mensal', profile_record.limite_acessos_mensais,
          'candidaturas_mes', profile_record.candidaturas_mensais
        );
      END IF;
    END IF;
  END IF;
  
  -- INSERÇÃO ATÔMICA: Inserir candidatura na tabela específica
  INSERT INTO public.candidaturas_fornecedores (
    orcamento_id,
    fornecedor_id,
    nome,
    email,
    telefone,
    empresa
  ) VALUES (
    p_orcamento_id,
    p_fornecedor_id,
    p_nome,
    p_email,
    p_telefone,
    p_empresa
  );
  
  -- Também inserir na tabela de inscrições (para manter compatibilidade)
  INSERT INTO public.inscricoes_fornecedores (
    orcamento_id,
    fornecedor_id,
    nome,
    email,
    telefone,
    empresa
  ) VALUES (
    p_orcamento_id,
    p_fornecedor_id,
    p_nome,
    p_email,
    p_telefone,
    p_empresa
  );
  
  -- APENAS AGORA incrementar contadores de candidatura após sucesso
  IF profile_record.tipo_usuario != 'admin' THEN
    PERFORM public.registrar_candidatura_bem_sucedida(p_fornecedor_id);
  END IF;
  
  -- Atualizar contador final e verificar se deve fechar o orçamento
  count_candidaturas := count_candidaturas + 1;
  
  -- Atualizar status do orçamento se atingiu o limite (3 candidatos)
  IF count_candidaturas >= 3 THEN
    UPDATE public.orcamentos
    SET status = 'fechado', updated_at = now()
    WHERE id = p_orcamento_id;
  END IF;
  
  -- Retornar sucesso
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Candidatura realizada com sucesso',
    'total_candidaturas', count_candidaturas
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Erro interno do sistema: ' || SQLERRM
    );
END;
$function$;

-- Migração de dados: resetar contadores de candidaturas para começar limpo
UPDATE public.profiles 
SET candidaturas_diarias = 0,
    candidaturas_mensais = 0,
    ultimo_acesso_candidatura_diario = CURRENT_DATE,
    ultimo_acesso_candidatura_mensal = CURRENT_DATE;

-- Corrigir problema específico do Reidner: ajustar limite diário para 10 (padrão)
UPDATE public.profiles 
SET limite_acessos_diarios = 10,
    candidaturas_diarias = 0
WHERE email = 'reidner@gmail.com';