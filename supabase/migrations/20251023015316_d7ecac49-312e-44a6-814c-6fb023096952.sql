-- Adicionar colunas para informações de conclusão
ALTER TABLE orcamentos_crm_tracking 
ADD COLUMN IF NOT EXISTS motivo_perda_id UUID REFERENCES motivos_perda(id),
ADD COLUMN IF NOT EXISTS justificativa_perda TEXT,
ADD COLUMN IF NOT EXISTS data_conclusao TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN orcamentos_crm_tracking.motivo_perda_id IS 
  'Referência ao motivo da perda quando etapa_crm = perdido';
COMMENT ON COLUMN orcamentos_crm_tracking.justificativa_perda IS 
  'Justificativa adicional sobre a perda do orçamento';
COMMENT ON COLUMN orcamentos_crm_tracking.data_conclusao IS 
  'Data em que o orçamento foi marcado como ganho ou perdido';

-- Recriar view para incluir novos campos (DROP e CREATE)
DROP VIEW IF EXISTS view_orcamentos_crm_com_checklist CASCADE;

CREATE VIEW view_orcamentos_crm_com_checklist AS
SELECT 
  vcrm.*,
  oct.valor_lead_estimado,
  oct.motivo_perda_id,
  oct.justificativa_perda,
  oct.data_conclusao,
  mp.nome as motivo_perda_nome,
  mp.descricao as motivo_perda_descricao,
  COALESCE(
    EXTRACT(DAY FROM (NOW() - oct.data_entrada_etapa_atual)),
    0
  )::INTEGER AS tempo_na_etapa_dias,
  CASE 
    WHEN oct.total_itens_checklist > 0 
    THEN ROUND((oct.itens_checklist_concluidos::NUMERIC / oct.total_itens_checklist::NUMERIC) * 100, 0)
    ELSE 0 
  END AS percentual_checklist_concluido,
  oct.tem_alertas_pendentes AS tem_alertas,
  oct.total_itens_checklist,
  oct.itens_checklist_concluidos
FROM view_orcamentos_crm vcrm
INNER JOIN orcamentos_crm_tracking oct ON oct.orcamento_id = vcrm.id
LEFT JOIN motivos_perda mp ON mp.id = oct.motivo_perda_id;