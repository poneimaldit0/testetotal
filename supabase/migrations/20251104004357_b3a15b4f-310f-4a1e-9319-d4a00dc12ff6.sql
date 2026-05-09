-- Dropar view antiga e recriar com campos de checklist
DROP VIEW IF EXISTS view_crm_marcenaria_leads;

CREATE VIEW view_crm_marcenaria_leads AS
SELECT 
  cml.*,
  o.necessidade,
  o.local,
  o.categorias,
  EXTRACT(DAY FROM (NOW() - cml.created_at))::INTEGER as dias_desde_criacao,
  EXTRACT(DAY FROM (NOW() - cml.updated_at))::INTEGER as dias_na_etapa_atual,
  
  -- Contadores de checklist
  COUNT(cp.id) FILTER (WHERE cp.concluido = false) as checklist_pendentes,
  COUNT(cp.id) as checklist_total,
  COUNT(cp.id) FILTER (WHERE cp.concluido = true) as checklist_concluidos,
  
  -- Tem alerta de checklist atrasado?
  COALESCE(
    BOOL_OR(
      cp.concluido = false 
      AND EXTRACT(DAY FROM (NOW() - cml.updated_at))::INTEGER >= ce.dias_para_alerta
    ),
    false
  ) as tem_alerta_checklist,
  
  -- Total de notas
  (SELECT COUNT(*) FROM crm_marcenaria_notas WHERE lead_id = cml.id) as total_notas

FROM crm_marcenaria_leads cml
LEFT JOIN orcamentos o ON o.id = cml.orcamento_id
LEFT JOIN crm_marcenaria_checklist_progresso cp ON cp.lead_id = cml.id
LEFT JOIN crm_marcenaria_checklist_etapas ce ON ce.id = cp.item_checklist_id
WHERE cml.bloqueado = false
GROUP BY cml.id, o.necessidade, o.local, o.categorias;