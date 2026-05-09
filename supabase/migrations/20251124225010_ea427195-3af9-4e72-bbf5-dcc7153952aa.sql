-- Adicionar colunas para sistema de metas por taxa
ALTER TABLE metas_checklist_concierge 
ADD COLUMN IF NOT EXISTS nivel_concierge TEXT DEFAULT 'pleno',
ADD COLUMN IF NOT EXISTS taxa_produtividade DECIMAL(5,4) DEFAULT 0.59;

-- Comentários para documentação
COMMENT ON COLUMN metas_checklist_concierge.nivel_concierge IS 'Nível do concierge: pleno, junior, senior, custom';
COMMENT ON COLUMN metas_checklist_concierge.taxa_produtividade IS 'Taxa de produtividade (ex: 0.59 = 59% dos clientes em carteira)';

-- Criar view para calcular clientes em carteira por concierge
CREATE OR REPLACE VIEW vw_clientes_carteira_concierge AS
SELECT 
  p.id as usuario_id,
  p.nome,
  p.tipo_usuario,
  COALESCE(orc.total, 0) as clientes_orcamentos,
  COALESCE(marc.total, 0) as clientes_marcenaria,
  COALESCE(orc.total, 0) + COALESCE(marc.total, 0) as total_clientes
FROM profiles p
LEFT JOIN (
  SELECT concierge_responsavel_id, COUNT(*) as total
  FROM orcamentos_crm_tracking
  WHERE etapa_crm::text NOT IN ('ganho', 'perdido')
  GROUP BY concierge_responsavel_id
) orc ON orc.concierge_responsavel_id = p.id
LEFT JOIN (
  SELECT consultor_responsavel_id, COUNT(*) as total
  FROM crm_marcenaria_leads
  WHERE etapa_marcenaria NOT IN ('ganho', 'perdido')
  GROUP BY consultor_responsavel_id
) marc ON marc.consultor_responsavel_id = p.id
WHERE p.tipo_usuario IN ('gestor_conta', 'gestor_marcenaria', 'consultor_marcenaria', 'customer_success')
AND p.status = 'ativo';

-- Criar view para metas calculadas
CREATE OR REPLACE VIEW vw_metas_calculadas_concierge AS
SELECT 
  m.usuario_id,
  m.nivel_concierge,
  m.taxa_produtividade,
  c.total_clientes as clientes_em_carteira,
  ROUND(c.total_clientes * m.taxa_produtividade) as meta_diaria_calculada
FROM metas_checklist_concierge m
LEFT JOIN vw_clientes_carteira_concierge c ON c.usuario_id = m.usuario_id
WHERE m.ativo = true;