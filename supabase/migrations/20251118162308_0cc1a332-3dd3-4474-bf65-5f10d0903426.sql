-- Remover políticas antigas de gestores de marcenaria para tarefas
DROP POLICY IF EXISTS "Gestores marcenaria podem criar tarefas em seus leads" ON crm_marcenaria_tarefas;
DROP POLICY IF EXISTS "Gestores marcenaria podem ver tarefas de seus leads" ON crm_marcenaria_tarefas;
DROP POLICY IF EXISTS "Gestores marcenaria podem editar tarefas de seus leads" ON crm_marcenaria_tarefas;
DROP POLICY IF EXISTS "Gestores marcenaria podem deletar tarefas de seus leads" ON crm_marcenaria_tarefas;

-- Criar novas políticas para gestores - SEM restrição de consultor_responsavel_id
-- INSERT: Gestores podem criar tarefas em QUALQUER lead
CREATE POLICY "Gestores marcenaria podem criar tarefas em qualquer lead"
ON crm_marcenaria_tarefas FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = 'gestor_marcenaria'
    AND profiles.status = 'ativo'
  )
);

-- SELECT: Gestores podem ver tarefas de QUALQUER lead
CREATE POLICY "Gestores marcenaria podem ver todas as tarefas"
ON crm_marcenaria_tarefas FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = 'gestor_marcenaria'
    AND profiles.status = 'ativo'
  )
);

-- UPDATE: Gestores podem editar tarefas de QUALQUER lead
CREATE POLICY "Gestores marcenaria podem editar todas as tarefas"
ON crm_marcenaria_tarefas FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = 'gestor_marcenaria'
    AND profiles.status = 'ativo'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = 'gestor_marcenaria'
    AND profiles.status = 'ativo'
  )
);

-- DELETE: Gestores podem deletar tarefas de QUALQUER lead
CREATE POLICY "Gestores marcenaria podem deletar todas as tarefas"
ON crm_marcenaria_tarefas FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = 'gestor_marcenaria'
    AND profiles.status = 'ativo'
  )
);