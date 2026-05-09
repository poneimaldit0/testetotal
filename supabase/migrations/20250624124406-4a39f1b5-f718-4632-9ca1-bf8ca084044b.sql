
-- 1. Ativar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Criar função para reset automático dos contadores diários
CREATE OR REPLACE FUNCTION public.reset_contadores_diarios()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reset contadores diários para todos os usuários às 00:00
  UPDATE public.profiles 
  SET acessos_diarios = 0,
      ultimo_acesso_diario = CURRENT_DATE
  WHERE ultimo_acesso_diario < CURRENT_DATE OR ultimo_acesso_diario IS NULL;
  
  -- Log da operação
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (NULL, 'reset_contadores_diarios_automatico');
END;
$$;

-- 3. Criar função separada para registrar acesso bem-sucedido
CREATE OR REPLACE FUNCTION public.registrar_acesso_bem_sucedido(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- 4. Corrigir função verificar_limite_acesso para NÃO incrementar contadores
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
  IF profile_record.ultimo_acesso_diario < CURRENT_DATE THEN
    UPDATE public.profiles 
    SET acessos_diarios = 0, ultimo_acesso_diario = CURRENT_DATE
    WHERE id = user_id;
    -- Recarregar dados após reset
    SELECT * INTO profile_record FROM public.profiles WHERE id = user_id;
  END IF;
  
  IF DATE_TRUNC('month', profile_record.ultimo_acesso_mensal) < DATE_TRUNC('month', CURRENT_DATE) THEN
    UPDATE public.profiles 
    SET acessos_mensais = 0, ultimo_acesso_mensal = CURRENT_DATE
    WHERE id = user_id;
    -- Recarregar dados após reset
    SELECT * INTO profile_record FROM public.profiles WHERE id = user_id;
  END IF;
  
  -- APENAS verificar limites, SEM incrementar
  IF profile_record.acessos_diarios >= profile_record.limite_acessos_diarios OR 
     profile_record.acessos_mensais >= profile_record.limite_acessos_mensais THEN
    RETURN FALSE;
  END IF;
  
  -- Se chegou até aqui, acesso permitido (mas ainda não incrementado)
  RETURN TRUE;
END;
$$;

-- 5. Atualizar função processar_candidatura_fornecedor para usar nova lógica
CREATE OR REPLACE FUNCTION public.processar_candidatura_fornecedor(p_orcamento_id uuid, p_fornecedor_id uuid, p_nome text, p_email text, p_telefone text, p_empresa text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  limite_ok BOOLEAN;
  profile_record RECORD;
  candidatura_existente RECORD;
  count_candidaturas INTEGER;
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
  
  -- Obter dados do perfil
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE id = p_fornecedor_id;
  
  -- Verificar limite de acesso (admins não têm limites)
  IF profile_record.tipo_usuario = 'admin' THEN
    limite_ok := true;
  ELSE
    SELECT public.verificar_limite_acesso(p_fornecedor_id) INTO limite_ok;
  END IF;
  
  -- Se limite foi excedido, retornar erro SEM incrementar contadores
  IF NOT limite_ok THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'limit_exceeded',
      'message', 'Limite diário de candidaturas atingido',
      'limite_diario', profile_record.limite_acessos_diarios,
      'acessos_hoje', profile_record.acessos_diarios
    );
  END IF;
  
  -- Inserir candidatura na tabela específica
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
  
  -- APENAS AGORA incrementar contadores após sucesso
  IF profile_record.tipo_usuario != 'admin' THEN
    PERFORM public.registrar_acesso_bem_sucedido(p_fornecedor_id);
  END IF;
  
  -- Contar total de candidaturas no orçamento
  SELECT COUNT(*) INTO count_candidaturas
  FROM public.candidaturas_fornecedores
  WHERE orcamento_id = p_orcamento_id;
  
  -- Atualizar status do orçamento se atingiu o limite (3 candidatos)
  IF count_candidaturas >= 3 THEN
    UPDATE public.orcamentos
    SET status = 'fechado'
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
$$;

-- 6. Atualizar função inscrever_fornecedor_com_limite com mesma lógica
CREATE OR REPLACE FUNCTION public.inscrever_fornecedor_com_limite(p_orcamento_id uuid, p_fornecedor_id uuid, p_nome text, p_email text, p_telefone text, p_empresa text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  limite_ok boolean;
  profile_record RECORD;
  inscricao_existente RECORD;
  count_inscricoes integer;
  result jsonb;
BEGIN
  -- Verificar se já está inscrito
  SELECT * INTO inscricao_existente
  FROM public.inscricoes_fornecedores
  WHERE orcamento_id = p_orcamento_id 
    AND email = p_email;
  
  IF inscricao_existente IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_enrolled',
      'message', 'Você já está inscrito neste orçamento'
    );
  END IF;
  
  -- Obter dados do perfil
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE id = p_fornecedor_id;
  
  -- Admins não têm limites
  IF profile_record.tipo_usuario = 'admin' THEN
    limite_ok := true;
  ELSE
    -- Verificar limite de acesso para fornecedores
    SELECT public.verificar_limite_acesso(p_fornecedor_id) INTO limite_ok;
  END IF;
  
  -- Se limite foi excedido, retornar erro SEM incrementar
  IF NOT limite_ok THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'limit_exceeded',
      'message', 'Limite diário de inscrições atingido',
      'limite_diario', profile_record.limite_acessos_diarios,
      'acessos_hoje', profile_record.acessos_diarios
    );
  END IF;
  
  -- Inserir inscrição
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
  
  -- APENAS AGORA incrementar contadores após sucesso
  IF profile_record.tipo_usuario != 'admin' THEN
    PERFORM public.registrar_acesso_bem_sucedido(p_fornecedor_id);
  END IF;
  
  -- Contar total de inscrições no orçamento
  SELECT COUNT(*) INTO count_inscricoes
  FROM public.inscricoes_fornecedores
  WHERE orcamento_id = p_orcamento_id;
  
  -- Atualizar status do orçamento se necessário
  IF count_inscricoes >= 3 THEN
    UPDATE public.orcamentos
    SET status = 'fechado'
    WHERE id = p_orcamento_id;
  END IF;
  
  -- Retornar sucesso
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Inscrição realizada com sucesso',
    'total_inscricoes', count_inscricoes
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Erro interno do sistema: ' || SQLERRM
    );
END;
$$;

-- 7. Limpar dados inconsistentes dos usuários
UPDATE public.profiles 
SET acessos_diarios = 0,
    ultimo_acesso_diario = CURRENT_DATE
WHERE ultimo_acesso_diario IS NULL 
   OR ultimo_acesso_diario < CURRENT_DATE;

-- 8. Configurar cron job para executar reset às 00:00 todos os dias
SELECT cron.schedule(
  'reset-contadores-diarios',
  '0 0 * * *', -- Executa às 00:00 todos os dias
  $$
  SELECT public.reset_contadores_diarios();
  $$
);
