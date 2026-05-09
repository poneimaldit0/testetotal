-- Criar função RPC para inserir leads de marcenaria específicos
CREATE OR REPLACE FUNCTION criar_lead_marcenaria_especifico(
  p_orcamento_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_orcamento RECORD;
  v_lead_existente UUID;
  v_data_desbloqueio TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Verificar se o orçamento existe no CRM Kanban
  SELECT 
    o.id,
    o.codigo_orcamento,
    o.dados_contato->>'nome' as cliente_nome,
    o.dados_contato->>'email' as cliente_email,
    o.dados_contato->>'telefone' as cliente_telefone
  INTO v_orcamento
  FROM public.orcamentos o
  INNER JOIN public.orcamentos_crm_tracking oct ON oct.orcamento_id = o.id
  WHERE o.id = p_orcamento_id;
  
  IF v_orcamento IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Orçamento não encontrado no CRM Kanban'
    );
  END IF;
  
  -- Verificar se já existe lead de marcenaria
  SELECT id INTO v_lead_existente
  FROM public.crm_marcenaria_leads
  WHERE orcamento_id = p_orcamento_id
  LIMIT 1;
  
  IF v_lead_existente IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Lead já existe',
      'lead_id', v_lead_existente
    );
  END IF;
  
  -- Calcular data de desbloqueio (7 dias a partir de agora)
  v_data_desbloqueio := NOW() + INTERVAL '7 days';
  
  -- Inserir lead de marcenaria
  INSERT INTO public.crm_marcenaria_leads (
    orcamento_id,
    codigo_orcamento,
    cliente_nome,
    cliente_email,
    cliente_telefone,
    etapa_marcenaria,
    bloqueado,
    data_desbloqueio
  ) VALUES (
    v_orcamento.id,
    v_orcamento.codigo_orcamento,
    v_orcamento.cliente_nome,
    v_orcamento.cliente_email,
    v_orcamento.cliente_telefone,
    'identificacao_automatica',
    TRUE,
    v_data_desbloqueio
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Lead criado com sucesso',
    'orcamento_id', p_orcamento_id,
    'data_desbloqueio', v_data_desbloqueio
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;