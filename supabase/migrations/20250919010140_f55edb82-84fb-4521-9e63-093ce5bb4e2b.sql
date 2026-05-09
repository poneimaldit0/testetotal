-- Primeiro, vamos resolver a situação atual criando uma nova conta para o cliente
-- e separando-o do fornecedor

-- 1. Criar uma nova conta Auth para o cliente (será feito via função)
-- 2. Atualizar a referência do cliente para usar a nova conta
-- 3. Restaurar a conta do fornecedor

-- Para isso, vamos criar uma função que corrige a situação atual
CREATE OR REPLACE FUNCTION corrigir_situacao_cliente_fornecedor()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cliente_record RECORD;
  fornecedor_record RECORD;
  novo_auth_user_id UUID;
  senha_temporaria_cliente TEXT;
  senha_temporaria_fornecedor TEXT;
BEGIN
  -- Verificar se é admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Apenas administradores podem executar esta correção'
    );
  END IF;

  -- Buscar o cliente que está com problema (usando o auth_user_id do fornecedor)
  SELECT * INTO cliente_record
  FROM public.clientes
  WHERE email = 'financeiro@reforma100.com.br'
    AND auth_user_id = 'b68971d0-b5af-4b57-9ce8-73e29bac71e0'
  LIMIT 1;

  IF cliente_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'cliente_nao_encontrado',
      'message', 'Cliente com problema não foi encontrado'
    );
  END IF;

  -- Buscar o fornecedor que teve sua conta comprometida
  SELECT * INTO fornecedor_record
  FROM public.profiles
  WHERE id = 'b68971d0-b5af-4b57-9ce8-73e29bac71e0'
    AND tipo_usuario = 'fornecedor'
  LIMIT 1;

  IF fornecedor_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'fornecedor_nao_encontrado',
      'message', 'Fornecedor comprometido não foi encontrado'
    );
  END IF;

  -- Por enquanto, apenas atualizamos o auth_user_id do cliente para NULL
  -- para desassociar ele do fornecedor
  UPDATE public.clientes
  SET auth_user_id = NULL,
      updated_at = now()
  WHERE id = cliente_record.id;

  -- Log da operação
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (
    auth.uid(),
    'corrigir_situacao_cliente_fornecedor: desassociado cliente ' || cliente_record.id || ' do fornecedor ' || fornecedor_record.id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Situação corrigida: cliente desassociado do fornecedor',
    'cliente_id', cliente_record.id,
    'fornecedor_id', fornecedor_record.id,
    'cliente_email', cliente_record.email,
    'fornecedor_email', fornecedor_record.email,
    'proximo_passo', 'Criar nova conta Auth para o cliente através da Edge Function'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Erro interno: ' || SQLERRM
    );
END;
$$;

-- Função para recriar conta do cliente com email correto
CREATE OR REPLACE FUNCTION recriar_conta_cliente(p_cliente_id UUID, p_novo_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cliente_record RECORD;
BEGIN
  -- Verificar se é admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Apenas administradores podem executar esta operação'
    );
  END IF;

  -- Buscar o cliente
  SELECT * INTO cliente_record
  FROM public.clientes
  WHERE id = p_cliente_id;

  IF cliente_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'cliente_nao_encontrado',
      'message', 'Cliente não encontrado'
    );
  END IF;

  -- Atualizar o email do cliente na tabela (se necessário)
  IF cliente_record.email != p_novo_email THEN
    UPDATE public.clientes
    SET email = p_novo_email,
        updated_at = now()
    WHERE id = p_cliente_id;
  END IF;

  -- Log da operação
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (
    auth.uid(),
    'recriar_conta_cliente: preparado cliente ' || p_cliente_id || ' com email ' || p_novo_email
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Cliente preparado para recriação de conta',
    'cliente_id', p_cliente_id,
    'novo_email', p_novo_email
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Erro interno: ' || SQLERRM
    );
END;
$$;