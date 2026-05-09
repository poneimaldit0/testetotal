-- Corrigir função RPC para usar campos corretos da tabela checklist_propostas
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
BEGIN
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
    'proposta', COALESCE(
      (SELECT json_build_object(
        'valor_total_estimado', cp.valor_total_estimado,
        'status', CASE WHEN cp.id IS NOT NULL THEN 'enviada' ELSE 'nao_enviada' END,
        'observacoes', cp.observacoes,
        'forma_pagamento', cp.forma_pagamento,
        'data_envio', cp.data_envio,
        'versao', cp.versao
      )
      FROM checklist_propostas cp 
      WHERE cp.candidatura_id = cf.id 
      LIMIT 1),
      json_build_object(
        'valor_total_estimado', 0,
        'status', 'nao_enviada',
        'observacoes', null,
        'forma_pagamento', null,
        'data_envio', null,
        'versao', null
      )
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

  -- Incrementar visualizações se encontrou
  IF resultado IS NOT NULL THEN
    UPDATE codigos_acesso_propostas 
    SET visualizacoes = visualizacoes + 1,
        ultimo_acesso = now()
    WHERE UPPER(codigo_orcamento) = UPPER(p_codigo_orcamento)
      AND UPPER(codigo_fornecedor) = UPPER(p_codigo_fornecedor);
  END IF;

  RETURN resultado;
END;
$$;