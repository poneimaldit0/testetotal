-- Função para retornar métricas agregadas de avaliações de leads
CREATE OR REPLACE FUNCTION public.relatorio_avaliacoes_leads(
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL
)
RETURNS TABLE (
  total_avaliacoes BIGINT,
  media_pontuacao NUMERIC,
  total_frios BIGINT,
  total_mornos BIGINT,
  total_quentes BIGINT,
  percentual_frios NUMERIC,
  percentual_mornos NUMERIC,
  percentual_quentes NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total BIGINT;
BEGIN
  -- Calcular total
  SELECT COUNT(*)
  INTO v_total
  FROM crm_avaliacoes_leads a
  WHERE (p_data_inicio IS NULL OR a.created_at::date >= p_data_inicio)
    AND (p_data_fim IS NULL OR a.created_at::date <= p_data_fim);

  RETURN QUERY
  SELECT 
    v_total AS total_avaliacoes,
    COALESCE(ROUND(AVG(a.pontuacao_total)::numeric, 1), 0) AS media_pontuacao,
    COUNT(*) FILTER (WHERE a.pontuacao_total BETWEEN 0 AND 3) AS total_frios,
    COUNT(*) FILTER (WHERE a.pontuacao_total BETWEEN 4 AND 6) AS total_mornos,
    COUNT(*) FILTER (WHERE a.pontuacao_total BETWEEN 7 AND 10) AS total_quentes,
    CASE WHEN v_total > 0 THEN ROUND((COUNT(*) FILTER (WHERE a.pontuacao_total BETWEEN 0 AND 3)::numeric / v_total) * 100, 1) ELSE 0 END AS percentual_frios,
    CASE WHEN v_total > 0 THEN ROUND((COUNT(*) FILTER (WHERE a.pontuacao_total BETWEEN 4 AND 6)::numeric / v_total) * 100, 1) ELSE 0 END AS percentual_mornos,
    CASE WHEN v_total > 0 THEN ROUND((COUNT(*) FILTER (WHERE a.pontuacao_total BETWEEN 7 AND 10)::numeric / v_total) * 100, 1) ELSE 0 END AS percentual_quentes
  FROM crm_avaliacoes_leads a
  WHERE (p_data_inicio IS NULL OR a.created_at::date >= p_data_inicio)
    AND (p_data_fim IS NULL OR a.created_at::date <= p_data_fim);
END;
$$;

-- Função para listar avaliações detalhadas
CREATE OR REPLACE FUNCTION public.listar_avaliacoes_leads(
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  orcamento_id UUID,
  codigo_orcamento TEXT,
  cliente_nome TEXT,
  pontuacao_total INTEGER,
  perfil_ideal BOOLEAN,
  orcamento_compativel BOOLEAN,
  decisor_direto BOOLEAN,
  prazo_curto BOOLEAN,
  engajamento_alto BOOLEAN,
  fornecedor_consegue_orcar BOOLEAN,
  avaliado_por_nome TEXT,
  data_avaliacao TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.orcamento_id,
    o.codigo_orcamento,
    COALESCE((o.dados_contato->>'nome')::text, 'N/A') AS cliente_nome,
    a.pontuacao_total,
    a.perfil_ideal,
    a.orcamento_compativel,
    a.decisor_direto,
    a.prazo_curto,
    a.engajamento_alto,
    a.fornecedor_consegue_orcar,
    a.avaliado_por_nome,
    a.created_at AS data_avaliacao
  FROM crm_avaliacoes_leads a
  LEFT JOIN orcamentos o ON o.id = a.orcamento_id
  WHERE (p_data_inicio IS NULL OR a.created_at::date >= p_data_inicio)
    AND (p_data_fim IS NULL OR a.created_at::date <= p_data_fim)
  ORDER BY a.created_at DESC;
END;
$$;