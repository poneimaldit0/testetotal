-- Criar função helper para obter data de São Paulo
CREATE OR REPLACE FUNCTION current_date_sao_paulo()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
$$;

-- Atualizar função de candidatura para usar timezone de São Paulo
CREATE OR REPLACE FUNCTION processar_candidatura_fornecedor(
  p_orcamento_id uuid,
  p_nome text,
  p_email text,
  p_telefone text,
  p_empresa text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_candidaturas_hoje integer;
  v_candidaturas_mes integer;
  v_limite_diario integer;
  v_limite_mensal integer;
  v_fornecedor_id uuid;
  v_inscricao_exists boolean;
BEGIN
  -- Obter o ID do usuário autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Usuário não autenticado'
    );
  END IF;

  -- Buscar limites do fornecedor
  SELECT limite_candidaturas_dia, limite_candidaturas_mes
  INTO v_limite_diario, v_limite_mensal
  FROM fornecedores
  WHERE user_id = v_user_id;

  -- Se não houver limites, usar padrões
  v_limite_diario := COALESCE(v_limite_diario, 5);
  v_limite_mensal := COALESCE(v_limite_mensal, 30);

  -- Verificar se já existe candidatura usando timezone de São Paulo
  SELECT COUNT(*) > 0
  INTO v_inscricao_exists
  FROM candidaturas_fornecedores
  WHERE orcamento_id = p_orcamento_id 
    AND user_id = v_user_id
    AND desistiu = false;

  IF v_inscricao_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_applied',
      'message', 'Você já se candidatou a este orçamento'
    );
  END IF;

  -- Contar candidaturas do dia (usando timezone de São Paulo)
  SELECT COUNT(*)
  INTO v_candidaturas_hoje
  FROM candidaturas_fornecedores
  WHERE user_id = v_user_id
    AND (data_candidatura AT TIME ZONE 'America/Sao_Paulo')::date = current_date_sao_paulo()
    AND desistiu = false;

  -- Contar candidaturas do mês (usando timezone de São Paulo)
  SELECT COUNT(*)
  INTO v_candidaturas_mes
  FROM candidaturas_fornecedores
  WHERE user_id = v_user_id
    AND EXTRACT(YEAR FROM (data_candidatura AT TIME ZONE 'America/Sao_Paulo')) = EXTRACT(YEAR FROM current_date_sao_paulo())
    AND EXTRACT(MONTH FROM (data_candidatura AT TIME ZONE 'America/Sao_Paulo')) = EXTRACT(MONTH FROM current_date_sao_paulo())
    AND desistiu = false;

  -- Verificar limites
  IF v_candidaturas_hoje >= v_limite_diario AND v_candidaturas_mes >= v_limite_mensal THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'limit_exceeded',
      'message', 'Limites diário e mensal excedidos',
      'candidaturas_hoje', v_candidaturas_hoje,
      'candidaturas_mes', v_candidaturas_mes,
      'limite_diario', v_limite_diario,
      'limite_mensal', v_limite_mensal
    );
  END IF;

  IF v_candidaturas_hoje >= v_limite_diario THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'daily_limit_exceeded',
      'message', 'Limite diário de candidaturas excedido',
      'candidaturas_hoje', v_candidaturas_hoje,
      'limite_diario', v_limite_diario
    );
  END IF;

  IF v_candidaturas_mes >= v_limite_mensal THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'monthly_limit_exceeded',
      'message', 'Limite mensal de candidaturas excedido',
      'candidaturas_mes', v_candidaturas_mes,
      'limite_mensal', v_limite_mensal
    );
  END IF;

  -- Inserir candidatura
  INSERT INTO candidaturas_fornecedores (
    orcamento_id,
    user_id,
    nome,
    email,
    telefone,
    empresa,
    data_candidatura
  )
  VALUES (
    p_orcamento_id,
    v_user_id,
    p_nome,
    p_email,
    p_telefone,
    p_empresa,
    NOW()
  )
  RETURNING id INTO v_fornecedor_id;

  -- Inserir na tabela fornecedores_orcamento
  INSERT INTO fornecedores_orcamento (
    orcamento_id,
    nome,
    email,
    telefone,
    empresa,
    data_inscricao
  )
  VALUES (
    p_orcamento_id,
    p_nome,
    p_email,
    p_telefone,
    p_empresa,
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Candidatura realizada com sucesso',
    'fornecedor_id', v_fornecedor_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', SQLERRM
    );
END;
$$;