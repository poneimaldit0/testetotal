-- Recriar a view view_crm_marcenaria_leads para incluir valor_estimado
DROP VIEW IF EXISTS view_crm_marcenaria_leads;

CREATE VIEW view_crm_marcenaria_leads AS
SELECT 
  cml.*,
  -- Contagem de checklist
  COUNT(DISTINCT cmcp.id) FILTER (WHERE cmcp.concluido = false) as checklist_pendentes,
  COUNT(DISTINCT cmcp.id) as checklist_total,
  COUNT(DISTINCT cmcp.id) FILTER (WHERE cmcp.concluido = true) as checklist_concluidos,
  -- Verifica se tem alerta de checklist pendente
  EXISTS (
    SELECT 1 
    FROM crm_marcenaria_checklist_progresso cmcp2
    JOIN crm_marcenaria_checklist_etapas cmce ON cmce.id = cmcp2.item_checklist_id
    WHERE cmcp2.lead_id = cml.id 
      AND cmcp2.concluido = false
      AND cmce.dias_para_alerta > 0
      AND EXTRACT(DAY FROM (NOW() - cml.updated_at)) >= cmce.dias_para_alerta
  ) as tem_alerta_checklist,
  -- Dias na etapa atual
  EXTRACT(DAY FROM (NOW() - cml.updated_at))::INTEGER as dias_na_etapa_atual,
  -- Dados do orçamento
  o.necessidade,
  o.local,
  o.categorias,
  EXTRACT(DAY FROM (NOW() - o.created_at))::INTEGER as dias_desde_criacao,
  -- Total de notas
  COUNT(DISTINCT cmn.id) as total_notas
FROM crm_marcenaria_leads cml
LEFT JOIN orcamentos o ON o.id = cml.orcamento_id
LEFT JOIN crm_marcenaria_checklist_progresso cmcp ON cmcp.lead_id = cml.id
LEFT JOIN crm_marcenaria_notas cmn ON cmn.lead_id = cml.id
GROUP BY 
  cml.id, 
  cml.orcamento_id,
  cml.codigo_orcamento,
  cml.cliente_nome,
  cml.cliente_email,
  cml.cliente_telefone,
  cml.etapa_marcenaria,
  cml.bloqueado,
  cml.data_desbloqueio,
  cml.consultor_responsavel_id,
  cml.consultor_nome,
  cml.ambientes_mobiliar,
  cml.tem_planta,
  cml.tem_medidas,
  cml.tem_fotos,
  cml.estilo_preferido,
  cml.projeto_url,
  cml.projeto_enviado_em,
  cml.reuniao_agendada_para,
  cml.reuniao_realizada_em,
  cml.contratado,
  cml.valor_contrato,
  cml.data_contratacao,
  cml.valor_estimado,
  cml.observacoes_internas,
  cml.feedback_cliente,
  cml.motivo_perda_id,
  cml.justificativa_perda,
  cml.data_perda,
  cml.mensagem_1_enviada,
  cml.mensagem_1_enviada_em,
  cml.mensagem_2_enviada,
  cml.mensagem_2_enviada_em,
  cml.mensagem_3_enviada,
  cml.mensagem_3_enviada_em,
  cml.created_at,
  cml.updated_at,
  o.necessidade,
  o.local,
  o.categorias,
  o.created_at;