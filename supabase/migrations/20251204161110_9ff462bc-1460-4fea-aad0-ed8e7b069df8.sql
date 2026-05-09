-- Sincronizar gestor_conta_id com concierge_responsavel_id para todos os registros inconsistentes
UPDATE orcamentos o
SET 
  gestor_conta_id = oct.concierge_responsavel_id,
  updated_at = NOW()
FROM orcamentos_crm_tracking oct
WHERE o.id = oct.orcamento_id
  AND (o.gestor_conta_id IS DISTINCT FROM oct.concierge_responsavel_id)
  AND oct.concierge_responsavel_id IS NOT NULL;