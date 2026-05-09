-- Remover constraint antiga e criar nova com limite de 52
ALTER TABLE cs_fornecedores DROP CONSTRAINT IF EXISTS cs_fornecedores_semana_atual_check;

ALTER TABLE cs_fornecedores ADD CONSTRAINT cs_fornecedores_semana_atual_check CHECK (semana_atual >= 0 AND semana_atual <= 52);