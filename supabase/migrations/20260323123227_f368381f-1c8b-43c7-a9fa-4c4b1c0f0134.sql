-- Transferir orçamentos da Fabiana Nunes para Joeberte Vitor
UPDATE orcamentos 
SET gestor_conta_id = '3c19d4fb-0e1c-4aef-ace9-656a6dadc71e', updated_at = NOW()
WHERE gestor_conta_id = 'b06684b2-e826-4173-a127-54f5e559f066';

-- Transferir tracking CRM da Fabiana para Joeberte
UPDATE orcamentos_crm_tracking 
SET concierge_responsavel_id = '3c19d4fb-0e1c-4aef-ace9-656a6dadc71e', updated_at = NOW()
WHERE concierge_responsavel_id = 'b06684b2-e826-4173-a127-54f5e559f066';