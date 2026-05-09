-- 1. Remover políticas antigas que verificam o campo errado (gestor_conta_id)
DROP POLICY IF EXISTS "Gestores podem ver tarefas dos seus orçamentos" ON crm_orcamentos_tarefas;
DROP POLICY IF EXISTS "Gestores podem criar tarefas dos seus orçamentos" ON crm_orcamentos_tarefas;
DROP POLICY IF EXISTS "Gestores podem atualizar tarefas dos seus orçamentos" ON crm_orcamentos_tarefas;
DROP POLICY IF EXISTS "Gestores podem deletar tarefas dos seus orçamentos" ON crm_orcamentos_tarefas;

-- 2. Criar novas políticas que verificam o campo CORRETO (concierge_responsavel_id do tracking)
CREATE POLICY "Gestores podem ver tarefas dos seus orçamentos"
ON crm_orcamentos_tarefas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orcamentos_crm_tracking t
    WHERE t.orcamento_id = crm_orcamentos_tarefas.orcamento_id
    AND t.concierge_responsavel_id = auth.uid()
  )
);

CREATE POLICY "Gestores podem criar tarefas dos seus orçamentos"
ON crm_orcamentos_tarefas FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orcamentos_crm_tracking t
    WHERE t.orcamento_id = crm_orcamentos_tarefas.orcamento_id
    AND t.concierge_responsavel_id = auth.uid()
  )
);

CREATE POLICY "Gestores podem atualizar tarefas dos seus orçamentos"
ON crm_orcamentos_tarefas FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM orcamentos_crm_tracking t
    WHERE t.orcamento_id = crm_orcamentos_tarefas.orcamento_id
    AND t.concierge_responsavel_id = auth.uid()
  )
);

CREATE POLICY "Gestores podem deletar tarefas dos seus orçamentos"
ON crm_orcamentos_tarefas FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM orcamentos_crm_tracking t
    WHERE t.orcamento_id = crm_orcamentos_tarefas.orcamento_id
    AND t.concierge_responsavel_id = auth.uid()
  )
);

-- 3. Sincronizar dados legados para consistência futura
UPDATE orcamentos o
SET gestor_conta_id = t.concierge_responsavel_id
FROM orcamentos_crm_tracking t
WHERE t.orcamento_id = o.id
AND o.gestor_conta_id IS NULL
AND t.concierge_responsavel_id IS NOT NULL;