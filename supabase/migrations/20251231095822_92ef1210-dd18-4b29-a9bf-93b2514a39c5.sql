-- 1. Adicionar campo para armazenar a data/hora em que o orçamento ficará visível para fornecedores
ALTER TABLE public.orcamentos 
ADD COLUMN data_liberacao_fornecedores TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.orcamentos.data_liberacao_fornecedores IS 
  'Data/hora a partir da qual o orçamento fica visível para fornecedores. Se NULL, visível imediatamente.';

-- 2. Remover política existente de histórico
DROP POLICY IF EXISTS "Fornecedores podem ver histórico respeitando segmentação" ON public.orcamentos;

-- 3. Criar nova política de histórico com verificação de delay
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
  AND (data_liberacao_fornecedores IS NULL OR data_liberacao_fornecedores <= NOW())
);

-- 4. Remover política de orçamentos abertos existente
DROP POLICY IF EXISTS "Fornecedores podem ver orçamentos abertos" ON public.orcamentos;

-- 5. Criar nova política de orçamentos abertos com verificação de delay
CREATE POLICY "Fornecedores podem ver orçamentos abertos"
ON public.orcamentos FOR SELECT
USING (
  status = 'aberto'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.tipo_usuario = 'fornecedor'
      AND profiles.status = 'ativo'
  )
  AND fornecedor_pode_ver_orcamento(produto_segmentacao_id)
  AND (data_liberacao_fornecedores IS NULL OR data_liberacao_fornecedores <= NOW())
);