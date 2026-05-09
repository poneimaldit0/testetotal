-- Adicionar coluna budget_informado na tabela orcamentos
ALTER TABLE public.orcamentos 
ADD COLUMN budget_informado NUMERIC(12,2) NULL;

COMMENT ON COLUMN public.orcamentos.budget_informado IS 
'Budget informado pelo cliente no cadastro inicial. Visível apenas para gestores e admins no modal de detalhes.';

-- Criar índice para consultas
CREATE INDEX idx_orcamentos_budget_informado ON public.orcamentos(budget_informado) 
WHERE budget_informado IS NOT NULL;