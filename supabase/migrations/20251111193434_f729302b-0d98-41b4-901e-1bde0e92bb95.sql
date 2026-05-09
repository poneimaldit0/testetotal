-- Dropar e recriar view do CRM para incluir budget_informado (sem duplicar colunas)
DROP VIEW IF EXISTS view_orcamentos_crm_com_checklist;

CREATE VIEW view_orcamentos_crm_com_checklist AS
SELECT 
  o.*,
  oct.etapa_crm,
  oct.status_contato,
  oct.observacoes_internas,
  oct.feedback_cliente_nota,
  oct.feedback_cliente_comentario,
  oct.concierge_responsavel_id,
  oct.valor_lead_estimado,
  oct.motivo_perda_id,
  oct.justificativa_perda,
  oct.data_conclusao,
  mp.nome AS motivo_perda_nome,
  p.nome AS concierge_nome,
  p.email AS concierge_email,
  COALESCE(COUNT(DISTINCT cf.id) FILTER (WHERE cf.data_desistencia IS NULL), 0)::INTEGER AS fornecedores_inscritos_count,
  COALESCE(COUNT(DISTINCT cp.id) FILTER (WHERE cp.status = 'aprovado'), 0)::INTEGER AS propostas_enviadas_count,
  COALESCE(COUNT(DISTINCT ccc.id), 0)::INTEGER AS total_itens_checklist,
  COALESCE(COUNT(DISTINCT ccc.id) FILTER (WHERE ccc.concluido = true), 0)::INTEGER AS itens_checklist_concluidos,
  COALESCE(COUNT(DISTINCT ccc.id) FILTER (WHERE ccc.concluido = false), 0)::INTEGER AS checklist_pendentes,
  (EXISTS (
    SELECT 1 
    FROM crm_checklist_progresso ccp_alert
    JOIN crm_checklist_etapas cce_alert ON cce_alert.id = ccp_alert.item_checklist_id
    WHERE ccp_alert.orcamento_id = o.id
      AND cce_alert.etapa_crm = oct.etapa_crm
      AND ccp_alert.concluido = false
      AND cce_alert.dias_para_alerta IS NOT NULL
      AND EXTRACT(DAY FROM NOW() - ccp_alert.created_at) >= cce_alert.dias_para_alerta
  )) AS tem_alertas,
  COALESCE(
    EXTRACT(DAY FROM NOW() - (
      SELECT MAX(data_movimentacao) 
      FROM orcamentos_crm_historico 
      WHERE orcamento_id = o.id
    ))::INTEGER,
    EXTRACT(DAY FROM NOW() - o.created_at)::INTEGER
  ) AS tempo_na_etapa_dias,
  COALESCE((SELECT COUNT(*) FROM crm_orcamentos_tarefas WHERE orcamento_id = o.id AND concluida = false), 0)::INTEGER AS total_tarefas,
  COALESCE((SELECT COUNT(*) FROM crm_orcamentos_tarefas WHERE orcamento_id = o.id AND concluida = true), 0)::INTEGER AS tarefas_concluidas,
  COALESCE((SELECT COUNT(*) FROM crm_orcamentos_tarefas WHERE orcamento_id = o.id AND concluida = false AND DATE(data_vencimento) = CURRENT_DATE), 0)::INTEGER AS tarefas_hoje,
  COALESCE((SELECT COUNT(*) FROM crm_orcamentos_tarefas WHERE orcamento_id = o.id AND concluida = false AND data_vencimento < NOW()), 0)::INTEGER AS tarefas_atrasadas
FROM orcamentos o
LEFT JOIN orcamentos_crm_tracking oct ON oct.orcamento_id = o.id
LEFT JOIN candidaturas_fornecedores cf ON cf.orcamento_id = o.id
LEFT JOIN checklist_propostas cp ON cp.candidatura_id = cf.id
LEFT JOIN profiles p ON p.id = oct.concierge_responsavel_id
LEFT JOIN motivos_perda_crm mp ON mp.id = oct.motivo_perda_id
LEFT JOIN crm_checklist_progresso ccc ON ccc.orcamento_id = o.id
WHERE oct.id IS NOT NULL
GROUP BY 
  o.id,
  oct.etapa_crm,
  oct.status_contato,
  oct.observacoes_internas,
  oct.feedback_cliente_nota,
  oct.feedback_cliente_comentario,
  oct.concierge_responsavel_id,
  oct.valor_lead_estimado,
  oct.motivo_perda_id,
  oct.justificativa_perda,
  oct.data_conclusao,
  mp.nome,
  p.nome,
  p.email;