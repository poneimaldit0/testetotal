
-- Atualizar função processar_candidatura_fornecedor para retornar mensagens específicas de limite
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
  
  -- Obter dados do perfil
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE id = p_fornecedor_id;
  
  -- Verificar limite de acesso (admins não têm limites)
  IF profile_record.tipo_usuario = 'admin' THEN
    limite_ok := true;
  ELSE
    SELECT public.verificar_limite_acesso(p_fornecedor_id) INTO limite_ok;
    
    -- Se limite foi excedido, verificar qual limite especificamente
    IF NOT limite_ok THEN
      -- Recarregar dados do perfil após possível reset na função verificar_limite_acesso
      SELECT * INTO profile_record FROM public.profiles WHERE id = p_fornecedor_id;
      
      -- Verificar quais limites foram excedidos
      limite_diario_excedido := profile_record.acessos_diarios >= profile_record.limite_acessos_diarios;
      limite_mensal_excedido := profile_record.acessos_mensais >= profile_record.limite_acessos_mensais;
      
      -- Retornar mensagem específica baseada no limite excedido
      IF limite_diario_excedido AND limite_mensal_excedido THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'limit_exceeded',
          'message', 'Limites diário e mensal de candidaturas atingidos',
          'limite_diario', profile_record.limite_acessos_diarios,
          'acessos_hoje', profile_record.acessos_diarios,
          'limite_mensal', profile_record.limite_acessos_mensais,
          'acessos_mes', profile_record.acessos_mensais
        );
      ELSIF limite_diario_excedido THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'daily_limit_exceeded',
          'message', 'Limite diário de candidaturas atingido',
          'limite_diario', profile_record.limite_acessos_diarios,
          'acessos_hoje', profile_record.acessos_diarios,
          'limite_mensal', profile_record.limite_acessos_mensais,
          'acessos_mes', profile_record.acessos_mensais
        );
      ELSIF limite_mensal_excedido THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'monthly_limit_exceeded',
          'message', 'Limite mensal de candidaturas atingido',
          'limite_diario', profile_record.limite_acessos_diarios,
          'acessos_hoje', profile_record.acessos_diarios,
          'limite_mensal', profile_record.limite_acessos_mensais,
          'acessos_mes', profile_record.acessos_mensais
        );
      ELSE
        -- Fallback genérico (não deveria acontecer)
        RETURN jsonb_build_object(
          'success', false,
          'error', 'limit_exceeded',
          'message', 'Limite de candidaturas atingido',
          'limite_diario', profile_record.limite_acessos_diarios,
          'acessos_hoje', profile_record.acessos_diarios,
          'limite_mensal', profile_record.limite_acessos_mensais,
          'acessos_mes', profile_record.acessos_mensais
        );
      END IF;
    END IF;
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

-- Atualizar função inscrever_fornecedor_com_limite com mesma lógica
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
  limite_diario_excedido BOOLEAN;
  limite_mensal_excedido BOOLEAN;
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
    
    -- Se limite foi excedido, verificar qual limite especificamente
    IF NOT limite_ok THEN
      -- Recarregar dados do perfil após possível reset na função verificar_limite_acesso
      SELECT * INTO profile_record FROM public.profiles WHERE id = p_fornecedor_id;
      
      -- Verificar quais limites foram excedidos
      limite_diario_excedido := profile_record.acessos_diarios >= profile_record.limite_acessos_diarios;
      limite_mensal_excedido := profile_record.acessos_mensais >= profile_record.limite_acessos_mensais;
      
      -- Retornar mensagem específica baseada no limite excedido
      IF limite_diario_excedido AND limite_mensal_excedido THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'limit_exceeded',
          'message', 'Limites diário e mensal de inscrições atingidos',
          'limite_diario', profile_record.limite_acessos_diarios,
          'acessos_hoje', profile_record.acessos_diarios,
          'limite_mensal', profile_record.limite_acessos_mensais,
          'acessos_mes', profile_record.acessos_mensais
        );
      ELSIF limite_diario_excedido THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'daily_limit_exceeded',
          'message', 'Limite diário de inscrições atingido',
          'limite_diario', profile_record.limite_acessos_diarios,
          'acessos_hoje', profile_record.acessos_diarios,
          'limite_mensal', profile_record.limite_acessos_mensais,
          'acessos_mes', profile_record.acessos_mensais
        );
      ELSIF limite_mensal_excedido THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'monthly_limit_exceeded',
          'message', 'Limite mensal de inscrições atingido',
          'limite_diario', profile_record.limite_acessos_diarios,
          'acessos_hoje', profile_record.acessos_diarios,
          'limite_mensal', profile_record.limite_acessos_mensais,
          'acessos_mes', profile_record.acessos_mensais
        );
      ELSE
        -- Fallback genérico (não deveria acontecer)
        RETURN jsonb_build_object(
          'success', false,
          'error', 'limit_exceeded',
          'message', 'Limite de inscrições atingido',
          'limite_diario', profile_record.limite_acessos_diarios,
          'acessos_hoje', profile_record.acessos_diarios,
          'limite_mensal', profile_record.limite_acessos_mensais,
          'acessos_mes', profile_record.acessos_mensais
        );
      END IF;
    END IF;
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
