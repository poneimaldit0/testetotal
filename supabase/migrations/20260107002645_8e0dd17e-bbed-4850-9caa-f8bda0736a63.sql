-- Remover a constraint antiga que exige semana_atual entre 1 e 12
ALTER TABLE cs_fornecedores 
DROP CONSTRAINT IF EXISTS cs_fornecedores_semana_atual_check;

-- Criar nova constraint permitindo semana 0 (Pré-Onboarding)
ALTER TABLE cs_fornecedores 
ADD CONSTRAINT cs_fornecedores_semana_atual_check 
CHECK ((semana_atual >= 0) AND (semana_atual <= 12));