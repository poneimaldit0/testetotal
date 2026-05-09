-- Criar função RPC para solicitar revisão de proposta de forma segura
-- Esta função contorna o problema de RLS com JOINs complexos para usuários não autenticados

CREATE OR REPLACE FUNCTION public.solicitar_revisao_proposta(
  p_token_acesso TEXT,
  p_checklist_proposta_id UUID,
  p_cliente_email TEXT,
  p_motivo_revisao TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record RECORD;
  v_checklist_record RECORD;
  v_revisao_id UUID;
BEGIN
  -- Validar token de acesso
  SELECT * INTO v_token_record
  FROM tokens_comparacao_cliente t
  WHERE t.token_acesso = p_token_acesso
    AND t.expires_at > now();
    
  IF v_token_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'token_invalido',
      'message', 'Token de acesso inválido ou expirado'
    );
  END IF;
  
  -- Validar se o checklist_proposta_id existe e pertence ao orçamento do token
  SELECT cp.*, cf.orcamento_id INTO v_checklist_record
  FROM checklist_propostas cp
  JOIN candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
  WHERE cp.id = p_checklist_proposta_id
    AND cf.orcamento_id = v_token_record.orcamento_id;
    
  IF v_checklist_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'proposta_nao_encontrada',
      'message', 'Proposta não encontrada ou não pertence a este orçamento'
    );
  END IF;
  
  -- Verificar se a proposta está em status que permite revisão
  IF v_checklist_record.status NOT IN ('enviado', 'em_revisao') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'status_invalido',
      'message', 'Esta proposta não pode ser revisada no status atual: ' || v_checklist_record.status
    );
  END IF;
  
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
  ) RETURNING id INTO v_revisao_id;
  
  -- Atualizar status da proposta para 'em_revisao'
  UPDATE public.checklist_propostas 
  SET status = 'em_revisao',
      updated_at = now()
  WHERE id = p_checklist_proposta_id;
  
  -- Log da operação para auditoria
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (
    NULL, 
    'solicitar_revisao_cliente: proposta ' || p_checklist_proposta_id::text || 
    ' por ' || p_cliente_email || ' via token ' || left(p_token_acesso, 8) || '...'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'revisao_id', v_revisao_id,
    'message', 'Solicitação de revisão enviada com sucesso'
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