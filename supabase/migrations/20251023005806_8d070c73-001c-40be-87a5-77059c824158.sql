-- Criar função auxiliar para verificar se usuário é admin, master ou gestor
CREATE OR REPLACE FUNCTION public.is_admin_or_gestor()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND tipo_usuario IN ('admin', 'master', 'gestor_conta')
  );
$$;

-- Remover policies antigas de crm_checklist_progresso
DROP POLICY IF EXISTS "Usuários podem ver progresso de seus orçamentos" ON crm_checklist_progresso;
DROP POLICY IF EXISTS "Usuários podem atualizar progresso de seus orçamentos" ON crm_checklist_progresso;

-- Criar nova policy de SELECT
CREATE POLICY "Admin, Master e Gestores podem ver checklists"
ON crm_checklist_progresso FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orcamentos_crm_tracking oct
    WHERE oct.orcamento_id = crm_checklist_progresso.orcamento_id
    AND (
      oct.concierge_responsavel_id = auth.uid() 
      OR is_admin_or_gestor()
    )
  )
);

-- Criar nova policy de UPDATE
CREATE POLICY "Admin, Master e Gestores podem atualizar checklists"
ON crm_checklist_progresso FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM orcamentos_crm_tracking oct
    WHERE oct.orcamento_id = crm_checklist_progresso.orcamento_id
    AND (
      oct.concierge_responsavel_id = auth.uid() 
      OR is_admin_or_gestor()
    )
  )
);