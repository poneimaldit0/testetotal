-- Criar tabela de tags do CRM
CREATE TABLE IF NOT EXISTS crm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  cor TEXT NOT NULL DEFAULT '#3b82f6',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_por_id UUID REFERENCES auth.users(id),
  criado_por_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_crm_tags_ativo ON crm_tags(ativo);
CREATE INDEX IF NOT EXISTS idx_crm_tags_nome ON crm_tags(nome);

-- RLS para tags
ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos podem ver tags ativas" ON crm_tags;
CREATE POLICY "Todos podem ver tags ativas"
  ON crm_tags FOR SELECT
  USING (ativo = true);

DROP POLICY IF EXISTS "Gestores podem criar tags" ON crm_tags;
CREATE POLICY "Gestores podem criar tags"
  ON crm_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND tipo_usuario IN ('admin', 'master', 'gestor_conta')
      AND status = 'ativo'
    )
  );

DROP POLICY IF EXISTS "Criador pode editar sua tag" ON crm_tags;
CREATE POLICY "Criador pode editar sua tag"
  ON crm_tags FOR UPDATE
  USING (
    criado_por_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND tipo_usuario IN ('admin', 'master')
      AND status = 'ativo'
    )
  );

-- Criar tabela de relação orçamentos x tags
CREATE TABLE IF NOT EXISTS crm_orcamentos_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
  adicionada_por_id UUID REFERENCES auth.users(id),
  adicionada_por_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(orcamento_id, tag_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_orcamentos_tags_orcamento ON crm_orcamentos_tags(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_tags_tag ON crm_orcamentos_tags(tag_id);

-- RLS para relações
ALTER TABLE crm_orcamentos_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestores podem ver tags de orçamentos" ON crm_orcamentos_tags;
CREATE POLICY "Gestores podem ver tags de orçamentos"
  ON crm_orcamentos_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND tipo_usuario IN ('admin', 'master', 'gestor_conta')
      AND status = 'ativo'
    )
  );

DROP POLICY IF EXISTS "Gestores podem adicionar tags" ON crm_orcamentos_tags;
CREATE POLICY "Gestores podem adicionar tags"
  ON crm_orcamentos_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND tipo_usuario IN ('admin', 'master', 'gestor_conta')
      AND status = 'ativo'
    )
  );

DROP POLICY IF EXISTS "Gestores podem remover tags" ON crm_orcamentos_tags;
CREATE POLICY "Gestores podem remover tags"
  ON crm_orcamentos_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND tipo_usuario IN ('admin', 'master', 'gestor_conta')
      AND status = 'ativo'
    )
  );