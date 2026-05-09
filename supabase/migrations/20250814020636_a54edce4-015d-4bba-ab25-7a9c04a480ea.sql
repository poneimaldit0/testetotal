-- Criar função para calcular média de avaliações dos fornecedores
CREATE OR REPLACE FUNCTION public.calcular_media_avaliacoes(p_fornecedor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  resultado jsonb;
BEGIN
  -- Calcular médias das avaliações
  SELECT jsonb_build_object(
    'nota_geral', ROUND(COALESCE(AVG(nota_geral), 0)::numeric, 1),
    'prazo', ROUND(COALESCE(AVG(prazo), 0)::numeric, 1),
    'qualidade', ROUND(COALESCE(AVG(qualidade), 0)::numeric, 1),
    'gestao_mao_obra', ROUND(COALESCE(AVG(gestao_mao_obra), 0)::numeric, 1),
    'gestao_materiais', ROUND(COALESCE(AVG(gestao_materiais), 0)::numeric, 1),
    'custo_planejado', ROUND(COALESCE(AVG(custo_planejado), 0)::numeric, 1),
    'total_avaliacoes', COUNT(*)::integer
  ) INTO resultado
  FROM public.avaliacoes_fornecedores
  WHERE fornecedor_id = p_fornecedor_id;
  
  -- Se não houver resultado, retornar valores zerados
  IF resultado IS NULL THEN
    resultado := jsonb_build_object(
      'nota_geral', 0,
      'prazo', 0,
      'qualidade', 0,
      'gestao_mao_obra', 0,
      'gestao_materiais', 0,
      'custo_planejado', 0,
      'total_avaliacoes', 0
    );
  END IF;
  
  RETURN resultado;
END;
$function$;