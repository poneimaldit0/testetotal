-- Adicionar última nota à view de orçamentos CRM
DROP VIEW IF EXISTS view_orcamentos_crm_com_checklist CASCADE;

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
  
  -- Última Nota
  ultima_nota.id AS ultima_nota_id,
  ultima_nota.conteudo AS ultima_nota_conteudo,
  ultima_nota.criado_por_nome AS ultima_nota_autor,
  ultima_nota.created_at AS ultima_nota_data,
  
  COALESCE(COUNT(DISTINCT cf.id) FILTER (WHERE cf.data_desistencia IS NULL), 0)::INTEGER AS fornecedores_inscritos_count,
  COALESCE(COUNT(DISTINCT cp.id) FILTER (WHERE cp.status = 'aprovado'), 0)::INTEGER AS propostas_enviadas_count,
  COALESCE(COUNT(DISTINCT ccc.id), 0)::INTEGER AS total_itens_checklist,
  COALESCE(COUNT(DISTINCT ccc.id) FILTER (WHERE ccc.concluido = true), 0)::INTEGER AS itens_checklist_concluidos,
  COALESCE(COUNT(DISTINCT ccc.id) FILTER (WHERE ccc.concluido = false), 0)::INTEGER AS checklist_pendentes,
  (EXISTS (
    SELECT 1 
    FROM crm_checklist_progresso ccp
    JOIN crm_checklist_etapas cce ON cce.id = ccp.item_checklist_id
    WHERE ccp.orcamento_id = o.id 
      AND ccp.concluido = false
      AND cce.etapa_crm = oct.etapa_crm
      AND (NOW() - oct.updated_at) >= (cce.dias_para_alerta * INTERVAL '1 day')
  )) AS tem_alertas,
  COALESCE(
    EXTRACT(DAY FROM NOW() - oct.updated_at)::INTEGER,
    0
  ) AS tempo_na_etapa_dias,
  COALESCE(COUNT(DISTINCT t.id), 0)::INTEGER AS total_tarefas,
  COALESCE(COUNT(DISTINCT t.id) FILTER (WHERE t.concluida = true), 0)::INTEGER AS tarefas_concluidas,
  COALESCE(COUNT(DISTINCT t.id) FILTER (WHERE t.concluida = false AND t.data_vencimento < CURRENT_DATE), 0)::INTEGER AS tarefas_atrasadas,
  COALESCE(COUNT(DISTINCT t.id) FILTER (WHERE t.concluida = false AND t.data_vencimento = CURRENT_DATE), 0)::INTEGER AS tarefas_hoje,
  COALESCE(COUNT(DISTINCT n.id), 0)::INTEGER AS total_notas
FROM orcamentos o
LEFT JOIN orcamentos_crm_tracking oct ON oct.orcamento_id = o.id
LEFT JOIN candidaturas_fornecedores cf ON cf.orcamento_id = o.id
LEFT JOIN checklist_propostas cp ON cp.candidatura_id = cf.id
LEFT JOIN profiles p ON p.id = oct.concierge_responsavel_id
LEFT JOIN motivos_perda_crm mp ON mp.id = oct.motivo_perda_id
LEFT JOIN crm_checklist_progresso ccc ON ccc.orcamento_id = o.id
LEFT JOIN crm_orcamentos_tarefas t ON t.orcamento_id = o.id
LEFT JOIN crm_notas_orcamentos n ON n.orcamento_id = o.id
LEFT JOIN LATERAL (
  SELECT id, conteudo, criado_por_nome, created_at
  FROM crm_notas_orcamentos
  WHERE orcamento_id = o.id
  ORDER BY created_at DESC
  LIMIT 1
) ultima_nota ON true
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
  oct.updated_at,
  mp.nome,
  p.nome,
  p.email,
  ultima_nota.id,
  ultima_nota.conteudo,
  ultima_nota.criado_por_nome,
  ultima_nota.created_at;

-- Adicionar última nota à view de leads marcenaria
DROP VIEW IF EXISTS view_crm_marcenaria_leads_com_checklist CASCADE;

CREATE VIEW view_crm_marcenaria_leads_com_checklist AS
SELECT 
  l.id,
  l.orcamento_id,
  l.codigo_orcamento,
  l.cliente_nome,
  l.cliente_email,
  l.cliente_telefone,
  l.etapa_marcenaria,
  l.bloqueado,
  l.data_desbloqueio,
  l.data_criacao_lead,
  l.consultor_responsavel_id,
  COALESCE(p.nome, l.consultor_nome) AS consultor_nome,
  p.email AS consultor_email,
  l.ambientes_mobiliar,
  l.tem_planta,
  l.tem_medidas,
  l.tem_fotos,
  l.estilo_preferido,
  l.projeto_url,
  l.projeto_enviado_em,
  l.reuniao_agendada_para,
  l.reuniao_realizada_em,
  l.contratado,
  l.valor_contrato,
  l.data_contratacao,
  l.observacoes_internas,
  l.feedback_cliente,
  l.valor_estimado,
  l.motivo_perda_id,
  l.justificativa_perda,
  l.data_perda,
  l.mensagem_1_enviada,
  l.mensagem_1_enviada_em,
  l.mensagem_2_enviada,
  l.mensagem_2_enviada_em,
  l.mensagem_3_enviada,
  l.mensagem_3_enviada_em,
  l.created_at,
  l.updated_at,
  
  -- Última Nota
  ultima_nota.id AS ultima_nota_id,
  ultima_nota.conteudo AS ultima_nota_conteudo,
  ultima_nota.criado_por_nome AS ultima_nota_autor,
  ultima_nota.created_at AS ultima_nota_data,
  
  COALESCE(COUNT(DISTINCT cmp.id), 0)::INTEGER AS checklist_total,
  COALESCE(COUNT(DISTINCT cmp.id) FILTER (WHERE cmp.concluido = true), 0)::INTEGER AS checklist_concluidos,
  COALESCE(COUNT(DISTINCT cmp.id) FILTER (WHERE cmp.concluido = false), 0)::INTEGER AS checklist_pendentes,
  (EXISTS (
    SELECT 1 
    FROM crm_marcenaria_checklist_progresso cmcp
    JOIN crm_marcenaria_checklist_etapas cmce ON cmce.id = cmcp.item_checklist_id
    WHERE cmcp.lead_id = l.id 
      AND cmcp.concluido = false
      AND cmce.etapa_marcenaria = l.etapa_marcenaria
      AND (NOW() - l.updated_at) >= (cmce.dias_para_alerta * INTERVAL '1 day')
  )) AS tem_alerta_checklist,
  COALESCE(
    EXTRACT(DAY FROM NOW() - l.updated_at)::INTEGER,
    0
  ) AS tempo_na_etapa_dias,
  COALESCE(
    EXTRACT(DAY FROM NOW() - l.created_at)::INTEGER,
    0
  ) AS dias_desde_criacao,
  COALESCE(COUNT(DISTINCT t.id), 0)::INTEGER AS total_tarefas,
  COALESCE(COUNT(DISTINCT t.id) FILTER (WHERE t.concluida = true), 0)::INTEGER AS tarefas_concluidas,
  COALESCE(COUNT(DISTINCT t.id) FILTER (WHERE t.concluida = false AND t.data_vencimento < CURRENT_DATE), 0)::INTEGER AS tarefas_atrasadas,
  COALESCE(COUNT(DISTINCT t.id) FILTER (WHERE t.concluida = false AND t.data_vencimento = CURRENT_DATE), 0)::INTEGER AS tarefas_hoje,
  COALESCE(COUNT(DISTINCT n.id), 0)::INTEGER AS total_notas
FROM crm_marcenaria_leads l
LEFT JOIN profiles p ON p.id = l.consultor_responsavel_id
LEFT JOIN crm_marcenaria_checklist_progresso cmp ON cmp.lead_id = l.id
LEFT JOIN crm_marcenaria_tarefas t ON t.lead_id = l.id
LEFT JOIN crm_marcenaria_notas n ON n.lead_id = l.id
LEFT JOIN LATERAL (
  SELECT id, conteudo, criado_por_nome, created_at
  FROM crm_marcenaria_notas
  WHERE lead_id = l.id
  ORDER BY created_at DESC
  LIMIT 1
) ultima_nota ON true
GROUP BY 
  l.id,
  l.orcamento_id,
  l.etapa_marcenaria,
  l.cliente_nome,
  l.cliente_email,
  l.cliente_telefone,
  l.codigo_orcamento,
  l.tem_planta,
  l.tem_medidas,
  l.tem_fotos,
  l.consultor_responsavel_id,
  l.consultor_nome,
  l.observacoes_internas,
  l.feedback_cliente,
  l.valor_estimado,
  l.valor_contrato,
  l.data_contratacao,
  l.contratado,
  l.motivo_perda_id,
  l.data_perda,
  l.justificativa_perda,
  l.bloqueado,
  l.data_desbloqueio,
  l.projeto_enviado_em,
  l.projeto_url,
  l.reuniao_agendada_para,
  l.reuniao_realizada_em,
  l.mensagem_1_enviada,
  l.mensagem_1_enviada_em,
  l.mensagem_2_enviada,
  l.mensagem_2_enviada_em,
  l.mensagem_3_enviada,
  l.mensagem_3_enviada_em,
  l.ambientes_mobiliar,
  l.estilo_preferido,
  l.data_criacao_lead,
  l.created_at,
  l.updated_at,
  p.nome,
  p.email,
  ultima_nota.id,
  ultima_nota.conteudo,
  ultima_nota.criado_por_nome,
  ultima_nota.created_at;