-- Função para finalizar revisão respeitando RLS
CREATE OR REPLACE FUNCTION public.finalizar_revisao_fornecedor(
  p_checklist_proposta_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_user_id uuid;
  v_revisoes_atualizadas integer := 0;
BEGIN
  -- Obter ID do usuário atual
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_authenticated',
      'message', 'Usuário não autenticado'
    );
  END IF;
  
  -- Atualizar revisões pendentes/em_andamento para o checklist_proposta_id
  -- mas apenas se o fornecedor for o dono da candidatura
  UPDATE public.revisoes_propostas_clientes 
  SET 
    status = 'concluida',
    data_resposta = now()
  WHERE checklist_proposta_id = p_checklist_proposta_id
    AND status IN ('pendente', 'em_andamento')
    AND EXISTS (
      SELECT 1 
      FROM public.checklist_propostas cp
      JOIN public.candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
      WHERE cp.id = p_checklist_proposta_id 
        AND cf.fornecedor_id = v_user_id
    );
  
  GET DIAGNOSTICS v_revisoes_atualizadas = ROW_COUNT;
  
  -- Log da operação
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (
    v_user_id,
    'finalizar_revisao: checklist_proposta_id=' || p_checklist_proposta_id::text || 
    ', revisoes_atualizadas=' || v_revisoes_atualizadas::text
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'revisoes_atualizadas', v_revisoes_atualizadas,
    'message', 'Revisão(ões) finalizada(s) com sucesso'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Erro interno: ' || SQLERRM
    );
END;
$$;