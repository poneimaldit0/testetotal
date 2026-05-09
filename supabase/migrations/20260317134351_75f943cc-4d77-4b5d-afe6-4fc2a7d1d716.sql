
-- Transferir todos os orçamentos da Cristine para Joeberte
UPDATE orcamentos 
SET gestor_conta_id = '3c19d4fb-0e1c-4aef-ace9-656a6dadc71e', updated_at = NOW()
WHERE gestor_conta_id = '4312c123-34e5-4a61-a640-1c0e9eef845b';

-- Transferir tracking CRM da Cristine para Joeberte
UPDATE orcamentos_crm_tracking 
SET concierge_responsavel_id = '3c19d4fb-0e1c-4aef-ace9-656a6dadc71e', updated_at = NOW()
WHERE concierge_responsavel_id = '4312c123-34e5-4a61-a640-1c0e9eef845b';

-- Também atualizar o contrato do Joeberte para que ele não fique inativo
UPDATE profiles 
SET data_termino_contrato = '2027-03-17', status = 'ativo', updated_at = NOW()
WHERE id = '3c19d4fb-0e1c-4aef-ace9-656a6dadc71e';
