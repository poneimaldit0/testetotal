-- Criar função RPC para recuperar propostas problemáticas
CREATE OR REPLACE FUNCTION public.recuperar_proposta_problematica(p_checklist_proposta_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  proposta_record RECORD;
  orcamento_record RECORD;
  itens_basicos TEXT[] := ARRAY['Projeto executivo', 'Mão de obra', 'Materiais básicos'];
  item_recuperado RECORD;
  itens_inseridos INTEGER := 0;
BEGIN
  -- Verificar se é admin ou o próprio fornecedor
  SELECT cp.*, cf.fornecedor_id INTO proposta_record
  FROM public.checklist_propostas cp
  JOIN public.candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
  WHERE cp.id = p_checklist_proposta_id;

  IF proposta_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Proposta não encontrada'
    );
  END IF;

  -- Verificar autorização (admin ou próprio fornecedor)
  IF NOT (public.is_admin() OR proposta_record.fornecedor_id = auth.uid()) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Sem autorização para recuperar esta proposta'
    );
  END IF;

  -- Buscar dados do orçamento
  SELECT * INTO orcamento_record
  FROM public.orcamentos o
  JOIN public.candidaturas_fornecedores cf ON cf.orcamento_id = o.id
  WHERE cf.id = proposta_record.candidatura_id;

  -- Verificar se já existem respostas
  IF (SELECT COUNT(*) FROM public.respostas_checklist WHERE checklist_proposta_id = p_checklist_proposta_id) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_has_data',
      'message', 'Esta proposta já possui respostas no checklist'
    );
  END IF;

  -- Criar respostas básicas para os primeiros itens do checklist
  FOR item_recuperado IN
    SELECT ci.id, ci.nome, ci.categoria
    FROM public.checklist_itens ci
    JOIN public.orcamentos_checklist_itens oci ON oci.item_id = ci.id
    WHERE oci.orcamento_id = orcamento_record.id
    ORDER BY ci.ordem
    LIMIT 3
  LOOP
    INSERT INTO public.respostas_checklist (
      checklist_proposta_id,
      item_id,
      incluido,
      valor_estimado,
      observacoes
    ) VALUES (
      p_checklist_proposta_id,
      item_recuperado.id,
      true,
      CASE 
        WHEN proposta_record.valor_total_estimado > 0 
        THEN (proposta_record.valor_total_estimado / 3) -- Dividir valor igualmente
        ELSE 0
      END,
      'Recuperado automaticamente devido a problema de integridade'
    );
    
    itens_inseridos := itens_inseridos + 1;
  END LOOP;

  -- Registrar log de recuperação
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (
    auth.uid(),
    'recuperacao_proposta_problematica: ' || p_checklist_proposta_id::text || 
    ' - ' || itens_inseridos::text || ' itens recuperados'
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Proposta recuperada com sucesso',
    'itens_recuperados', itens_inseridos,
    'valor_total', proposta_record.valor_total_estimado
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Erro na recuperação: ' || SQLERRM
    );
END;
$function$;