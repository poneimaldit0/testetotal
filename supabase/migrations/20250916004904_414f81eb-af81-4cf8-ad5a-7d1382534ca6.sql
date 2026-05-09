-- Atualizar função buscar_proposta_por_codigos para incluir fornecedor_id
CREATE OR REPLACE FUNCTION public.buscar_proposta_por_codigos(p_codigo_orcamento text, p_codigo_fornecedor text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  resultado jsonb;
  codigo_record RECORD;
  proposta_checklist jsonb;
BEGIN
  -- Buscar código válido
  SELECT * INTO codigo_record
  FROM public.codigos_acesso_propostas
  WHERE codigo_orcamento = p_codigo_orcamento 
    AND codigo_fornecedor = p_codigo_fornecedor
    AND expires_at > NOW();
    
  IF codigo_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'codigo_invalido',
      'message', 'Códigos inválidos ou expirados'
    );
  END IF;
  
  -- Incrementar contador de visualizações
  UPDATE public.codigos_acesso_propostas
  SET visualizacoes = visualizacoes + 1,
      ultimo_acesso = NOW()
  WHERE id = codigo_record.id;
  
  -- Buscar dados do checklist da proposta (corrigido para evitar múltiplas linhas)
  SELECT jsonb_build_object(
    'valor_total_estimado', cp.valor_total_estimado,
    'status', cp.status,
    'observacoes_gerais', cp.observacoes,
    'notificado', cp.notificado,
    'data_notificacao', cp.data_notificacao,
    'created_at', cp.created_at,
    'updated_at', cp.updated_at,
    'categorias', COALESCE(
      (
        SELECT jsonb_object_agg(
          categoria_dados.categoria,
          jsonb_build_object(
            'itens', categoria_dados.itens,
            'subtotal', categoria_dados.subtotal
          )
        )
        FROM (
          SELECT 
            ci.categoria,
            jsonb_agg(
              jsonb_build_object(
                'id', ci.id,
                'nome', ci.nome,
                'descricao', ci.descricao,
                'incluido', COALESCE(rc.incluido, false),
                'valor_estimado', COALESCE(rc.valor_estimado, 0),
                'ambientes', COALESCE(rc.ambientes, '{}'),
                'observacoes', rc.observacoes,
                'ordem', ci.ordem
              ) ORDER BY ci.ordem
            ) as itens,
            SUM(CASE WHEN rc.incluido THEN COALESCE(rc.valor_estimado, 0) ELSE 0 END) as subtotal
          FROM public.checklist_itens ci
          LEFT JOIN public.respostas_checklist rc ON rc.item_id = ci.id 
            AND rc.checklist_proposta_id = cp.id
          WHERE ci.ativo = true
          GROUP BY ci.categoria
        ) categoria_dados
      ),
      '{}'::jsonb
    )
  ) INTO proposta_checklist
  FROM public.checklist_propostas cp
  WHERE cp.candidatura_id = codigo_record.candidatura_id;
  
  -- Buscar dados completos da proposta (INCLUINDO fornecedor_id)
  SELECT jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'candidatura_id', cf.id,
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
      'proposta', COALESCE(proposta_checklist, jsonb_build_object(
        'valor_total_estimado', 0,
        'status', 'rascunho',
        'observacoes_gerais', null,
        'notificado', false,
        'data_notificacao', null,
        'categorias', '{}'::jsonb
      )),
      'codigo_info', jsonb_build_object(
        'visualizacoes', codigo_record.visualizacoes + 1,
        'expires_at', codigo_record.expires_at
      )
    )
  ) INTO resultado
  FROM public.candidaturas_fornecedores cf
  JOIN public.orcamentos o ON o.id = cf.orcamento_id
  WHERE cf.id = codigo_record.candidatura_id;
  
  RETURN resultado;
END;
$function$