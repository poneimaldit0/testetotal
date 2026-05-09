-- Recriar a view view_crm_marcenaria_leads incluindo data_inicio e prazo_inicio_texto
DROP VIEW IF EXISTS view_crm_marcenaria_leads;

CREATE OR REPLACE VIEW view_crm_marcenaria_leads AS
SELECT 
  cml.*,
  o.necessidade,
  o.local,
  o.categorias,
  o.data_inicio,
  o.prazo_inicio_texto,
  COALESCE(DATE_PART('day', NOW() - cml.created_at)::integer, 0) as dias_desde_criacao,
  COALESCE((
    SELECT COUNT(*) 
    FROM crm_marcenaria_notas cmn 
    WHERE cmn.lead_id = cml.id
  ), 0) as total_notas_calculado,
  COALESCE((
    SELECT COUNT(*) 
    FROM crm_marcenaria_checklist_progresso cmcp 
    WHERE cmcp.lead_id = cml.id AND cmcp.concluido = false
  ), 0) as checklist_pendentes,
  COALESCE((
    SELECT COUNT(*) 
    FROM crm_marcenaria_checklist_progresso cmcp 
    WHERE cmcp.lead_id = cml.id
  ), 0) as checklist_total,
  COALESCE((
    SELECT COUNT(*) 
    FROM crm_marcenaria_checklist_progresso cmcp 
    WHERE cmcp.lead_id = cml.id AND cmcp.concluido = true
  ), 0) as checklist_concluidos,
  EXISTS(
    SELECT 1 
    FROM crm_marcenaria_checklist_progresso cmcp
    JOIN crm_marcenaria_checklist_etapas cmce ON cmce.id = cmcp.item_checklist_id
    WHERE cmcp.lead_id = cml.id 
      AND cmcp.concluido = false
      AND cmce.etapa_marcenaria = cml.etapa_marcenaria
      AND (cmcp.created_at + INTERVAL '1 day' * cmce.dias_para_alerta) < NOW()
  ) as tem_alerta_checklist,
  COALESCE(DATE_PART('day', NOW() - (
    SELECT data_movimentacao 
    FROM crm_marcenaria_historico 
    WHERE lead_id = cml.id 
    ORDER BY data_movimentacao DESC 
    LIMIT 1
  ))::integer, 0) as dias_na_etapa_atual,
  COALESCE((
    SELECT COUNT(*) 
    FROM crm_marcenaria_tarefas cmt 
    WHERE cmt.lead_id = cml.id
  ), 0) as total_tarefas,
  COALESCE((
    SELECT COUNT(*) 
    FROM crm_marcenaria_tarefas cmt 
    WHERE cmt.lead_id = cml.id 
      AND cmt.data_vencimento = CURRENT_DATE 
      AND cmt.concluida = false
  ), 0) as tarefas_hoje,
  COALESCE((
    SELECT COUNT(*) 
    FROM crm_marcenaria_tarefas cmt 
    WHERE cmt.lead_id = cml.id 
      AND cmt.data_vencimento < CURRENT_DATE 
      AND cmt.concluida = false
  ), 0) as tarefas_atrasadas,
  COALESCE((
    SELECT COUNT(*) 
    FROM crm_marcenaria_tarefas cmt 
    WHERE cmt.lead_id = cml.id 
      AND cmt.concluida = true
  ), 0) as tarefas_concluidas
FROM crm_marcenaria_leads cml
JOIN orcamentos o ON o.id = cml.orcamento_id;