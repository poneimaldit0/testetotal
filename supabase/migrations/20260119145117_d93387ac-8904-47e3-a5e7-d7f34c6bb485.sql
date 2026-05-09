-- Atualizar fornecedores que já concluíram a semana 12 para semana 13
UPDATE cs_fornecedores 
SET semana_atual = 13 
WHERE semana_atual = 12 
AND id IN (
  SELECT cs_fornecedor_id 
  FROM cs_rituais_semanais 
  WHERE semana = 12 AND concluido = true
);