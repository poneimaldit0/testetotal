-- Remove constraint antigo (só aceitava nomenclatura legada)
ALTER TABLE regioes_estrategicas
  DROP CONSTRAINT IF EXISTS regioes_estrategicas_classificacao_check;

-- Migra nomenclatura legada para o novo padrão nacional
UPDATE regioes_estrategicas SET classificacao = 'A+'  WHERE classificacao = 'Premium A+';
UPDATE regioes_estrategicas SET classificacao = 'A'   WHERE classificacao = 'Premium A';
UPDATE regioes_estrategicas SET classificacao = 'B-'  WHERE classificacao = 'Oportunidade';
UPDATE regioes_estrategicas SET classificacao = 'C+'  WHERE classificacao = 'Periférico com potencial';

-- Desativa entrada city-level de São Paulo (catch-all B incorreto para bairros periféricos)
UPDATE regioes_estrategicas
SET ativo = FALSE
WHERE cidade ILIKE 'São Paulo' AND (bairro IS NULL OR bairro = '');

-- Cria novo constraint com classificações do sistema nacional
ALTER TABLE regioes_estrategicas
  ADD CONSTRAINT regioes_estrategicas_classificacao_check
  CHECK (classificacao IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C/D', 'D'));
