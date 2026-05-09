-- Adicionar novo mapeamento para status em_orcamento
INSERT INTO mapeamento_status_etapa_crm 
  (status_fornecedor, etapa_crm_destino, ordem_prioridade, descricao)
VALUES 
  ('em_orcamento', 'em_orcamento', 9, 'Fornecedor em fase de elaboracao do orcamento');

-- Reordenar status existentes para acomodar o novo
UPDATE mapeamento_status_etapa_crm 
SET ordem_prioridade = 10 WHERE status_fornecedor = 'orcamento_enviado';

UPDATE mapeamento_status_etapa_crm 
SET ordem_prioridade = 11 WHERE status_fornecedor = 'negocio_fechado';