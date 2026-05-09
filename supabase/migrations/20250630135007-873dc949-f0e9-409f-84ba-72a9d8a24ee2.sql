
-- Adicionar status 'pendente_aprovacao' e 'rejeitado' às opções válidas
-- Atualizar a função handle_new_user para criar usuários com status pendente por padrão
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    nome,
    tipo_usuario,
    status,
    data_criacao,
    limite_acessos_diarios,
    limite_acessos_mensais
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', 'fornecedor'),
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', 'fornecedor') = 'fornecedor' THEN 'pendente_aprovacao'
      ELSE 'ativo'
    END,
    NOW(),
    10,
    100
  );
  RETURN NEW;
END;
$$;

-- Função para aprovar fornecedor com dados de contrato
CREATE OR REPLACE FUNCTION public.aprovar_fornecedor_admin(
  p_user_id uuid,
  p_data_termino_contrato date,
  p_limite_acessos_diarios integer,
  p_limite_acessos_mensais integer,
  p_observacoes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Apenas administradores podem aprovar fornecedores'
    );
  END IF;
  
  -- Verificar se o usuário existe e está pendente
  SELECT * INTO user_record
  FROM public.profiles
  WHERE id = p_user_id AND status = 'pendente_aprovacao';
  
  IF user_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Usuário não encontrado ou não está pendente de aprovação'
    );
  END IF;
  
  -- Aprovar o usuário
  UPDATE public.profiles
  SET 
    status = 'ativo',
    data_termino_contrato = p_data_termino_contrato,
    limite_acessos_diarios = p_limite_acessos_diarios,
    limite_acessos_mensais = p_limite_acessos_mensais,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Registrar log da aprovação
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (
    auth.uid(), 
    'aprovacao_fornecedor: ' || p_user_id::text || ' (' || user_record.email || ')'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Fornecedor aprovado com sucesso',
    'user_id', p_user_id,
    'email', user_record.email
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

-- Função para rejeitar fornecedor
CREATE OR REPLACE FUNCTION public.rejeitar_fornecedor_admin(
  p_user_id uuid,
  p_motivo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Apenas administradores podem rejeitar fornecedores'
    );
  END IF;
  
  -- Verificar se o usuário existe e está pendente
  SELECT * INTO user_record
  FROM public.profiles
  WHERE id = p_user_id AND status = 'pendente_aprovacao';
  
  IF user_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Usuário não encontrado ou não está pendente de aprovação'
    );
  END IF;
  
  -- Registrar log da rejeição antes de excluir
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (
    auth.uid(), 
    'rejeicao_fornecedor: ' || p_user_id::text || ' (' || user_record.email || ') - Motivo: ' || COALESCE(p_motivo, 'Não informado')
  );
  
  -- Excluir o usuário (cascade delete no auth.users)
  DELETE FROM public.profiles WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Fornecedor rejeitado e removido do sistema',
    'user_id', p_user_id,
    'email', user_record.email
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

-- Função para obter cadastros pendentes
CREATE OR REPLACE FUNCTION public.obter_cadastros_pendentes()
RETURNS TABLE(
  id uuid,
  email text,
  nome text,
  telefone text,
  empresa text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.email,
    p.nome,
    p.telefone,
    p.empresa,
    p.created_at
  FROM public.profiles p
  WHERE p.status = 'pendente_aprovacao'
    AND public.is_admin()
  ORDER BY p.created_at DESC;
$$;
