-- Atualizar função para excluir orçamentos com todas as dependências
CREATE OR REPLACE FUNCTION public.excluir_orcamento_admin(p_orcamento_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  orcamento_record RECORD;
  total_candidaturas INTEGER := 0;
  total_propostas INTEGER := 0;
  total_checklist INTEGER := 0;
  total_contribuicoes INTEGER := 0;
  total_respostas INTEGER := 0;
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
  
  -- Contar registros que serão excluídos para log
  SELECT COUNT(*) INTO total_candidaturas
  FROM public.candidaturas_fornecedores
  WHERE orcamento_id = p_orcamento_id;
  
  SELECT COUNT(*) INTO total_propostas
  FROM public.checklist_propostas cp
  JOIN public.candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
  WHERE cf.orcamento_id = p_orcamento_id;
  
  SELECT COUNT(*) INTO total_checklist
  FROM public.checklist_colaborativo
  WHERE orcamento_id = p_orcamento_id;
  
  SELECT COUNT(*) INTO total_contribuicoes
  FROM public.contribuicoes_checklist cc
  JOIN public.checklist_colaborativo cl ON cl.id = cc.checklist_colaborativo_id
  WHERE cl.orcamento_id = p_orcamento_id;
  
  SELECT COUNT(*) INTO total_respostas
  FROM public.respostas_checklist rc
  JOIN public.checklist_propostas cp ON cp.id = rc.checklist_proposta_id
  JOIN public.candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
  WHERE cf.orcamento_id = p_orcamento_id;
  
  -- Início da exclusão em cascata (das tabelas filhas para as pais)
  
  -- 1. Excluir respostas de checklist
  DELETE FROM public.respostas_checklist 
  WHERE checklist_proposta_id IN (
    SELECT cp.id 
    FROM public.checklist_propostas cp
    JOIN public.candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
    WHERE cf.orcamento_id = p_orcamento_id
  );
  
  -- 2. Excluir revisões de propostas de clientes
  DELETE FROM public.revisoes_propostas_clientes
  WHERE checklist_proposta_id IN (
    SELECT cp.id 
    FROM public.checklist_propostas cp
    JOIN public.candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
    WHERE cf.orcamento_id = p_orcamento_id
  );
  
  -- 3. Excluir revisões de propostas
  DELETE FROM public.revisoes_propostas
  WHERE checklist_proposta_id IN (
    SELECT cp.id 
    FROM public.checklist_propostas cp
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
  
  -- 9. Excluir candidaturas de fornecedores
  DELETE FROM public.candidaturas_fornecedores 
  WHERE orcamento_id = p_orcamento_id;
  
  -- 10. Excluir itens do checklist do orçamento
  DELETE FROM public.orcamentos_checklist_itens 
  WHERE orcamento_id = p_orcamento_id;
  
  -- 11. Excluir tokens de comparação
  DELETE FROM public.tokens_comparacao_cliente 
  WHERE orcamento_id = p_orcamento_id;
  
  -- 12. Excluir senhas de comparação (se existir a tabela)
  DELETE FROM public.senhas_comparacao_orcamentos 
  WHERE orcamento_id = p_orcamento_id;
  
  -- 13. Excluir códigos de acesso (se existir a tabela)
  DELETE FROM public.codigos_acesso_propostas 
  WHERE orcamento_id = p_orcamento_id;
  
  -- 14. Excluir arquivos do orçamento
  DELETE FROM public.arquivos_orcamento 
  WHERE orcamento_id = p_orcamento_id;
  
  -- 15. Finalmente, excluir o orçamento
  DELETE FROM public.orcamentos 
  WHERE id = p_orcamento_id;
  
  -- Log da exclusão
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (
    auth.uid(),
    'exclusao_orcamento_completa: ' || p_orcamento_id::text || 
    ' (candidaturas: ' || total_candidaturas || 
    ', propostas: ' || total_propostas || 
    ', checklist_colaborativo: ' || total_checklist || 
    ', contribuicoes: ' || total_contribuicoes || 
    ', respostas: ' || total_respostas || ')'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Orçamento excluído com sucesso',
    'orcamento_id', p_orcamento_id,
    'registros_excluidos', jsonb_build_object(
      'candidaturas', total_candidaturas,
      'propostas', total_propostas,
      'checklist_colaborativo', total_checklist,
      'contribuicoes', total_contribuicoes,
      'respostas', total_respostas
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro
    INSERT INTO public.logs_acesso (user_id, acao)
    VALUES (
      auth.uid(),
      'erro_exclusao_orcamento: ' || p_orcamento_id::text || ' - ' || SQLERRM
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Erro ao excluir orçamento: ' || SQLERRM,
      'orcamento_id', p_orcamento_id
    );
END;
$function$;