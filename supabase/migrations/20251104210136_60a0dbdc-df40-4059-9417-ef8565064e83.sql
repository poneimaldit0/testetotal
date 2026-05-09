-- Adicionar contador de checklist pendentes na view
DROP VIEW IF EXISTS public.view_orcamentos_crm_com_checklist;

CREATE VIEW public.view_orcamentos_crm_com_checklist AS
SELECT 
  o.id,
  o.codigo_orcamento,
  o.necessidade,
  o.local,
  o.categorias,
  o.tamanho_imovel,
  o.dados_contato,
  o.data_publicacao,
  o.created_at,
  o.gestor_conta_id,
  
  -- CRM tracking
  t.etapa_crm,
  t.status_contato,
  t.observacoes_internas,
  t.feedback_cliente_nota,
  t.feedback_cliente_comentario,
  t.updated_at as ultima_atualizacao,
  t.valor_lead_estimado,
  t.concierge_responsavel_id,
  t.motivo_perda_id,
  t.justificativa_perda,
  t.data_conclusao,
  
  -- Responsáveis
  p_concierge.nome as concierge_nome,
  p_concierge.email as concierge_email,
  p_gestor.nome as gestor_nome,
  
  -- Motivo perda
  mp.nome as motivo_perda_nome,
  mp.descricao as motivo_perda_descricao,
  
  -- Contadores de fornecedores e propostas
  COUNT(DISTINCT cf.id) FILTER (WHERE cf.data_desistencia IS NULL) as fornecedores_inscritos_count,
  COUNT(DISTINCT cf.id) FILTER (WHERE cf.proposta_enviada = true AND cf.data_desistencia IS NULL) as propostas_enviadas_count,
  
  -- Tempo na etapa
  EXTRACT(DAY FROM (NOW() - t.updated_at))::INTEGER as tempo_na_etapa_dias,
  
  -- Checklist
  CASE 
    WHEN COUNT(pc.id) > 0 THEN 
      ROUND((COUNT(pc.id) FILTER (WHERE pc.concluido = true)::NUMERIC / COUNT(pc.id)::NUMERIC) * 100)::INTEGER
    ELSE 0 
  END as percentual_checklist_concluido,
  
  EXISTS (
    SELECT 1 
    FROM public.crm_checklist_progresso pc2
    JOIN public.crm_checklist_etapas ce ON ce.id = pc2.item_checklist_id
    WHERE pc2.orcamento_id = o.id 
      AND pc2.concluido = false
      AND ce.dias_para_alerta > 0
      AND t.updated_at < NOW() - (ce.dias_para_alerta || ' days')::INTERVAL
  ) as tem_alertas,
  
  COUNT(DISTINCT pc.id)::INTEGER as total_itens_checklist,
  COUNT(DISTINCT pc.id) FILTER (WHERE pc.concluido = true)::INTEGER as itens_checklist_concluidos,
  
  -- Contador de checklist pendentes (com alerta)
  COALESCE((
    SELECT COUNT(DISTINCT pc2.id)
    FROM public.crm_checklist_progresso pc2
    JOIN public.crm_checklist_etapas ce ON ce.id = pc2.item_checklist_id
    WHERE pc2.orcamento_id = o.id 
      AND pc2.concluido = false
      AND ce.dias_para_alerta > 0
      AND t.updated_at < NOW() - (ce.dias_para_alerta || ' days')::INTERVAL
  ), 0)::integer as checklist_pendentes,
  
  -- Contadores de tarefas
  COALESCE(COUNT(DISTINCT tar.id) FILTER (WHERE tar.concluida = false), 0)::integer as total_tarefas,
  COALESCE(COUNT(DISTINCT tar.id) FILTER (WHERE tar.data_vencimento = CURRENT_DATE AND tar.concluida = false), 0)::integer as tarefas_hoje,
  COALESCE(COUNT(DISTINCT tar.id) FILTER (WHERE tar.data_vencimento < CURRENT_DATE AND tar.concluida = false), 0)::integer as tarefas_atrasadas,
  COALESCE(COUNT(DISTINCT tar.id) FILTER (WHERE tar.concluida = true), 0)::integer as tarefas_concluidas

FROM public.orcamentos o
JOIN public.orcamentos_crm_tracking t ON t.orcamento_id = o.id
LEFT JOIN public.profiles p_concierge ON p_concierge.id = t.concierge_responsavel_id
LEFT JOIN public.profiles p_gestor ON p_gestor.id = o.gestor_conta_id
LEFT JOIN public.motivos_perda_crm mp ON mp.id = t.motivo_perda_id
LEFT JOIN public.candidaturas_fornecedores cf ON cf.orcamento_id = o.id
LEFT JOIN public.crm_checklist_progresso pc ON pc.orcamento_id = o.id
LEFT JOIN public.crm_orcamentos_tarefas tar ON tar.orcamento_id = o.id
GROUP BY 
  o.id, o.gestor_conta_id, t.etapa_crm, t.status_contato, t.observacoes_internas,
  t.feedback_cliente_nota, t.feedback_cliente_comentario, t.updated_at,
  t.valor_lead_estimado, t.concierge_responsavel_id, t.motivo_perda_id,
  t.justificativa_perda, t.data_conclusao,
  p_concierge.nome, p_concierge.email, p_gestor.nome,
  mp.nome, mp.descricao;

COMMENT ON VIEW public.view_orcamentos_crm_com_checklist IS 
  'View consolidada de orçamentos CRM com checklist, tarefas e contador de checklist pendentes';