-- Criar tabela de metas de checklist por concierge
CREATE TABLE metas_checklist_concierge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  meta_itens_diarios INTEGER NOT NULL DEFAULT 15,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(usuario_id)
);

-- RLS policies para metas
ALTER TABLE metas_checklist_concierge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar metas de checklist"
  ON metas_checklist_concierge
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Usuários podem ver sua própria meta"
  ON metas_checklist_concierge
  FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

-- Criar view de produtividade diária de checklist
CREATE OR REPLACE VIEW vw_produtividade_checklist_diaria AS
SELECT 
  DATE(data_conclusao) as data,
  concluido_por_id as usuario_id,
  concluido_por_nome as nome,
  'orcamentos' as tipo_crm,
  COUNT(*) as itens_concluidos
FROM crm_checklist_progresso
WHERE concluido = true 
  AND concluido_por_id IS NOT NULL
  AND data_conclusao IS NOT NULL
GROUP BY DATE(data_conclusao), concluido_por_id, concluido_por_nome

UNION ALL

SELECT 
  DATE(data_conclusao) as data,
  concluido_por_id as usuario_id,
  concluido_por_nome as nome,
  'marcenaria' as tipo_crm,
  COUNT(*) as itens_concluidos
FROM crm_marcenaria_checklist_progresso
WHERE concluido = true 
  AND concluido_por_id IS NOT NULL
  AND data_conclusao IS NOT NULL
GROUP BY DATE(data_conclusao), concluido_por_id, concluido_por_nome;