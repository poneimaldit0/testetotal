-- Corrigir função aprovar_fornecedor_admin com nomes de colunas corretos
DROP FUNCTION IF EXISTS public.aprovar_fornecedor_admin(UUID, DATE, INTEGER, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.aprovar_fornecedor_admin(
  p_user_id UUID,
  p_data_termino_contrato DATE,
  p_limite_acessos_diarios INTEGER DEFAULT 20,
  p_limite_acessos_mensais INTEGER DEFAULT 400,
  p_observacoes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_nome TEXT;
BEGIN
  -- Verificar se o usuário que está executando é admin, master ou customer_success
  IF NOT public.can_manage_suppliers() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Apenas administradores, masters e customer success podem aprovar fornecedores');
  END IF;

  -- Obter informações do usuário a ser aprovado
  SELECT email, nome INTO v_email, v_nome
  FROM profiles
  WHERE id = p_user_id;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Usuário não encontrado');
  END IF;

  -- Atualizar o perfil do usuário (usando colunas corretas: tipo_usuario e status)
  UPDATE profiles
  SET 
    tipo_usuario = 'fornecedor',
    status = 'ativo',
    data_termino_contrato = p_data_termino_contrato,
    limite_acessos_diarios = p_limite_acessos_diarios,
    limite_acessos_mensais = p_limite_acessos_mensais,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Fornecedor aprovado com sucesso',
    'user_id', p_user_id,
    'email', v_email
  );
END;
$$;

-- Corrigir função rejeitar_fornecedor_admin
DROP FUNCTION IF EXISTS public.rejeitar_fornecedor_admin(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.rejeitar_fornecedor_admin(
  p_user_id UUID,
  p_motivo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  -- Verificar se o usuário que está executando é admin, master ou customer_success
  IF NOT public.can_manage_suppliers() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Apenas administradores, masters e customer success podem rejeitar fornecedores');
  END IF;

  -- Obter email do usuário
  SELECT email INTO v_email
  FROM profiles
  WHERE id = p_user_id;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Usuário não encontrado');
  END IF;

  -- Remover o perfil
  DELETE FROM profiles WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Fornecedor rejeitado e removido',
    'email', v_email
  );
END;
$$;

-- Corrigir função obter_cadastros_pendentes (usando tipo_usuario ao invés de role)
DROP FUNCTION IF EXISTS public.obter_cadastros_pendentes();

CREATE OR REPLACE FUNCTION public.obter_cadastros_pendentes()
RETURNS TABLE (
  id UUID,
  email TEXT,
  nome TEXT,
  telefone TEXT,
  empresa TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário é admin, master ou customer_success
  IF NOT public.can_manage_suppliers() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.nome,
    p.telefone,
    p.empresa,
    p.created_at
  FROM profiles p
  WHERE p.tipo_usuario = 'pendente'
  ORDER BY p.created_at DESC;
END;
$$;