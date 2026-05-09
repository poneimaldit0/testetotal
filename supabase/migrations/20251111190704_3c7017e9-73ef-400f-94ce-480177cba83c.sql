-- ============================================================================
-- ADICIONAR TIPO consultor_marcenaria E AJUSTAR PERMISSÕES
-- ============================================================================

-- Adicionar comentário explicativo
COMMENT ON TABLE public.crm_marcenaria_leads IS 
'Leads de marcenaria. Gestores veem tudo, consultores veem apenas seus leads apropriados.';

-- ============================================================================
-- REMOVER policies antigas que limitavam gestor_marcenaria
-- ============================================================================

DROP POLICY IF EXISTS "Gestores marcenaria podem ver seus leads" ON public.crm_marcenaria_leads;
DROP POLICY IF EXISTS "Gestores marcenaria podem atualizar seus leads" ON public.crm_marcenaria_leads;
DROP POLICY IF EXISTS "Gestores marcenaria podem gerenciar notas de seus leads" ON public.crm_marcenaria_notas;
DROP POLICY IF EXISTS "Gestores marcenaria podem gerenciar tarefas de seus leads" ON public.crm_marcenaria_tarefas;
DROP POLICY IF EXISTS "Gestores marcenaria podem gerenciar tarefas em seus leads" ON public.crm_marcenaria_tarefas;
DROP POLICY IF EXISTS "Gestores marcenaria podem ver histórico de seus leads" ON public.crm_marcenaria_historico;
DROP POLICY IF EXISTS "Gestores marcenaria podem gerenciar checklist de seus leads" ON public.crm_marcenaria_checklist_progresso;

-- ============================================================================
-- CRIAR novas policies para consultor_marcenaria (acesso restrito)
-- ============================================================================

-- LEADS: Consultores veem apenas seus leads apropriados
CREATE POLICY "Consultores marcenaria podem ver seus leads apropriados"
ON public.crm_marcenaria_leads
FOR SELECT
TO authenticated
USING (
  consultor_responsavel_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = 'consultor_marcenaria'
    AND profiles.status = 'ativo'
  )
);

CREATE POLICY "Consultores marcenaria podem atualizar seus leads"
ON public.crm_marcenaria_leads
FOR UPDATE
TO authenticated
USING (
  consultor_responsavel_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = 'consultor_marcenaria'
    AND profiles.status = 'ativo'
  )
)
WITH CHECK (
  consultor_responsavel_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = 'consultor_marcenaria'
    AND profiles.status = 'ativo'
  )
);

-- NOTAS: Consultores gerenciam notas de seus leads
CREATE POLICY "Consultores marcenaria podem gerenciar notas de seus leads"
ON public.crm_marcenaria_notas
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM crm_marcenaria_leads
    WHERE crm_marcenaria_leads.id = crm_marcenaria_notas.lead_id
    AND crm_marcenaria_leads.consultor_responsavel_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = 'consultor_marcenaria'
    AND profiles.status = 'ativo'
  )
);

-- TAREFAS: Consultores gerenciam tarefas de seus leads
CREATE POLICY "Consultores marcenaria podem gerenciar tarefas de seus leads"
ON public.crm_marcenaria_tarefas
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM crm_marcenaria_leads
    WHERE crm_marcenaria_leads.id = crm_marcenaria_tarefas.lead_id
    AND crm_marcenaria_leads.consultor_responsavel_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = 'consultor_marcenaria'
    AND profiles.status = 'ativo'
  )
);

-- HISTÓRICO: Consultores veem histórico de seus leads
CREATE POLICY "Consultores marcenaria podem ver histórico de seus leads"
ON public.crm_marcenaria_historico
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM crm_marcenaria_leads
    WHERE crm_marcenaria_leads.id = crm_marcenaria_historico.lead_id
    AND crm_marcenaria_leads.consultor_responsavel_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = 'consultor_marcenaria'
    AND profiles.status = 'ativo'
  )
);

-- CHECKLIST PROGRESSO: Consultores gerenciam checklist de seus leads
CREATE POLICY "Consultores marcenaria podem gerenciar checklist de seus leads"
ON public.crm_marcenaria_checklist_progresso
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM crm_marcenaria_leads
    WHERE crm_marcenaria_leads.id = crm_marcenaria_checklist_progresso.lead_id
    AND crm_marcenaria_leads.consultor_responsavel_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = 'consultor_marcenaria'
    AND profiles.status = 'ativo'
  )
);