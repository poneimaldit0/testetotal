-- Atualizar função buscar_proposta_por_codigos para incluir forma_pagamento
CREATE OR REPLACE FUNCTION public.buscar_proposta_por_codigos(p_codigo_orcamento text, p_codigo_fornecedor text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_orcamento_id uuid;
  v_candidatura_id uuid;
  v_result jsonb;
  v_orcamento_record record;
  v_candidatura_record record;
  v_proposta_record record;
  v_codigo_record record;
BEGIN
  -- Buscar orçamento pelo código
  SELECT id INTO v_orcamento_id
  FROM public.orcamentos
  WHERE UPPER(REPLACE(id::text, '-', ''))[1:8] = UPPER(p_codigo_orcamento);
  
  IF v_orcamento_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'orcamento_nao_encontrado'
    );
  END IF;
  
  -- Buscar código de acesso válido
  SELECT * INTO v_codigo_record
  FROM public.codigos_acesso_propostas
  WHERE orcamento_id = v_orcamento_id
    AND codigo_fornecedor = p_codigo_fornecedor
    AND expires_at > NOW();
    
  IF v_codigo_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'codigo_invalido'
    );
  END IF;
  
  v_candidatura_id := v_codigo_record.candidatura_id;
  
  -- Incrementar visualizações
  UPDATE public.codigos_acesso_propostas
  SET visualizacoes = visualizacoes + 1,
      ultimo_acesso = NOW()
  WHERE id = v_codigo_record.id;
  
  -- Buscar dados do orçamento
  SELECT * INTO v_orcamento_record
  FROM public.orcamentos
  WHERE id = v_orcamento_id;
  
  -- Buscar dados da candidatura
  SELECT * INTO v_candidatura_record
  FROM public.candidaturas_fornecedores
  WHERE id = v_candidatura_id;
  
  -- Buscar proposta com forma_pagamento incluída
  SELECT 
    cp.*,
    jsonb_build_object(
      'valor_total_estimado', cp.valor_total_estimado,
      'status', cp.status,
      'observacoes_gerais', cp.observacoes,
      'notificado', cp.notificado,
      'data_notificacao', cp.data_notificacao,
      'created_at', cp.created_at,
      'updated_at', cp.updated_at,
      'forma_pagamento', cp.forma_pagamento,
      'categorias', (
        SELECT jsonb_object_agg(
          ci.categoria,
          jsonb_build_object(
            'itens', categoria_itens.itens,
            'subtotal', categoria_itens.subtotal
          )
        )
        FROM (
          SELECT DISTINCT ci.categoria
          FROM public.respostas_checklist rc
          LEFT JOIN public.checklist_itens ci ON ci.id = rc.item_id
          WHERE rc.checklist_proposta_id = cp.id
            AND rc.incluido = true
        ) categorias_distintas
        JOIN LATERAL (
          SELECT 
            jsonb_agg(
              jsonb_build_object(
                'id', COALESCE(rc.item_id::text, rc.id::text),
                'nome', COALESCE(ci.nome, rc.nome_item_extra),
                'descricao', COALESCE(ci.descricao, rc.descricao_item_extra),
                'incluido', rc.incluido,
                'valor_estimado', rc.valor_estimado,
                'ambientes', rc.ambientes,
                'observacoes', rc.observacoes,
                'ordem', COALESCE(ci.ordem, 999)
              ) ORDER BY COALESCE(ci.ordem, 999)
            ) as itens,
            COALESCE(SUM(rc.valor_estimado), 0) as subtotal
          FROM public.respostas_checklist rc
          LEFT JOIN public.checklist_itens ci ON ci.id = rc.item_id
          WHERE rc.checklist_proposta_id = cp.id
            AND rc.incluido = true
            AND (ci.categoria = categorias_distintas.categoria OR (ci.categoria IS NULL AND rc.item_extra = true))
        ) categoria_itens ON true
        LEFT JOIN public.checklist_itens ci ON ci.categoria = categorias_distintas.categoria
      )
    ) as proposta_checklist
  INTO v_proposta_record
  FROM public.checklist_propostas cp
  WHERE cp.candidatura_id = v_candidatura_id;
  
  -- Construir resultado final
  v_result := jsonb_build_object(
    'id', v_codigo_record.id,
    'candidatura_id', v_candidatura_id,
    'codigo_orcamento', p_codigo_orcamento,
    'codigo_fornecedor', p_codigo_fornecedor,
    'orcamento', jsonb_build_object(
      'id', v_orcamento_record.id,
      'necessidade', v_orcamento_record.necessidade,
      'local', v_orcamento_record.local,
      'categorias', v_orcamento_record.categorias,
      'tamanho_imovel', v_orcamento_record.tamanho_imovel,
      'data_publicacao', v_orcamento_record.data_publicacao,
      'prazo_inicio_texto', v_orcamento_record.prazo_inicio_texto
    ),
    'candidatura', jsonb_build_object(
      'id', v_candidatura_record.id,
      'fornecedor_id', v_candidatura_record.fornecedor_id,
      'nome', v_candidatura_record.nome,
      'email', v_candidatura_record.email,
      'empresa', v_candidatura_record.empresa,
      'telefone', v_candidatura_record.telefone,
      'data_candidatura', v_candidatura_record.data_candidatura,
      'status_acompanhamento', v_candidatura_record.status_acompanhamento
    ),
    'proposta', v_proposta_record.proposta_checklist,
    'codigo_info', jsonb_build_object(
      'visualizacoes', v_codigo_record.visualizacoes + 1,
      'expires_at', v_codigo_record.expires_at
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'data', v_result
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', SQLERRM
    );
END;
$function$;