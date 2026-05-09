-- Atualizar função RPC para incluir itens detalhados do checklist
CREATE OR REPLACE FUNCTION buscar_proposta_por_codigos(
  p_codigo_orcamento text,
  p_codigo_fornecedor text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resultado json;
  categorias_data json;
BEGIN
  -- Buscar dados básicos da proposta
  SELECT json_build_object(
    'id', cap.id,
    'candidatura_id', cf.id,
    'codigo_orcamento', cap.codigo_orcamento,
    'codigo_fornecedor', cap.codigo_fornecedor,
    'orcamento', json_build_object(
      'id', o.id,
      'necessidade', o.necessidade,
      'local', o.local,
      'categorias', o.categorias,
      'tamanho_imovel', o.tamanho_imovel,
      'data_publicacao', o.data_publicacao,
      'prazo_inicio_texto', o.prazo_inicio_texto
    ),
    'candidatura', json_build_object(
      'id', cf.id,
      'fornecedor_id', cf.fornecedor_id,
      'nome', cf.nome,
      'email', cf.email,
      'empresa', cf.empresa,
      'telefone', cf.telefone,
      'data_candidatura', cf.data_candidatura,
      'status_acompanhamento', cf.status_acompanhamento
    ),
    'codigo_info', json_build_object(
      'visualizacoes', cap.visualizacoes,
      'expires_at', cap.expires_at
    )
  )
  INTO resultado
  FROM codigos_acesso_propostas cap
  JOIN candidaturas_fornecedores cf ON cf.id = cap.candidatura_id
  JOIN orcamentos o ON o.id = cap.orcamento_id
  WHERE UPPER(cap.codigo_orcamento) = UPPER(p_codigo_orcamento)
    AND UPPER(cap.codigo_fornecedor) = UPPER(p_codigo_fornecedor)
    AND cap.expires_at > now()
  LIMIT 1;

  -- Se não encontrou, retornar null
  IF resultado IS NULL THEN
    RETURN NULL;
  END IF;

  -- Buscar dados da proposta com itens do checklist
  SELECT json_build_object(
    'valor_total_estimado', COALESCE(cp.valor_total_estimado, 0),
    'status', CASE WHEN cp.id IS NOT NULL THEN 'enviada' ELSE 'nao_enviada' END,
    'observacoes', cp.observacoes,
    'forma_pagamento', cp.forma_pagamento,
    'data_envio', cp.data_envio,
    'versao', cp.versao,
    'categorias', COALESCE(
      (SELECT json_object_agg(
        ci.categoria,
        json_build_object(
          'itens', categoria_itens.itens,
          'subtotal', categoria_itens.subtotal
        )
      )
      FROM (
        SELECT 
          ci.categoria,
          json_agg(
            json_build_object(
              'id', CASE 
                WHEN rc.item_extra THEN rc.id::text
                ELSE ci.id::text
              END,
              'nome', CASE 
                WHEN rc.item_extra THEN rc.nome_item_extra
                ELSE ci.nome
              END,
              'descricao', CASE 
                WHEN rc.item_extra THEN rc.descricao_item_extra
                ELSE ci.descricao
              END,
              'incluido', rc.incluido,
              'valor_estimado', COALESCE(rc.valor_estimado, 0),
              'ambientes', COALESCE(rc.ambientes, ARRAY[]::text[]),
              'observacoes', rc.observacoes,
              'ordem', COALESCE(ci.ordem, 999),
              'item_extra', COALESCE(rc.item_extra, false)
            ) ORDER BY COALESCE(ci.ordem, 999), ci.nome
          ) as itens,
          COALESCE(SUM(CASE WHEN rc.incluido THEN rc.valor_estimado ELSE 0 END), 0) as subtotal
        FROM respostas_checklist rc
        LEFT JOIN checklist_itens ci ON ci.id = rc.item_id
        WHERE rc.checklist_proposta_id = cp.id
        GROUP BY ci.categoria
      ) categoria_itens
      WHERE categoria_itens.itens IS NOT NULL), 
      '{}'::json
    )
  )
  INTO categorias_data
  FROM candidaturas_fornecedores cf
  LEFT JOIN checklist_propostas cp ON cp.candidatura_id = cf.id
  WHERE cf.id = (resultado->>'candidatura_id')::uuid
  LIMIT 1;

  -- Combinar resultado com categorias
  resultado := resultado || json_build_object('proposta', categorias_data);

  -- Incrementar visualizações
  UPDATE codigos_acesso_propostas 
  SET visualizacoes = visualizacoes + 1,
      ultimo_acesso = now()
  WHERE UPPER(codigo_orcamento) = UPPER(p_codigo_orcamento)
    AND UPPER(codigo_fornecedor) = UPPER(p_codigo_fornecedor);

  RETURN resultado;
END;
$$;