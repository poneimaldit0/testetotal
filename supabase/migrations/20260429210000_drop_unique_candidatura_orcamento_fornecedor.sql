-- Remove unique constraint que impede múltiplas propostas externas por orçamento.
-- Fornecedores cadastrados não são afetados: cada um tem seu próprio user.id único.
ALTER TABLE public.candidaturas_fornecedores
  DROP CONSTRAINT IF EXISTS candidaturas_fornecedores_orcamento_id_fornecedor_id_key;
