-- Adicionar coluna valor_estimado na tabela crm_marcenaria_leads
ALTER TABLE crm_marcenaria_leads 
ADD COLUMN valor_estimado NUMERIC(10,2) NULL;

COMMENT ON COLUMN crm_marcenaria_leads.valor_estimado IS 
'Valor estimado do lead/projeto antes do fechamento. Campo opcional preenchido durante qualificação/desenvolvimento.';