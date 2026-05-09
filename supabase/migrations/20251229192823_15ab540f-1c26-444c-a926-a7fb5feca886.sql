-- 1. Remover política antiga que não respeita segmentação
DROP POLICY IF EXISTS "Fornecedores podem ver todos os orçamentos para consulta hist" ON public.orcamentos;

-- 2. Criar nova política de histórico que respeita segmentação
CREATE POLICY "Fornecedores podem ver histórico respeitando segmentação"
ON public.orcamentos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.tipo_usuario = 'fornecedor'
      AND profiles.status = 'ativo'
  )
  AND fornecedor_pode_ver_orcamento(produto_segmentacao_id)
);