-- Function to activate timer when first contribution is made
CREATE OR REPLACE FUNCTION public.ativar_timer_colaborativo(p_colaborativo_id UUID, p_fornecedor_id UUID)
RETURNS JSONB AS $$
DECLARE
  colaborativo_record RECORD;
BEGIN
  -- Buscar dados do checklist colaborativo
  SELECT * INTO colaborativo_record
  FROM public.checklist_colaborativo
  WHERE id = p_colaborativo_id;
  
  IF colaborativo_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'colaborativo_nao_encontrado',
      'message', 'Checklist colaborativo não encontrado'
    );
  END IF;
  
  -- Se já foi ativado, retornar dados existentes
  IF colaborativo_record.data_primeiro_preenchimento IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'timer_ja_ativo', true,
      'data_limite', colaborativo_record.data_limite,
      'primeiro_contribuidor_id', colaborativo_record.primeiro_contribuidor_id
    );
  END IF;
  
  -- Ativar timer (24 horas a partir de agora)
  UPDATE public.checklist_colaborativo
  SET data_primeiro_preenchimento = now(),
      primeiro_contribuidor_id = p_fornecedor_id,
      data_limite = now() + INTERVAL '24 hours',
      status = 'fase_colaborativa_ativa',
      updated_at = now()
  WHERE id = p_colaborativo_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'timer_ativado', true,
    'data_limite', now() + INTERVAL '24 hours',
    'primeiro_contribuidor_id', p_fornecedor_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to consolidate checklist after collaborative phase
CREATE OR REPLACE FUNCTION public.consolidar_checklist_colaborativo(p_colaborativo_id UUID)
RETURNS JSONB AS $$
DECLARE
  colaborativo_record RECORD;
  orcamento_id_var UUID;
  item_record RECORD;
  total_consolidados INTEGER := 0;
BEGIN
  -- Buscar dados do checklist colaborativo
  SELECT * INTO colaborativo_record
  FROM public.checklist_colaborativo
  WHERE id = p_colaborativo_id;
  
  IF colaborativo_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'colaborativo_nao_encontrado'
    );
  END IF;
  
  orcamento_id_var := colaborativo_record.orcamento_id;
  
  -- Verificar se já foi consolidado
  IF colaborativo_record.status = 'consolidado' THEN
    RETURN jsonb_build_object(
      'success', true,
      'ja_consolidado', true
    );
  END IF;
  
  -- Limpar checklist existente do orçamento
  DELETE FROM public.orcamentos_checklist_itens
  WHERE orcamento_id = orcamento_id_var AND origem = 'colaborativo';
  
  -- Consolidar: união de todos os itens selecionados por qualquer fornecedor
  FOR item_record IN
    SELECT DISTINCT item_id
    FROM public.contribuicoes_checklist cc
    WHERE cc.checklist_colaborativo_id = p_colaborativo_id
    AND cc.selecionado = true
  LOOP
    INSERT INTO public.orcamentos_checklist_itens (
      orcamento_id,
      item_id,
      obrigatorio,
      origem
    ) VALUES (
      orcamento_id_var,
      item_record.item_id,
      false,
      'colaborativo'
    );
    
    total_consolidados := total_consolidados + 1;
  END LOOP;
  
  -- Atualizar status do checklist colaborativo
  UPDATE public.checklist_colaborativo
  SET status = 'consolidado',
      data_consolidacao = now(),
      updated_at = now()
  WHERE id = p_colaborativo_id;
  
  -- Liberar propostas em rascunho colaborativo
  UPDATE public.checklist_propostas
  SET status = 'enviado',
      data_envio = now(),
      updated_at = now()
  WHERE candidatura_id IN (
    SELECT cf.id FROM public.candidaturas_fornecedores cf
    WHERE cf.orcamento_id = orcamento_id_var
  ) AND status = 'rascunho_colaborativo';
  
  RETURN jsonb_build_object(
    'success', true,
    'itens_consolidados', total_consolidados,
    'propostas_liberadas', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;