-- Atualizar a função RPC processar_candidatura_fornecedor para chamar a Edge Function
CREATE OR REPLACE FUNCTION public.processar_candidatura_fornecedor(
  p_orcamento_id uuid,
  p_fornecedor_id uuid,
  p_nome text,
  p_email text,
  p_telefone text,
  p_empresa text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  fornecedor_record RECORD;
  penalidades_info JSONB;
  limite_info JSONB;
  candidatura_existente RECORD;
  inscricao_existente RECORD;
  candidatura_id UUID;
BEGIN
  -- Buscar dados do fornecedor
  SELECT * INTO fornecedor_record
  FROM public.profiles
  WHERE id = p_fornecedor_id;

  -- Verificar se o usuário existe e está ativo
  IF fornecedor_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Fornecedor não encontrado'
    );
  END IF;

  IF fornecedor_record.status != 'ativo' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Fornecedor não está ativo'
    );
  END IF;

  -- Verificar se já existe candidatura
  SELECT * INTO candidatura_existente
  FROM public.candidaturas_fornecedores
  WHERE orcamento_id = p_orcamento_id AND fornecedor_id = p_fornecedor_id;

  IF candidatura_existente IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_applied',
      'message', 'Você já se candidatou a este orçamento'
    );
  END IF;

  -- Verificar se já existe inscrição (tabela antiga)
  SELECT * INTO inscricao_existente
  FROM public.inscricoes_fornecedores
  WHERE orcamento_id = p_orcamento_id AND fornecedor_id = p_fornecedor_id;

  IF inscricao_existente IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_enrolled',
      'message', 'Você já está inscrito neste orçamento'
    );
  END IF;

  -- Verificar penalidades ativas
  penalidades_info := public.verificar_penalidades_ativas(p_fornecedor_id);
  
  IF (penalidades_info->>'tem_penalidades')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'penalized',
      'message', 'Você possui penalidades ativas que impedem novas candidaturas',
      'penalidades', penalidades_info
    );
  END IF;

  -- Verificar limite de propostas abertas
  limite_info := public.verificar_limite_propostas_fornecedor(p_fornecedor_id);
  
  IF NOT (limite_info->>'pode_candidatar')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'limit_exceeded',
      'message', limite_info->>'motivo',
      'limite_propostas', limite_info
    );
  END IF;

  -- Verificar limites de candidaturas (diário e mensal)
  -- Resetar contadores se necessário
  IF fornecedor_record.ultimo_acesso_candidatura_diario < CURRENT_DATE THEN
    UPDATE public.profiles 
    SET candidaturas_diarias = 0, ultimo_acesso_candidatura_diario = CURRENT_DATE
    WHERE id = p_fornecedor_id;
    fornecedor_record.candidaturas_diarias := 0;
  END IF;

  IF fornecedor_record.ultimo_acesso_candidatura_mensal < DATE_TRUNC('month', CURRENT_DATE) THEN
    UPDATE public.profiles 
    SET candidaturas_mensais = 0, ultimo_acesso_candidatura_mensal = CURRENT_DATE
    WHERE id = p_fornecedor_id;
    fornecedor_record.candidaturas_mensais := 0;
  END IF;

  -- Verificar limite diário
  IF fornecedor_record.candidaturas_diarias >= COALESCE(fornecedor_record.limite_acessos_diarios, 10) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'daily_limit_exceeded',
      'message', 'Limite diário de candidaturas atingido',
      'candidaturas_hoje', fornecedor_record.candidaturas_diarias,
      'limite_diario', COALESCE(fornecedor_record.limite_acessos_diarios, 10)
    );
  END IF;

  -- Verificar limite mensal
  IF fornecedor_record.candidaturas_mensais >= COALESCE(fornecedor_record.limite_acessos_mensais, 100) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'monthly_limit_exceeded',
      'message', 'Limite mensal de candidaturas atingido',
      'candidaturas_mes', fornecedor_record.candidaturas_mensais,
      'limite_mensal', COALESCE(fornecedor_record.limite_acessos_mensais, 100)
    );
  END IF;

  -- Inserir candidatura
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
    p_fornecedor_id,
    p_nome,
    p_email,
    p_telefone,
    p_empresa,
    NOW()
  ) RETURNING id INTO candidatura_id;

  -- Inserir na tabela de inscrições também (compatibilidade)
  INSERT INTO public.inscricoes_fornecedores (
    orcamento_id,
    fornecedor_id,
    nome,
    email,
    telefone,
    empresa,
    data_inscricao
  ) VALUES (
    p_orcamento_id,
    p_fornecedor_id,
    p_nome,
    p_email,
    p_telefone,
    p_empresa,
    NOW()
  );

  -- Atualizar contadores
  UPDATE public.profiles 
  SET 
    candidaturas_diarias = candidaturas_diarias + 1,
    candidaturas_mensais = candidaturas_mensais + 1,
    ultimo_acesso_candidatura_diario = CURRENT_DATE,
    ultimo_acesso_candidatura_mensal = CURRENT_DATE
  WHERE id = p_fornecedor_id;

  -- Chamar Edge Function para notificar Zapier (não bloquear em caso de erro)
  BEGIN
    PERFORM net.http_post(
      url := 'https://lbrkmidhipvlitpytmre.supabase.co/functions/v1/notify-fornecedor-inscricao',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxicmttaWRoaXB2bGl0cHl0bXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NTA3OTAsImV4cCI6MjA2NTMyNjc5MH0.zke2Hx3du3IaTKIpsXoODY2KceIbQCR9Zh_D7FuUy64'
      ),
      body := jsonb_build_object(
        'candidaturaId', candidatura_id,
        'fornecedorId', p_fornecedor_id,
        'orcamentoId', p_orcamento_id
      )
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log do erro mas não falha a operação principal
      INSERT INTO public.logs_acesso (user_id, acao)
      VALUES (p_fornecedor_id, 'erro_notificacao_zapier: ' || SQLERRM);
  END;

  -- Log da candidatura
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (p_fornecedor_id, 'candidatura_realizada: ' || p_orcamento_id::text);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Candidatura realizada com sucesso',
    'candidatura_id', candidatura_id
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