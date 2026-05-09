-- Adicionar gestor_marcenaria às permissões de tags

-- 1. Atualizar política crm_tags para permitir gestor_marcenaria criar tags
DROP POLICY IF EXISTS "Gestores podem criar tags" ON crm_tags;

CREATE POLICY "Gestores podem criar tags"
ON crm_tags
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = ANY(ARRAY['admin', 'master', 'gestor_conta', 'gestor_marcenaria'])
    AND profiles.status = 'ativo'
  )
);

-- 2. Atualizar políticas crm_marcenaria_leads_tags

-- INSERT: Adicionar tags aos leads
DROP POLICY IF EXISTS "Gestores podem adicionar tags aos leads" ON crm_marcenaria_leads_tags;

CREATE POLICY "Gestores podem adicionar tags aos leads"
ON crm_marcenaria_leads_tags
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = ANY(ARRAY['admin', 'master', 'gestor_conta', 'customer_success', 'consultor_marcenaria', 'gestor_marcenaria'])
    AND profiles.status = 'ativo'
  )
);

-- SELECT: Ver tags dos leads
DROP POLICY IF EXISTS "Gestores podem ver tags dos leads" ON crm_marcenaria_leads_tags;

CREATE POLICY "Gestores podem ver tags dos leads"
ON crm_marcenaria_leads_tags
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = ANY(ARRAY['admin', 'master', 'gestor_conta', 'customer_success', 'consultor_marcenaria', 'gestor_marcenaria'])
    AND profiles.status = 'ativo'
  )
);

-- DELETE: Remover tags dos leads
DROP POLICY IF EXISTS "Gestores podem remover tags dos leads" ON crm_marcenaria_leads_tags;

CREATE POLICY "Gestores podem remover tags dos leads"
ON crm_marcenaria_leads_tags
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = ANY(ARRAY['admin', 'master', 'gestor_conta', 'customer_success', 'consultor_marcenaria', 'gestor_marcenaria'])
    AND profiles.status = 'ativo'
  )
);