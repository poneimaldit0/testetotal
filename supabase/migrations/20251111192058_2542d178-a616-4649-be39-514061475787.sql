-- ============================================================================
-- ATUALIZAR VIEW CRM MARCENARIA - ADICIONAR CAMPOS FALTANTES
-- ============================================================================

-- Dropar a view existente
DROP VIEW IF EXISTS view_crm_marcenaria_leads;

-- Recriar a view com os campos que faltam
CREATE VIEW view_crm_marcenaria_leads AS
SELECT 
  cml.*,
  -- Campos da tabela orcamentos
  o.necessidade,
  o.local,
  o.categorias,
  -- Cálculo de dias desde criação
  EXTRACT(DAY FROM NOW() - cml.data_criacao_lead)::INTEGER AS dias_desde_criacao,
  -- Total de notas
  (SELECT COUNT(*) FROM crm_marcenaria_notas WHERE lead_id = cml.id) AS total_notas_calculado,
  -- Métricas de checklist
  COALESCE((
    SELECT COUNT(*)
    FROM crm_marcenaria_checklist_progresso ccp
    JOIN crm_marcenaria_checklist_etapas cce ON cce.id = ccp.item_checklist_id
    WHERE ccp.lead_id = cml.id 
      AND cce.etapa_marcenaria = cml.etapa_marcenaria
      AND cce.ativo = true
      AND ccp.concluido = false
  ), 0) AS checklist_pendentes,
  COALESCE((
    SELECT COUNT(*)
    FROM crm_marcenaria_checklist_progresso ccp
    JOIN crm_marcenaria_checklist_etapas cce ON cce.id = ccp.item_checklist_id
    WHERE ccp.lead_id = cml.id 
      AND cce.etapa_marcenaria = cml.etapa_marcenaria
      AND cce.ativo = true
  ), 0) AS checklist_total,
  COALESCE((
    SELECT COUNT(*)
    FROM crm_marcenaria_checklist_progresso ccp
    JOIN crm_marcenaria_checklist_etapas cce ON cce.id = ccp.item_checklist_id
    WHERE ccp.lead_id = cml.id 
      AND cce.etapa_marcenaria = cml.etapa_marcenaria
      AND cce.ativo = true
      AND ccp.concluido = true
  ), 0) AS checklist_concluidos,
  -- Alertas de checklist
  EXISTS(
    SELECT 1 
    FROM crm_marcenaria_checklist_progresso ccp
    JOIN crm_marcenaria_checklist_etapas cce ON cce.id = ccp.item_checklist_id
    WHERE ccp.lead_id = cml.id 
      AND cce.etapa_marcenaria = cml.etapa_marcenaria
      AND ccp.concluido = false
      AND cce.dias_para_alerta IS NOT NULL
      AND EXTRACT(DAY FROM NOW() - ccp.created_at) >= cce.dias_para_alerta
  ) AS tem_alerta_checklist,
  -- Dias na etapa atual
  COALESCE(
    EXTRACT(DAY FROM NOW() - (
      SELECT data_movimentacao 
      FROM crm_marcenaria_historico 
      WHERE lead_id = cml.id 
      ORDER BY data_movimentacao DESC 
      LIMIT 1
    ))::INTEGER,
    EXTRACT(DAY FROM NOW() - cml.data_criacao_lead)::INTEGER
  ) AS dias_na_etapa_atual,
  -- Métricas de tarefas
  COALESCE((
    SELECT COUNT(*) 
    FROM crm_marcenaria_tarefas 
    WHERE lead_id = cml.id AND concluida = false
  ), 0) AS total_tarefas,
  COALESCE((
    SELECT COUNT(*) 
    FROM crm_marcenaria_tarefas 
    WHERE lead_id = cml.id 
      AND concluida = false
      AND DATE(data_vencimento) = CURRENT_DATE
  ), 0) AS tarefas_hoje,
  COALESCE((
    SELECT COUNT(*) 
    FROM crm_marcenaria_tarefas 
    WHERE lead_id = cml.id 
      AND concluida = false
      AND data_vencimento < NOW()
  ), 0) AS tarefas_atrasadas,
  COALESCE((
    SELECT COUNT(*) 
    FROM crm_marcenaria_tarefas 
    WHERE lead_id = cml.id AND concluida = true
  ), 0) AS tarefas_concluidas
FROM crm_marcenaria_leads cml
LEFT JOIN orcamentos o ON o.id = cml.orcamento_id;

COMMENT ON VIEW view_crm_marcenaria_leads IS 
'View consolidada do CRM Marcenaria com dados do orçamento, métricas de checklist e tarefas';