-- Atualizar função RPC para permitir revisão de propostas finalizadas
CREATE OR REPLACE FUNCTION public.solicitar_revisao_proposta(
  p_token_acesso TEXT,
  p_checklist_proposta_id UUID,
  p_cliente_email TEXT,
  p_motivo_revisao TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token_record RECORD;
  v_proposta_record RECORD;
  v_orcamento_record RECORD;
  v_candidatura_record RECORD;
  v_revisao_id UUID;
BEGIN
  -- Log da tentativa de revisão
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (
    NULL, 
    'tentativa_revisao_proposta: token=' || SUBSTRING(p_token_acesso, 1, 8) || 
    '... proposta_id=' || p_checklist_proposta_id::text ||
    ' email=' || p_cliente_email
  );

  -- 1. Validar token de acesso
  SELECT * INTO v_token_record
  FROM public.tokens_comparacao_cliente
  WHERE token_acesso = p_token_acesso
    AND expires_at > NOW()
    AND NOT usado;
    
  IF v_token_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'token_invalido',
      'message', 'Token de acesso inválido ou expirado'
    );
  END IF;

  -- 2. Buscar dados da proposta (checklist_propostas)
  SELECT 
    cp.*,
    cf.orcamento_id,
    cf.fornecedor_id
  INTO v_proposta_record
  FROM public.checklist_propostas cp
  JOIN public.candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
  WHERE cp.id = p_checklist_proposta_id;
  
  IF v_proposta_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'proposta_nao_encontrada',
      'message', 'Proposta não encontrada. ID: ' || p_checklist_proposta_id::text
    );
  END IF;

  -- 3. Verificar se a proposta pertence ao orçamento do token
  IF v_proposta_record.orcamento_id != v_token_record.orcamento_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'proposta_orcamento_incompativel',
      'message', 'Esta proposta não pertence ao orçamento autorizado pelo token'
    );
  END IF;

  -- 4. Verificar se a proposta está em status válido para revisão
  -- IMPORTANTE: Agora permitimos revisão de propostas "enviado" E "finalizada"
  IF v_proposta_record.status NOT IN ('enviado', 'finalizada') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'status_invalido',
      'message', 'Propostas com status "' || v_proposta_record.status || '" não podem ser revisadas. Apenas propostas enviadas ou finalizadas podem ser revisadas.'
    );
  END IF;

  -- 5. Verificar se já existe revisão pendente para esta proposta
  IF EXISTS (
    SELECT 1 FROM public.revisoes_propostas_clientes 
    WHERE checklist_proposta_id = p_checklist_proposta_id 
      AND status IN ('pendente', 'em_andamento')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'revisao_ja_existe',
      'message', 'Já existe uma solicitação de revisão pendente para esta proposta'
    );
  END IF;

  -- 6. Criar solicitação de revisão
  INSERT INTO public.revisoes_propostas_clientes (
    checklist_proposta_id,
    cliente_temp_email,
    motivo_revisao,
    status
  ) VALUES (
    p_checklist_proposta_id,
    p_cliente_email,
    p_motivo_revisao,
    'pendente'
  ) RETURNING id INTO v_revisao_id;

  -- 7. Atualizar status da proposta para "em_revisao"
  UPDATE public.checklist_propostas
  SET status = 'em_revisao',
      updated_at = NOW()
  WHERE id = p_checklist_proposta_id;

  -- 8. Criar notificação para o fornecedor
  INSERT INTO public.notificacoes_sistema (
    usuario_id,
    tipo,
    titulo,
    mensagem,
    tipo_referencia,
    referencia_id,
    dados_extras
  ) VALUES (
    v_proposta_record.fornecedor_id,
    'revisao_solicitada',
    'Revisão Solicitada',
    'Um cliente solicitou revisão da sua proposta. Motivo: ' || p_motivo_revisao,
    'revisao_proposta',
    v_revisao_id,
    jsonb_build_object(
      'checklist_proposta_id', p_checklist_proposta_id,
      'cliente_email', p_cliente_email,
      'motivo_revisao', p_motivo_revisao
    )
  );

  -- 9. Log de sucesso
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (
    NULL, 
    'revisao_proposta_criada: revisao_id=' || v_revisao_id::text || 
    ' proposta_id=' || p_checklist_proposta_id::text ||
    ' fornecedor=' || v_proposta_record.fornecedor_id::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Solicitação de revisão enviada com sucesso',
    'revisao_id', v_revisao_id,
    'status_anterior', v_proposta_record.status
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro
    INSERT INTO public.logs_acesso (user_id, acao)
    VALUES (
      NULL, 
      'erro_revisao_proposta: ' || SQLERRM || 
      ' proposta_id=' || COALESCE(p_checklist_proposta_id::text, 'NULL')
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'erro_interno',
      'message', 'Erro interno do sistema. Tente novamente em alguns instantes.'
    );
END;
$$;