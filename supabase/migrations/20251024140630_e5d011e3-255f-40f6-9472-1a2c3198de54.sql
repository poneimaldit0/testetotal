-- Redistribuição pontual de orçamentos entre gestores
-- Objetivo: Equilibrar carga de trabalho na etapa "orcamento_postado"
-- Bruno: 62 orçamentos | Cristine: 110 orçamentos | Fabiana: 115 orçamentos

-- 1. Criar tabela temporária com orçamentos embaralhados aleatoriamente
CREATE TEMP TABLE temp_redistribuicao AS
SELECT 
  oct.orcamento_id,
  ROW_NUMBER() OVER (ORDER BY random()) as sequencia
FROM orcamentos_crm_tracking oct
WHERE oct.etapa_crm = 'orcamento_postado';

-- 2. Atualizar com a nova distribuição equilibrada
UPDATE orcamentos_crm_tracking oct
SET 
  concierge_responsavel_id = CASE
    WHEN tr.sequencia BETWEEN 1 AND 62 THEN 'c58efaa1-5264-4676-bdcb-c5534bb52ace'::uuid  -- Bruno Venancio (62)
    WHEN tr.sequencia BETWEEN 63 AND 172 THEN '4312c123-34e5-4a61-a640-1c0e9eef845b'::uuid  -- Cristine Carvalho (110)
    WHEN tr.sequencia >= 173 THEN 'b06684b2-e826-4173-a127-54f5e559f066'::uuid  -- Fabiana Nunes (115+)
  END,
  updated_at = now()
FROM temp_redistribuicao tr
WHERE oct.orcamento_id = tr.orcamento_id
  AND oct.etapa_crm = 'orcamento_postado';

-- 3. Limpar tabela temporária
DROP TABLE temp_redistribuicao;