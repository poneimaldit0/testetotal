-- Corrigir view CRM com checklist - versão simplificada
DROP VIEW IF EXISTS view_orcamentos_crm_com_checklist CASCADE;

CREATE OR REPLACE VIEW view_orcamentos_crm_com_checklist AS
SELECT 
  o.*,
  oct.etapa_crm,
  oct.data_entrada_etapa,
  oct.concierge_responsavel_id,
  oct.status_contato,
  oct.valor_lead_estimado,
  oct.motivo_perda_id,
  
  -- Dados do concierge/gestor responsável
  p.nome AS concierge_nome,
  p.email AS concierge_email,
  
  -- Nome do motivo de perda
  mp.nome AS motivo_perda_nome,
  
  -- Contadores de checklist (tabela CORRETA: crm_checklist_progresso)
  COALESCE(COUNT(DISTINCT ccp.id), 0)::INTEGER AS total_itens_checklist,
  COALESCE(COUNT(DISTINCT ccp.id) FILTER (WHERE ccp.concluido = true), 0)::INTEGER AS itens_checklist_concluidos,
  COALESCE(COUNT(DISTINCT ccp.id) FILTER (WHERE ccp.concluido = false), 0)::INTEGER AS checklist_pendentes,
  
  -- Alerta de checklist pendente
  (EXISTS (
    SELECT 1
    FROM crm_checklist_progresso ccp2
    JOIN crm_checklist_etapas cce ON cce.id = ccp2.item_checklist_id
    WHERE ccp2.orcamento_id = o.id 
      AND ccp2.concluido = false 
      AND cce.etapa_crm = oct.etapa_crm 
      AND oct.etapa_crm NOT IN ('ganho', 'perdido')
      AND (NOW() - ccp2.created_at) >= (cce.dias_para_alerta::double precision * '1 day'::interval)
  )) AS tem_alertas,
  
  -- Contadores de tarefas
  COALESCE(COUNT(DISTINCT t.id), 0)::INTEGER AS total_tarefas,
  COALESCE(COUNT(DISTINCT t.id) FILTER (WHERE t.concluida = true), 0)::INTEGER AS tarefas_concluidas,
  COALESCE(COUNT(DISTINCT t.id) FILTER (WHERE t.concluida = false AND t.data_vencimento < CURRENT_DATE), 0)::INTEGER AS tarefas_atrasadas,
  COALESCE(COUNT(DISTINCT t.id) FILTER (WHERE t.concluida = false AND t.data_vencimento = CURRENT_DATE), 0)::INTEGER AS tarefas_hoje,
  
  -- Contadores de fornecedores
  COALESCE(COUNT(DISTINCT cf.id) FILTER (WHERE cf.data_desistencia IS NULL), 0)::INTEGER AS fornecedores_inscritos_count,
  COALESCE(COUNT(DISTINCT cf.id) FILTER (WHERE cf.proposta_enviada = true AND cf.data_desistencia IS NULL), 0)::INTEGER AS propostas_enviadas_count,
  
  -- Tags
  COALESCE(
    jsonb_agg(
      DISTINCT jsonb_build_object(
        'id', ot.tag_id,
        'nome', ct.nome,
        'cor', ct.cor
      )
    ) FILTER (WHERE ot.tag_id IS NOT NULL),
    '[]'::jsonb
  ) AS tags

FROM orcamentos o
LEFT JOIN orcamentos_crm_tracking oct ON oct.orcamento_id = o.id
LEFT JOIN profiles p ON p.id = oct.concierge_responsavel_id
LEFT JOIN motivos_perda_crm mp ON mp.id = oct.motivo_perda_id
LEFT JOIN crm_checklist_progresso ccp ON ccp.orcamento_id = o.id
LEFT JOIN crm_orcamentos_tarefas t ON t.orcamento_id = o.id
LEFT JOIN candidaturas_fornecedores cf ON cf.orcamento_id = o.id
LEFT JOIN crm_orcamentos_tags ot ON ot.orcamento_id = o.id
LEFT JOIN crm_tags ct ON ct.id = ot.tag_id
GROUP BY 
  o.id,
  oct.etapa_crm,
  oct.data_entrada_etapa,
  oct.concierge_responsavel_id,
  oct.status_contato,
  oct.valor_lead_estimado,
  oct.motivo_perda_id,
  p.nome,
  p.email,
  mp.nome;