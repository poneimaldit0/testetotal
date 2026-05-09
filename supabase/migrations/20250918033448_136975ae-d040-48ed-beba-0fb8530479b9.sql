-- Criar função UPSERT para respostas de checklist (operação atômica)
CREATE OR REPLACE FUNCTION public.upsert_respostas_checklist(
  p_checklist_proposta_id UUID,
  p_respostas JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resposta_item JSONB;
  respostas_inseridas INTEGER := 0;
  respostas_atualizadas INTEGER := 0;
BEGIN
  -- Iniciar transação
  BEGIN
    -- Primeiro, vamos deletar todas as respostas existentes para esta proposta
    DELETE FROM public.respostas_checklist 
    WHERE checklist_proposta_id = p_checklist_proposta_id;
    
    -- Agora inserir todas as novas respostas
    FOR resposta_item IN SELECT * FROM jsonb_array_elements(p_respostas)
    LOOP
      INSERT INTO public.respostas_checklist (
        checklist_proposta_id,
        item_id,
        incluido,
        valor_estimado,
        ambientes,
        observacoes,
        item_extra,
        nome_item_extra,
        descricao_item_extra
      ) VALUES (
        p_checklist_proposta_id,
        CASE WHEN resposta_item->>'item_id' = '' OR resposta_item->>'item_id' IS NULL 
             THEN NULL 
             ELSE (resposta_item->>'item_id')::UUID 
        END,
        (resposta_item->>'incluido')::BOOLEAN,
        COALESCE((resposta_item->>'valor_estimado')::NUMERIC, 0),
        CASE WHEN resposta_item->'ambientes' IS NOT NULL 
             THEN ARRAY(SELECT jsonb_array_elements_text(resposta_item->'ambientes'))
             ELSE '{}'::TEXT[]
        END,
        resposta_item->>'observacoes',
        COALESCE((resposta_item->>'item_extra')::BOOLEAN, false),
        resposta_item->>'nome_item_extra',
        resposta_item->>'descricao_item_extra'
      );
      
      respostas_inseridas := respostas_inseridas + 1;
    END LOOP;
    
    -- Log da operação
    INSERT INTO public.logs_acesso (user_id, acao)
    VALUES (
      auth.uid(),
      'upsert_respostas_checklist: ' || p_checklist_proposta_id::text ||
      ' - inseridas: ' || respostas_inseridas
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'respostas_inseridas', respostas_inseridas,
      'respostas_atualizadas', respostas_atualizadas,
      'message', 'Operação UPSERT concluída com sucesso'
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback automático em caso de erro
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Erro na operação UPSERT: ' || SQLERRM
      );
  END;
END;
$$;