-- Adicionar coluna valor_lead_estimado na tabela orcamentos_crm_tracking
ALTER TABLE orcamentos_crm_tracking 
ADD COLUMN IF NOT EXISTS valor_lead_estimado NUMERIC(12,2) DEFAULT NULL;

COMMENT ON COLUMN orcamentos_crm_tracking.valor_lead_estimado IS 
  'Valor estimado do lead em R$ para acompanhamento comercial';

-- Recriar a view incluindo o novo campo
DROP VIEW IF EXISTS view_orcamentos_crm_com_checklist;

CREATE VIEW view_orcamentos_crm_com_checklist AS
SELECT 
  voc.id,
  voc.codigo_orcamento,
  voc.necessidade,
  voc.local,
  voc.categorias,
  voc.tamanho_imovel,
  voc.dados_contato,
  voc.data_publicacao,
  voc.created_at,
  voc.etapa_crm,
  voc.status_contato,
  voc.observacoes_internas,
  voc.feedback_cliente_nota,
  voc.feedback_cliente_comentario,
  voc.ultima_atualizacao,
  voc.concierge_responsavel_id,
  voc.concierge_nome,
  voc.concierge_email,
  voc.gestor_conta_id,
  voc.gestor_nome,
  voc.fornecedores_inscritos_count,
  voc.propostas_enviadas_count,
  EXTRACT(DAY FROM NOW() - COALESCE(oct.data_entrada_etapa_atual, voc.created_at))::INTEGER AS tempo_na_etapa_dias,
  CASE
    WHEN oct.total_itens_checklist > 0 THEN ROUND(oct.itens_checklist_concluidos::NUMERIC / oct.total_itens_checklist::NUMERIC * 100::NUMERIC, 0)
    ELSE 0::NUMERIC
  END AS percentual_checklist_concluido,
  COALESCE(oct.tem_alertas_pendentes, FALSE) AS tem_alertas,
  COALESCE(oct.total_itens_checklist, 0) AS total_itens_checklist,
  COALESCE(oct.itens_checklist_concluidos, 0) AS itens_checklist_concluidos,
  oct.valor_lead_estimado
FROM view_orcamentos_crm voc
LEFT JOIN orcamentos_crm_tracking oct ON oct.orcamento_id = voc.id;