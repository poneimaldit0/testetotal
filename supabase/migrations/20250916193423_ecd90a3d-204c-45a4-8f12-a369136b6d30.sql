-- Corrigir a função excluir_orcamento_admin removendo tabelas inexistentes
CREATE OR REPLACE FUNCTION public.excluir_orcamento_admin(p_orcamento_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  orcamento_record RECORD;
  candidaturas_count INTEGER := 0;
  propostas_count INTEGER := 0;
  checklist_count INTEGER := 0;
  arquivos_count INTEGER := 0;
  codigos_count INTEGER := 0;
  tokens_count INTEGER := 0;
  total_registros INTEGER := 0;
BEGIN
  -- Verificar se é admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Apenas administradores podem excluir orçamentos'
    );
  END IF;
  
  -- Verificar se o orçamento existe
  SELECT * INTO orcamento_record
  FROM public.orcamentos
  WHERE id = p_orcamento_id;
  
  IF orcamento_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Orçamento não encontrado'
    );
  END IF;
  
  -- Log início da exclusão
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (
    auth.uid(),
    'inicio_exclusao_orcamento: ' || p_orcamento_id::text || 
    ' - Necessidade: ' || COALESCE(orcamento_record.necessidade, 'N/A')
  );
  
  BEGIN
    -- 1. Excluir respostas de checklist (mais específico primeiro)
    DELETE FROM public.respostas_checklist
    WHERE checklist_proposta_id IN (
      SELECT cp.id FROM public.checklist_propostas cp
      JOIN public.candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
      WHERE cf.orcamento_id = p_orcamento_id
    );
    GET DIAGNOSTICS propostas_count = ROW_COUNT;
    
    -- 2. Excluir revisões de propostas
    DELETE FROM public.revisoes_propostas_clientes
    WHERE checklist_proposta_id IN (
      SELECT cp.id FROM public.checklist_propostas cp
      JOIN public.candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
      WHERE cf.orcamento_id = p_orcamento_id
    );
    
    -- 3. Excluir revisões de propostas (admin)
    DELETE FROM public.revisoes_propostas
    WHERE checklist_proposta_id IN (
      SELECT cp.id FROM public.checklist_propostas cp
      JOIN public.candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
      WHERE cf.orcamento_id = p_orcamento_id
    );
    
    -- 4. Excluir checklist de propostas
    DELETE FROM public.checklist_propostas
    WHERE candidatura_id IN (
      SELECT id FROM public.candidaturas_fornecedores
      WHERE orcamento_id = p_orcamento_id
    );
    
    -- 5. Excluir contribuições do checklist colaborativo
    DELETE FROM public.contribuicoes_checklist
    WHERE checklist_colaborativo_id IN (
      SELECT id FROM public.checklist_colaborativo
      WHERE orcamento_id = p_orcamento_id
    );
    GET DIAGNOSTICS checklist_count = ROW_COUNT;
    
    -- 6. Excluir checklist colaborativo
    DELETE FROM public.checklist_colaborativo
    WHERE orcamento_id = p_orcamento_id;
    
    -- 7. Excluir desistências de propostas
    DELETE FROM public.desistencias_propostas
    WHERE candidatura_id IN (
      SELECT id FROM public.candidaturas_fornecedores
      WHERE orcamento_id = p_orcamento_id
    );
    
    -- 8. Excluir solicitações de ajuda
    DELETE FROM public.solicitacoes_ajuda
    WHERE candidatura_id IN (
      SELECT id FROM public.candidaturas_fornecedores
      WHERE orcamento_id = p_orcamento_id
    );
    
    -- 9. Excluir códigos de acesso (tabela correta)
    DELETE FROM public.codigos_acesso_propostas
    WHERE candidatura_id IN (
      SELECT id FROM public.candidaturas_fornecedores
      WHERE orcamento_id = p_orcamento_id
    );
    GET DIAGNOSTICS codigos_count = ROW_COUNT;
    
    -- 10. Excluir candidaturas de fornecedores
    DELETE FROM public.candidaturas_fornecedores
    WHERE orcamento_id = p_orcamento_id;
    GET DIAGNOSTICS candidaturas_count = ROW_COUNT;
    
    -- 11. Excluir itens do checklist do orçamento
    DELETE FROM public.orcamentos_checklist_itens
    WHERE orcamento_id = p_orcamento_id;
    
    -- 12. Excluir arquivos do orçamento
    DELETE FROM public.arquivos_orcamento
    WHERE orcamento_id = p_orcamento_id;
    GET DIAGNOSTICS arquivos_count = ROW_COUNT;
    
    -- 13. Excluir tokens de comparação
    DELETE FROM public.tokens_comparacao_cliente
    WHERE orcamento_id = p_orcamento_id;
    GET DIAGNOSTICS tokens_count = ROW_COUNT;
    
    -- 14. Finalmente, excluir o orçamento
    DELETE FROM public.orcamentos
    WHERE id = p_orcamento_id;
    
    total_registros := candidaturas_count + propostas_count + checklist_count + 
                      arquivos_count + codigos_count + tokens_count;
    
    -- Log sucesso da exclusão
    INSERT INTO public.logs_acesso (user_id, acao)
    VALUES (
      auth.uid(),
      'exclusao_orcamento_sucesso: ' || p_orcamento_id::text || 
      ' - Total registros: ' || total_registros::text
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Orçamento excluído com sucesso',
      'orcamento_id', p_orcamento_id,
      'registros_excluidos', jsonb_build_object(
        'candidaturas', candidaturas_count,
        'propostas_respostas', propostas_count,
        'checklist_contribuicoes', checklist_count,
        'arquivos', arquivos_count,
        'codigos_acesso', codigos_count,
        'tokens_comparacao', tokens_count,
        'total', total_registros
      )
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Log do erro detalhado
      INSERT INTO public.logs_acesso (user_id, acao)
      VALUES (
        auth.uid(),
        'erro_exclusao_orcamento: ' || p_orcamento_id::text || 
        ' - Erro: ' || SQLERRM || ' - Estado: ' || SQLSTATE
      );
      
      RETURN jsonb_build_object(
        'success', false,
        'error', 'database_error',
        'message', 'Erro ao excluir orçamento: ' || SQLERRM,
        'sql_state', SQLSTATE,
        'orcamento_id', p_orcamento_id
      );
  END;
END;
$function$;