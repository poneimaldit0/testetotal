
-- Adicionar coluna analise_completa JSONB para armazenar análise detalhada de 7 seções
ALTER TABLE public.propostas_analises_ia
ADD COLUMN IF NOT EXISTS analise_completa jsonb;

COMMENT ON COLUMN public.propostas_analises_ia.analise_completa IS 'Análise completa com 7 seções: escopo, comparativo, composição MO/material, tabela técnica, referência mercado, análise técnica, conclusão';
