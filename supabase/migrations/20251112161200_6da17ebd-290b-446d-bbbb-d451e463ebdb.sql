-- Corrigir políticas RLS para tarefas de marcenaria
-- Problema: Consultores de marcenaria não conseguem criar tarefas

-- 1. Remover a policy genérica com CMD:ALL que não está funcionando corretamente
DROP POLICY IF EXISTS "Consultores marcenaria podem gerenciar tarefas de seus leads" ON crm_marcenaria_tarefas;

-- 2. Criar policies específicas para consultores de marcenaria

-- INSERT: Consultores podem criar tarefas em seus leads
CREATE POLICY "Consultores marcenaria podem criar tarefas em seus leads"
ON crm_marcenaria_tarefas
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM crm_marcenaria_leads
    WHERE crm_marcenaria_leads.id = crm_marcenaria_tarefas.lead_id
    AND crm_marcenaria_leads.consultor_responsavel_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = 'consultor_marcenaria'
    AND profiles.status = 'ativo'
  )
);

-- SELECT: Consultores podem ver tarefas de seus leads
CREATE POLICY "Consultores marcenaria podem ver tarefas de seus leads"
ON crm_marcenaria_tarefas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM crm_marcenaria_leads
    WHERE crm_marcenaria_leads.id = crm_marcenaria_tarefas.lead_id
    AND crm_marcenaria_leads.consultor_responsavel_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = 'consultor_marcenaria'
    AND profiles.status = 'ativo'
  )
);

-- UPDATE: Consultores podem atualizar tarefas de seus leads
CREATE POLICY "Consultores marcenaria podem atualizar tarefas de seus leads"
ON crm_marcenaria_tarefas
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM crm_marcenaria_leads
    WHERE crm_marcenaria_leads.id = crm_marcenaria_tarefas.lead_id
    AND crm_marcenaria_leads.consultor_responsavel_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = 'consultor_marcenaria'
    AND profiles.status = 'ativo'
  )
);

-- DELETE: Consultores podem deletar tarefas de seus leads
CREATE POLICY "Consultores marcenaria podem deletar tarefas de seus leads"
ON crm_marcenaria_tarefas
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM crm_marcenaria_leads
    WHERE crm_marcenaria_leads.id = crm_marcenaria_tarefas.lead_id
    AND crm_marcenaria_leads.consultor_responsavel_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = 'consultor_marcenaria'
    AND profiles.status = 'ativo'
  )
);

-- Comentários para documentação
COMMENT ON POLICY "Consultores marcenaria podem criar tarefas em seus leads" ON crm_marcenaria_tarefas IS 
'Permite que consultores de marcenaria criem tarefas em leads sob sua responsabilidade';

COMMENT ON POLICY "Consultores marcenaria podem ver tarefas de seus leads" ON crm_marcenaria_tarefas IS 
'Permite que consultores de marcenaria vejam tarefas de leads sob sua responsabilidade';

COMMENT ON POLICY "Consultores marcenaria podem atualizar tarefas de seus leads" ON crm_marcenaria_tarefas IS 
'Permite que consultores de marcenaria atualizem tarefas de leads sob sua responsabilidade';

COMMENT ON POLICY "Consultores marcenaria podem deletar tarefas de seus leads" ON crm_marcenaria_tarefas IS 
'Permite que consultores de marcenaria deletem tarefas de leads sob sua responsabilidade';