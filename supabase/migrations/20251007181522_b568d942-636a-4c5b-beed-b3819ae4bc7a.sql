-- Corrigir função processar_candidatura_fornecedor
-- Mudar de SECURITY DEFINER para SECURITY INVOKER para permitir que RLS funcione corretamente

DROP FUNCTION IF EXISTS public.processar_candidatura_fornecedor(uuid, text, text, text, text);

CREATE OR REPLACE FUNCTION public.processar_candidatura_fornecedor(
  p_orcamento_id uuid, 
  p_nome text, 
  p_email text, 
  p_telefone text, 
  p_empresa text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER  -- Mudado de SECURITY DEFINER para SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  user_record RECORD;
  orcamento_record RECORD;
  candidatos_atuais INTEGER;
  candidatura_id UUID;
  limite_verificacao JSONB;
  penalidades_ativas JSONB;
BEGIN
  -- Verificar se usuário está autenticado
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Usuário não autenticado'
    );
  END IF;
  
  -- Buscar dados do fornecedor
  SELECT * INTO user_record
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF user_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'user_not_found',
      'message', 'Usuário não encontrado'
    );
  END IF;
  
  -- Verificar se é fornecedor
  IF user_record.tipo_usuario != 'fornecedor' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_fornecedor',
      'message', 'Apenas fornecedores podem se candidatar'
    );
  END IF;
  
  -- Verificar se fornecedor está ativo
  IF user_record.status != 'ativo' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'inactive_user',
      'message', 'Fornecedor não está ativo'
    );
  END IF;
  
  -- 🔒 LOCK PESSIMISTA: Prevenir race condition
  SELECT * INTO orcamento_record
  FROM public.orcamentos
  WHERE id = p_orcamento_id
  FOR UPDATE;
  
  IF orcamento_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'budget_not_found',
      'message', 'Orçamento não encontrado'
    );
  END IF;
  
  IF orcamento_record.status != 'aberto' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'budget_closed',
      'message', 'Este orçamento já foi fechado para novas candidaturas'
    );
  END IF;
  
  -- Verificar se já se candidatou
  IF EXISTS (
    SELECT 1 FROM public.candidaturas_fornecedores
    WHERE orcamento_id = p_orcamento_id 
    AND fornecedor_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_applied',
      'message', 'Você já se candidatou a este orçamento'
    );
  END IF;
  
  -- Contar candidatos atuais
  SELECT COUNT(*) INTO candidatos_atuais
  FROM public.candidaturas_fornecedores
  WHERE orcamento_id = p_orcamento_id
    AND data_desistencia IS NULL;
  
  IF candidatos_atuais >= 3 THEN
    UPDATE public.orcamentos
    SET status = 'fechado',
        updated_at = now()
    WHERE id = p_orcamento_id;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'limit_exceeded',
      'message', 'Este orçamento já atingiu o limite máximo de 3 candidatos',
      'candidatos_atual', candidatos_atuais
    );
  END IF;
  
  -- Verificar penalidades ativas
  penalidades_ativas := public.verificar_penalidades_ativas(auth.uid());
  
  IF (penalidades_ativas->>'tem_penalidades')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'has_penalties',
      'message', 'Você possui penalidades ativas que impedem candidaturas',
      'penalidades', penalidades_ativas
    );
  END IF;
  
  -- Verificar limite de propostas abertas
  limite_verificacao := public.verificar_limite_propostas_fornecedor(auth.uid());
  
  IF NOT (limite_verificacao->>'pode_candidatar')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'proposal_limit',
      'message', limite_verificacao->>'motivo',
      'limite_info', limite_verificacao
    );
  END IF;
  
  -- Verificar limites diários e mensais
  IF user_record.limite_acessos_diarios IS NOT NULL AND 
     user_record.acessos_diarios >= user_record.limite_acessos_diarios THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'daily_limit_exceeded',
      'message', 'Limite diário de candidaturas atingido',
      'limite_diario', user_record.limite_acessos_diarios,
      'candidaturas_hoje', user_record.acessos_diarios
    );
  END IF;
  
  IF user_record.limite_acessos_mensais IS NOT NULL AND 
     user_record.acessos_mensais >= user_record.limite_acessos_mensais THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'monthly_limit_exceeded',
      'message', 'Limite mensal de candidaturas atingido',
      'limite_mensal', user_record.limite_acessos_mensais,
      'candidaturas_mes', user_record.acessos_mensais
    );
  END IF;
  
  -- Inserir candidatura (agora auth.uid() estará disponível para RLS)
  INSERT INTO public.candidaturas_fornecedores (
    orcamento_id,
    fornecedor_id,
    nome,
    email,
    telefone,
    empresa,
    data_candidatura
  ) VALUES (
    p_orcamento_id,
    auth.uid(),
    p_nome,
    p_email,
    p_telefone,
    p_empresa,
    now()
  ) RETURNING id INTO candidatura_id;
  
  -- Atualizar contadores
  UPDATE public.profiles
  SET acessos_diarios = acessos_diarios + 1,
      acessos_mensais = acessos_mensais + 1,
      ultimo_login = now()
  WHERE id = auth.uid();
  
  -- Log da candidatura
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (auth.uid(), 'candidatura_orcamento: ' || p_orcamento_id::text);
  
  RETURN jsonb_build_object(
    'success', true,
    'candidatura_id', candidatura_id,
    'message', 'Candidatura realizada com sucesso'
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