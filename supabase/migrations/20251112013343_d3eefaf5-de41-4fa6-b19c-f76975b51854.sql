-- Corrigir cálculo de tempo_na_etapa_dias na view
DROP VIEW IF EXISTS view_orcamentos_crm_com_checklist;

CREATE VIEW view_orcamentos_crm_com_checklist AS
SELECT 
  o.*,
  oct.etapa_crm,
  oct.status_contato,
  oct.valor_lead_estimado,
  oct.concierge_responsavel_id,
  oct.updated_at as tracking_updated_at,
  -- Calcular tempo na etapa usando o histórico de movimentações
  COALESCE(
    EXTRACT(day FROM now() - (
      SELECT MAX(data_movimentacao) 
      FROM orcamentos_crm_historico 
      WHERE orcamento_id = o.id 
        AND etapa_nova = oct.etapa_crm
    ))::integer, 
    0
  ) AS tempo_na_etapa_dias,
  -- Status do checklist
  CASE 
    WHEN checklist.total_itens = 0 THEN 'nao_iniciado'
    WHEN checklist.itens_concluidos = 0 THEN 'nao_iniciado'
    WHEN checklist.itens_concluidos < checklist.total_itens THEN 'em_andamento'
    ELSE 'concluido'
  END as status_checklist,
  checklist.itens_concluidos,
  checklist.total_itens,
  checklist.proxima_tarefa,
  checklist.proxima_tarefa_prazo,
  -- Status de tarefas
  CASE
    WHEN tarefas.tem_atrasada THEN 'atrasada'
    WHEN tarefas.tem_hoje THEN 'hoje'
    WHEN tarefas.tem_proxima THEN 'proxima'
    ELSE 'nenhuma'
  END as status_tarefa,
  tarefas.tem_atrasada,
  tarefas.tem_hoje,
  -- Dados do gestor
  p.nome as gestor_nome,
  p.email as gestor_email,
  -- Tags
  array_agg(DISTINCT t.nome) FILTER (WHERE t.nome IS NOT NULL) as tags
FROM orcamentos o
LEFT JOIN orcamentos_crm_tracking oct ON o.id = oct.orcamento_id
LEFT JOIN profiles p ON o.gestor_conta_id = p.id
LEFT JOIN crm_orcamentos_tags ot ON o.id = ot.orcamento_id
LEFT JOIN crm_tags t ON ot.tag_id = t.id
LEFT JOIN LATERAL (
  SELECT 
    COUNT(DISTINCT oce.item_id) as total_itens,
    COUNT(DISTINCT oce.item_id) FILTER (WHERE cp.concluido = true) as itens_concluidos,
    MIN(ce.titulo) FILTER (WHERE cp.concluido IS NULL OR cp.concluido = false) as proxima_tarefa,
    MIN(CURRENT_DATE + ce.dias_para_alerta) FILTER (WHERE cp.concluido IS NULL OR cp.concluido = false) as proxima_tarefa_prazo
  FROM orcamentos_checklist_itens oce
  JOIN crm_checklist_etapas ce ON ce.id = oce.item_id
  LEFT JOIN crm_checklist_progresso cp ON cp.item_checklist_id = oce.item_id AND cp.orcamento_id = o.id
  WHERE oce.orcamento_id = o.id
) checklist ON true
LEFT JOIN LATERAL (
  SELECT 
    bool_or((CURRENT_DATE + ce.dias_para_alerta) < CURRENT_DATE AND (cp.concluido IS NULL OR cp.concluido = false)) as tem_atrasada,
    bool_or((CURRENT_DATE + ce.dias_para_alerta) = CURRENT_DATE AND (cp.concluido IS NULL OR cp.concluido = false)) as tem_hoje,
    bool_or((CURRENT_DATE + ce.dias_para_alerta) > CURRENT_DATE AND (cp.concluido IS NULL OR cp.concluido = false)) as tem_proxima
  FROM orcamentos_checklist_itens oce
  JOIN crm_checklist_etapas ce ON ce.id = oce.item_id
  LEFT JOIN crm_checklist_progresso cp ON cp.item_checklist_id = oce.item_id AND cp.orcamento_id = o.id
  WHERE oce.orcamento_id = o.id
) tarefas ON true
GROUP BY 
  o.id, oct.etapa_crm, oct.status_contato, 
  oct.valor_lead_estimado, oct.concierge_responsavel_id, oct.updated_at,
  checklist.total_itens, checklist.itens_concluidos, 
  checklist.proxima_tarefa, checklist.proxima_tarefa_prazo,
  tarefas.tem_atrasada, tarefas.tem_hoje, tarefas.tem_proxima,
  p.nome, p.email;