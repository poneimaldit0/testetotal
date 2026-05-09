-- Corrigir política RLS para permitir acesso público a dados básicos de fornecedores
DROP POLICY IF EXISTS "Acesso público para dados básicos de fornecedores" ON public.profiles;

CREATE POLICY "Acesso público para dados básicos de fornecedores" 
ON public.profiles 
FOR SELECT 
USING (
  tipo_usuario = 'fornecedor' AND 
  status = 'ativo'
);

-- Criar função para calcular média de avaliações se não existir
CREATE OR REPLACE FUNCTION public.calcular_media_avaliacoes(p_fornecedor_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT COALESCE(
    jsonb_build_object(
      'nota_geral', ROUND(AVG(nota_geral), 1),
      'prazo', ROUND(AVG(prazo), 1),
      'qualidade', ROUND(AVG(qualidade), 1),
      'gestao_mao_obra', ROUND(AVG(gestao_mao_obra), 1),
      'gestao_materiais', ROUND(AVG(gestao_materiais), 1),
      'custo_planejado', ROUND(AVG(custo_planejado), 1),
      'total_avaliacoes', COUNT(*)::integer
    ),
    jsonb_build_object(
      'nota_geral', 0,
      'prazo', 0,
      'qualidade', 0,
      'gestao_mao_obra', 0,
      'gestao_materiais', 0,
      'custo_planejado', 0,
      'total_avaliacoes', 0
    )
  )
  FROM public.avaliacoes_fornecedores
  WHERE fornecedor_id = p_fornecedor_id;
$$;