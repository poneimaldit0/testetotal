-- Criar função para relatório de conversão de orçamentos (postados vs fechados)
CREATE OR REPLACE FUNCTION relatorio_conversao_orcamentos_diarios(
  p_data_inicio date,
  p_data_fim date
)
RETURNS TABLE (
  data date,
  quantidade_postados bigint,
  quantidade_fechados bigint,
  taxa_conversao numeric
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.data_publicacao::date as data,
    COUNT(*) as quantidade_postados,
    COUNT(*) FILTER (WHERE o.status = 'fechado') as quantidade_fechados,
    ROUND(
      COALESCE(
        COUNT(*) FILTER (WHERE o.status = 'fechado')::numeric / 
        NULLIF(COUNT(*), 0) * 100,
        0
      ), 
      1
    ) as taxa_conversao
  FROM orcamentos o
  WHERE o.data_publicacao::date BETWEEN p_data_inicio AND p_data_fim
  GROUP BY o.data_publicacao::date
  ORDER BY data DESC;
END;
$$;