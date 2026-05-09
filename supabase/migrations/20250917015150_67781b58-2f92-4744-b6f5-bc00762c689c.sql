-- Criar função RPC para solicitar revisão de proposta com notificação
CREATE OR REPLACE FUNCTION public.solicitar_revisao_proposta(
  p_token_acesso text,
  p_checklist_proposta_id uuid,
  p_cliente_email text,
  p_motivo_revisao text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  token_record RECORD;
  proposta_record RECORD;
  fornecedor_record RECORD;
  revisao_id uuid;
BEGIN
  -- Validar token de acesso
  SELECT * INTO token_record
  FROM public.tokens_comparacao_cliente
  WHERE token_acesso = p_token_acesso
    AND expires_at > NOW()
    AND NOT usado;
    
  IF token_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'token_invalido',
      'message', 'Token inválido ou expirado'
    );
  END IF;
  
  -- Buscar proposta e validar se pertence ao orçamento do token
  SELECT 
    cp.*,
    cf.fornecedor_id,
    cf.orcamento_id
  INTO proposta_record
  FROM public.checklist_propostas cp
  JOIN public.candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
  WHERE cp.id = p_checklist_proposta_id
    AND cf.orcamento_id = token_record.orcamento_id;
    
  IF proposta_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'proposta_nao_encontrada',
      'message', 'Proposta não encontrada ou não pertence ao orçamento'
    );
  END IF;
  
  -- Verificar se proposta está em status válido para revisão
  IF proposta_record.status NOT IN ('enviado', 'finalizada') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'status_invalido',
      'message', 'Proposta não pode ser revisada. Status atual: ' || proposta_record.status
    );
  END IF;
  
  -- Buscar dados do fornecedor
  SELECT nome, email INTO fornecedor_record
  FROM public.profiles
  WHERE id = proposta_record.fornecedor_id;
  
  -- Inserir solicitação de revisão
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
  ) RETURNING id INTO revisao_id;
  
  -- Atualizar status da proposta para pendente_revisao
  UPDATE public.checklist_propostas
  SET status = 'pendente_revisao',
      updated_at = NOW()
  WHERE id = p_checklist_proposta_id;
  
  -- Criar notificação para o fornecedor
  INSERT INTO public.notificacoes_sistema (
    usuario_id,
    tipo,
    titulo,
    mensagem,
    referencia_id,
    tipo_referencia,
    dados_extras
  ) VALUES (
    proposta_record.fornecedor_id,
    'revisao_solicitada',
    'Revisão de Proposta Solicitada',
    'O cliente solicitou uma revisão da sua proposta. Clique para ver os detalhes e fazer as alterações.',
    revisao_id,
    'revisao_proposta',
    jsonb_build_object(
      'checklist_proposta_id', p_checklist_proposta_id,
      'cliente_email', p_cliente_email,
      'motivo_revisao', p_motivo_revisao
    )
  );
  
  -- Log da operação
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (
    NULL,
    'revisao_solicitada: proposta ' || p_checklist_proposta_id || ' por cliente ' || p_cliente_email
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Revisão solicitada com sucesso',
    'revisao_id', revisao_id,
    'fornecedor_notificado', fornecedor_record.nome
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Erro interno: ' || SQLERRM
    );
END;
$function$;