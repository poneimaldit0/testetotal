-- Melhorar políticas RLS para visualização de produtividade de outros usuários

-- Drop e recriar políticas para crm_checklist_progresso permitindo que admins vejam tudo
DROP POLICY IF EXISTS "Admins e CS podem ver progresso" ON crm_checklist_progresso;

CREATE POLICY "Admins, Masters e CS podem ver todo o progresso"
  ON crm_checklist_progresso
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.tipo_usuario IN ('admin', 'master', 'customer_success')
        AND profiles.status = 'ativo'
    )
  );

-- Adicionar política para gestores verem progresso dos seus orçamentos
CREATE POLICY "Gestores podem ver progresso dos seus orçamentos"
  ON crm_checklist_progresso
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM orcamentos_crm_tracking oct
      WHERE oct.orcamento_id = crm_checklist_progresso.orcamento_id
        AND oct.concierge_responsavel_id = auth.uid()
    )
  );

-- Melhorar políticas para crm_marcenaria_checklist_progresso
DROP POLICY IF EXISTS "Admins e CS podem ver progresso" ON crm_marcenaria_checklist_progresso;

CREATE POLICY "Admins, Masters e CS podem ver todo o progresso marcenaria"
  ON crm_marcenaria_checklist_progresso
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.tipo_usuario IN ('admin', 'master', 'customer_success', 'gestor_marcenaria')
        AND profiles.status = 'ativo'
    )
  );

-- Adicionar política para consultores verem progresso dos seus leads
CREATE POLICY "Consultores podem ver progresso dos seus leads"
  ON crm_marcenaria_checklist_progresso
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM crm_marcenaria_leads l
      WHERE l.id = crm_marcenaria_checklist_progresso.lead_id
        AND l.consultor_responsavel_id = auth.uid()
    )
  );

-- Garantir que orcamentos_crm_tracking tenha política explícita de SELECT
DROP POLICY IF EXISTS "Admin e Gestor podem gerenciar CRM tracking" ON orcamentos_crm_tracking;

-- Criar políticas separadas para melhor controle
CREATE POLICY "Admins, Masters e CS podem ver tracking"
  ON orcamentos_crm_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.tipo_usuario IN ('admin', 'master', 'customer_success')
        AND profiles.status = 'ativo'
    )
  );

CREATE POLICY "Gestores podem ver tracking dos seus orçamentos"
  ON orcamentos_crm_tracking
  FOR SELECT
  USING (concierge_responsavel_id = auth.uid());

CREATE POLICY "Admins e Gestores podem atualizar tracking"
  ON orcamentos_crm_tracking
  FOR UPDATE
  USING (
    can_manage_orcamentos()
  );

CREATE POLICY "Admins e Gestores podem inserir tracking"
  ON orcamentos_crm_tracking
  FOR INSERT
  WITH CHECK (
    can_manage_orcamentos()
  );

CREATE POLICY "Admins podem deletar tracking"
  ON orcamentos_crm_tracking
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.tipo_usuario IN ('admin', 'master')
        AND profiles.status = 'ativo'
    )
  );