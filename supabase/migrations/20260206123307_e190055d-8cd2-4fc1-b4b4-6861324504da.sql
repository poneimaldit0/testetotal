
ALTER TABLE cs_rituais_semanais 
  DROP CONSTRAINT IF EXISTS cs_rituais_semanais_semana_check;

ALTER TABLE cs_rituais_semanais 
  ADD CONSTRAINT cs_rituais_semanais_semana_check 
  CHECK (semana >= 1 AND semana <= 52);

ALTER TABLE cs_fornecedores 
  DROP CONSTRAINT IF EXISTS cs_fornecedores_semana_atual_check;

ALTER TABLE cs_fornecedores 
  ADD CONSTRAINT cs_fornecedores_semana_atual_check 
  CHECK (semana_atual >= 0 AND semana_atual <= 52);
