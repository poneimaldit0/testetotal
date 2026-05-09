-- Criar tabela específica para tags de marcenaria
CREATE TABLE crm_marcenaria_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  cor TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_por_id UUID REFERENCES auth.users(id),
  criado_por_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_crm_marcenaria_tags_ativo ON crm_marcenaria_tags(ativo);
CREATE INDEX idx_crm_marcenaria_tags_nome ON crm_marcenaria_tags(nome);

-- Enable RLS
ALTER TABLE crm_marcenaria_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Visualização: Gestores, consultores e admins podem ver tags
CREATE POLICY "Usuários autorizados podem ver tags de marcenaria"
ON crm_marcenaria_tags FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = ANY(ARRAY['admin', 'master', 'gestor_marcenaria', 'consultor_marcenaria', 'customer_success'])
    AND profiles.status = 'ativo'
  )
);

-- Criação: Gestores e consultores podem criar tags
CREATE POLICY "Gestores e consultores podem criar tags de marcenaria"
ON crm_marcenaria_tags FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = ANY(ARRAY['admin', 'master', 'gestor_marcenaria', 'consultor_marcenaria'])
    AND profiles.status = 'ativo'
  )
);

-- Atualização: Gestores e consultores podem editar tags
CREATE POLICY "Gestores e consultores podem editar tags de marcenaria"
ON crm_marcenaria_tags FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = ANY(ARRAY['admin', 'master', 'gestor_marcenaria', 'consultor_marcenaria'])
    AND profiles.status = 'ativo'
  )
);

-- Exclusão: Apenas gestores e admins podem excluir
CREATE POLICY "Gestores podem excluir tags de marcenaria"
ON crm_marcenaria_tags FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = ANY(ARRAY['admin', 'master', 'gestor_marcenaria'])
    AND profiles.status = 'ativo'
  )
);

-- Migrar tags existentes que estão sendo usadas em leads de marcenaria
INSERT INTO crm_marcenaria_tags (id, nome, cor, ativo, criado_por_id, criado_por_nome, created_at)
SELECT DISTINCT t.id, t.nome, t.cor, t.ativo, t.criado_por_id, t.criado_por_nome, t.created_at
FROM crm_tags t
INNER JOIN crm_marcenaria_leads_tags mlt ON mlt.tag_id = t.id
ON CONFLICT (id) DO NOTHING;

-- Atualizar foreign key de crm_marcenaria_leads_tags
ALTER TABLE crm_marcenaria_leads_tags 
DROP CONSTRAINT IF EXISTS crm_marcenaria_leads_tags_tag_id_fkey;

ALTER TABLE crm_marcenaria_leads_tags
ADD CONSTRAINT crm_marcenaria_leads_tags_tag_id_fkey 
FOREIGN KEY (tag_id) 
REFERENCES crm_marcenaria_tags(id) 
ON DELETE CASCADE;