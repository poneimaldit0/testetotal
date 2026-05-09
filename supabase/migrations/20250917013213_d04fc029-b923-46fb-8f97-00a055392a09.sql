-- Corrigir função RPC usando jsonb para concatenação
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
  resultado jsonb;
  proposta_data json;
BEGIN
  -- Buscar dados básicos da proposta
  SELECT jsonb_build_object(
    'id', cap.id,
    'candidatura_id', cf.id,
    'codigo_orcamento', cap.codigo_orcamento,
    'codigo_fornecedor', cap.codigo_fornecedor,
    'orcamento', jsonb_build_object(
      'id', o.id,
      'necessidade', o.necessidade,
      'local', o.local,
      'categorias', o.categorias,
      'tamanho_imovel', o.tamanho_imovel,
      'data_publicacao', o.data_publicacao,
      'prazo_inicio_texto', o.prazo_inicio_texto
    ),
    'candidatura', jsonb_build_object(
      'id', cf.id,
      'fornecedor_id', cf.fornecedor_id,
      'nome', cf.nome,
      'email', cf.email,
      'empresa', cf.empresa,
      'telefone', cf.telefone,
      'data_candidatura', cf.data_candidatura,
      'status_acompanhamento', cf.status_acompanhamento
    ),
    'codigo_info', jsonb_build_object(
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

  -- Buscar dados da proposta com itens do checklist organizados por categoria
  WITH dados_proposta AS (
    SELECT 
      cp.id as proposta_id,
      cp.valor_total_estimado,
      cp.observacoes,
      cp.forma_pagamento,
      cp.data_envio,
      cp.versao
    FROM candidaturas_fornecedores cf
    LEFT JOIN checklist_propostas cp ON cp.candidatura_id = cf.id
    WHERE cf.id = (resultado->>'candidatura_id')::uuid
  ),
  categorias_agrupadas AS (
    SELECT 
      dp.proposta_id,
      dp.valor_total_estimado,
      dp.observacoes,
      dp.forma_pagamento,
      dp.data_envio,
      dp.versao,
      COALESCE(
        json_object_agg(
          categoria_nome,
          json_build_object(
            'itens', categoria_itens,
            'subtotal', categoria_subtotal
          )
        ) FILTER (WHERE categoria_nome IS NOT NULL),
        '{}'::json
      ) as categorias
    FROM dados_proposta dp
    LEFT JOIN (
      SELECT 
        rc.checklist_proposta_id,
        COALESCE(ci.categoria, 'Extras') as categoria_nome,
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
          ) ORDER BY COALESCE(ci.ordem, 999), COALESCE(ci.nome, rc.nome_item_extra)
        ) as categoria_itens,
        COALESCE(SUM(CASE WHEN rc.incluido THEN rc.valor_estimado ELSE 0 END), 0) as categoria_subtotal
      FROM respostas_checklist rc
      LEFT JOIN checklist_itens ci ON ci.id = rc.item_id
      GROUP BY rc.checklist_proposta_id, COALESCE(ci.categoria, 'Extras')
    ) cat_data ON cat_data.checklist_proposta_id = dp.proposta_id
    GROUP BY dp.proposta_id, dp.valor_total_estimado, dp.observacoes, dp.forma_pagamento, dp.data_envio, dp.versao
  )
  SELECT json_build_object(
    'valor_total_estimado', COALESCE(valor_total_estimado, 0),
    'status', CASE WHEN proposta_id IS NOT NULL THEN 'enviada' ELSE 'nao_enviada' END,
    'observacoes', observacoes,
    'forma_pagamento', forma_pagamento,
    'data_envio', data_envio,
    'versao', versao,
    'categorias', categorias
  )
  INTO proposta_data
  FROM categorias_agrupadas;

  -- Se não há dados da proposta, criar estrutura padrão
  IF proposta_data IS NULL THEN
    proposta_data := json_build_object(
      'valor_total_estimado', 0,
      'status', 'nao_enviada',
      'observacoes', null,
      'forma_pagamento', null,
      'data_envio', null,
      'versao', null,
      'categorias', '{}'::json
    );
  END IF;

  -- Combinar resultado com dados da proposta
  resultado := resultado || jsonb_build_object('proposta', proposta_data);

  -- Incrementar visualizações
  UPDATE codigos_acesso_propostas 
  SET visualizacoes = visualizacoes + 1,
      ultimo_acesso = now()
  WHERE UPPER(codigo_orcamento) = UPPER(p_codigo_orcamento)
    AND UPPER(codigo_fornecedor) = UPPER(p_codigo_fornecedor);

  RETURN resultado::json;
END;
$$;