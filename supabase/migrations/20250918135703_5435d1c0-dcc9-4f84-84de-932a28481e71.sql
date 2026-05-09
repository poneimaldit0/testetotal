-- Função temporária para corrigir revisões abandonadas
CREATE OR REPLACE FUNCTION public.corrigir_revisao_abandonada()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_revisoes_corrigidas integer := 0;
BEGIN
  -- Finalizar revisões pendentes que já têm propostas com valor > 0
  UPDATE public.revisoes_propostas_clientes 
  SET 
    status = 'concluida',
    data_resposta = now()
  WHERE status = 'pendente'
    AND EXISTS (
      SELECT 1 
      FROM public.checklist_propostas cp
      WHERE cp.id = revisoes_propostas_clientes.checklist_proposta_id 
        AND cp.valor_total_estimado > 0
    );
  
  GET DIAGNOSTICS v_revisoes_corrigidas = ROW_COUNT;
  
  -- Log da operação
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (
    NULL,
    'correcao_revisoes_abandonadas: ' || v_revisoes_corrigidas::text || ' revisões corrigidas'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'revisoes_corrigidas', v_revisoes_corrigidas,
    'message', 'Revisões abandonadas corrigidas com sucesso'
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