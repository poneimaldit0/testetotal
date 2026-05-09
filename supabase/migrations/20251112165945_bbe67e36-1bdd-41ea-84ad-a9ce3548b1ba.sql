-- Atualizar view para incluir tags de marcenaria
DROP VIEW IF EXISTS view_crm_marcenaria_leads CASCADE;

CREATE VIEW view_crm_marcenaria_leads AS
SELECT 
  cml.*,
  o.necessidade,
  o.local,
  o.categorias,
  o.data_inicio,
  o.prazo_inicio_texto,
  
  -- Dias desde criação
  COALESCE(EXTRACT(DAY FROM NOW() - cml.created_at)::INTEGER, 0) AS dias_desde_criacao,
  
  -- Total de notas
  COALESCE((SELECT COUNT(*) FROM crm_marcenaria_notas cmn WHERE cmn.lead_id = cml.id), 0) AS total_notas,
  
  -- Checklist
  COALESCE((SELECT COUNT(*) FROM crm_marcenaria_checklist_progresso cmcp WHERE cmcp.lead_id = cml.id AND cmcp.concluido = false), 0) AS checklist_pendentes,
  COALESCE((SELECT COUNT(*) FROM crm_marcenaria_checklist_progresso cmcp WHERE cmcp.lead_id = cml.id), 0) AS checklist_total,
  COALESCE((SELECT COUNT(*) FROM crm_marcenaria_checklist_progresso cmcp WHERE cmcp.lead_id = cml.id AND cmcp.concluido = true), 0) AS checklist_concluidos,
  
  -- Alerta de checklist
  EXISTS(
    SELECT 1 FROM crm_marcenaria_checklist_progresso cmcp
    JOIN crm_marcenaria_checklist_etapas cmce ON cmce.id = cmcp.item_checklist_id
    WHERE cmcp.lead_id = cml.id 
    AND cmcp.concluido = false 
    AND cmce.etapa_marcenaria = cml.etapa_marcenaria
    AND (cmcp.created_at + INTERVAL '1 day' * cmce.dias_para_alerta) < NOW()
  ) AS tem_alerta_checklist,
  
  -- Dias na etapa atual
  COALESCE(EXTRACT(DAY FROM NOW() - (
    SELECT data_movimentacao FROM crm_marcenaria_historico
    WHERE lead_id = cml.id
    ORDER BY data_movimentacao DESC LIMIT 1
  ))::INTEGER, 0) AS dias_na_etapa_atual,
  
  -- Tarefas
  COALESCE((SELECT COUNT(*) FROM crm_marcenaria_tarefas cmt WHERE cmt.lead_id = cml.id), 0) AS total_tarefas,
  COALESCE((SELECT COUNT(*) FROM crm_marcenaria_tarefas cmt WHERE cmt.lead_id = cml.id AND cmt.data_vencimento = CURRENT_DATE AND cmt.concluida = false), 0) AS tarefas_hoje,
  COALESCE((SELECT COUNT(*) FROM crm_marcenaria_tarefas cmt WHERE cmt.lead_id = cml.id AND cmt.data_vencimento < CURRENT_DATE AND cmt.concluida = false), 0) AS tarefas_atrasadas,
  COALESCE((SELECT COUNT(*) FROM crm_marcenaria_tarefas cmt WHERE cmt.lead_id = cml.id AND cmt.concluida = true), 0) AS tarefas_concluidas,
  
  -- Tags de marcenaria
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'id', mt.id,
          'nome', mt.nome,
          'cor', mt.cor
        )
        ORDER BY mt.nome
      )
      FROM crm_marcenaria_leads_tags mlt
      JOIN crm_marcenaria_tags mt ON mt.id = mlt.tag_id
      WHERE mlt.lead_id = cml.id AND mt.ativo = true
    ),
    '[]'::json
  ) AS tags

FROM crm_marcenaria_leads cml
JOIN orcamentos o ON o.id = cml.orcamento_id;