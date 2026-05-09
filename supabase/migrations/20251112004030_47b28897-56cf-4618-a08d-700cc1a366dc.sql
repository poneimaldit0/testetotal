-- Criar tabela de relação leads_marcenaria x tags
CREATE TABLE IF NOT EXISTS crm_marcenaria_leads_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_marcenaria_leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
  adicionada_por_id UUID REFERENCES auth.users(id),
  adicionada_por_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(lead_id, tag_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_marcenaria_leads_tags_lead ON crm_marcenaria_leads_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_marcenaria_leads_tags_tag ON crm_marcenaria_leads_tags(tag_id);

-- RLS para relação leads_marcenaria x tags
ALTER TABLE crm_marcenaria_leads_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestores podem ver tags dos leads" ON crm_marcenaria_leads_tags;
CREATE POLICY "Gestores podem ver tags dos leads"
  ON crm_marcenaria_leads_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND tipo_usuario IN ('admin', 'master', 'gestor_conta', 'customer_success', 'consultor_marcenaria')
      AND status = 'ativo'
    )
  );

DROP POLICY IF EXISTS "Gestores podem adicionar tags aos leads" ON crm_marcenaria_leads_tags;
CREATE POLICY "Gestores podem adicionar tags aos leads"
  ON crm_marcenaria_leads_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND tipo_usuario IN ('admin', 'master', 'gestor_conta', 'customer_success', 'consultor_marcenaria')
      AND status = 'ativo'
    )
  );

DROP POLICY IF EXISTS "Gestores podem remover tags dos leads" ON crm_marcenaria_leads_tags;
CREATE POLICY "Gestores podem remover tags dos leads"
  ON crm_marcenaria_leads_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND tipo_usuario IN ('admin', 'master', 'gestor_conta', 'customer_success', 'consultor_marcenaria')
      AND status = 'ativo'
    )
  );

-- Atualizar a view de leads de marcenaria (se existir) ou criar nova
-- Primeiro dropar se existir
DROP VIEW IF EXISTS view_leads_marcenaria_com_checklist CASCADE;

-- Criar view completa com tags
CREATE OR REPLACE VIEW view_leads_marcenaria_com_checklist AS
SELECT 
  l.*,
  
  -- Tags
  COALESCE(tags_agg.tags, '[]'::jsonb) as tags,
  
  -- Checklist
  COALESCE(checklist_stats.total, 0) as checklist_total,
  COALESCE(checklist_stats.concluidos, 0) as checklist_concluidos,
  COALESCE(checklist_stats.pendentes, 0) as checklist_pendentes,
  COALESCE(checklist_stats.tem_alerta, false) as tem_alerta_checklist,
  
  -- Tempo na etapa
  COALESCE(
    EXTRACT(DAY FROM (now() - hist.data_entrada_etapa))::integer,
    EXTRACT(DAY FROM (now() - l.created_at))::integer
  ) as dias_na_etapa_atual,
  
  -- Tarefas
  COALESCE(tarefas_stats.total, 0) as total_tarefas,
  COALESCE(tarefas_stats.hoje, 0) as tarefas_hoje,
  COALESCE(tarefas_stats.atrasadas, 0) as tarefas_atrasadas,
  COALESCE(tarefas_stats.concluidas, 0) as tarefas_concluidas,
  
  -- Última nota
  ultima_nota.id as ultima_nota_id,
  ultima_nota.conteudo as ultima_nota_conteudo,
  ultima_nota.criado_por_nome as ultima_nota_autor,
  ultima_nota.created_at as ultima_nota_data
  
FROM crm_marcenaria_leads l

-- Tags agregadas
LEFT JOIN LATERAL (
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', tags.id,
            'nome', tags.nome,
            'cor', tags.cor
        ) ORDER BY tags.nome
    ) as tags
    FROM crm_marcenaria_leads_tags lt
    INNER JOIN crm_tags tags ON tags.id = lt.tag_id
    WHERE lt.lead_id = l.id AND tags.ativo = true
) tags_agg ON true

-- Estatísticas do checklist (nome correto da tabela)
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN pc.concluido THEN 1 ELSE 0 END) as concluidos,
    SUM(CASE WHEN NOT pc.concluido THEN 1 ELSE 0 END) as pendentes,
    BOOL_OR(
      NOT pc.concluido 
      AND ci.dias_para_alerta > 0 
      AND EXTRACT(DAY FROM (now() - pc.created_at)) >= ci.dias_para_alerta
    ) as tem_alerta
  FROM crm_marcenaria_checklist_progresso pc
  INNER JOIN crm_marcenaria_checklist_etapas ci ON ci.id = pc.item_checklist_id
  WHERE pc.lead_id = l.id
    AND ci.etapa_marcenaria = l.etapa_marcenaria
    AND ci.ativo = true
) checklist_stats ON true

-- Data de entrada na etapa atual
LEFT JOIN LATERAL (
  SELECT data_movimentacao as data_entrada_etapa
  FROM crm_marcenaria_historico
  WHERE lead_id = l.id
    AND etapa_nova = l.etapa_marcenaria
  ORDER BY data_movimentacao DESC
  LIMIT 1
) hist ON true

-- Estatísticas de tarefas
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN DATE(t.data_vencimento) = CURRENT_DATE AND NOT t.concluida THEN 1 ELSE 0 END) as hoje,
    SUM(CASE WHEN DATE(t.data_vencimento) < CURRENT_DATE AND NOT t.concluida THEN 1 ELSE 0 END) as atrasadas,
    SUM(CASE WHEN t.concluida THEN 1 ELSE 0 END) as concluidas
  FROM crm_marcenaria_tarefas t
  WHERE t.lead_id = l.id
) tarefas_stats ON true

-- Última nota
LEFT JOIN LATERAL (
  SELECT 
    id,
    conteudo,
    criado_por_nome,
    created_at
  FROM crm_marcenaria_notas
  WHERE lead_id = l.id
  ORDER BY created_at DESC
  LIMIT 1
) ultima_nota ON true;