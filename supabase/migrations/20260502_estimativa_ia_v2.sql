-- ============================================================
-- Estimativa IA v2 — gerar-estimativa-tecnica campos expandidos
-- Altera 3 tabelas. Todos os ADDs usam IF NOT EXISTS.
-- Não quebra estrutura existente.
-- ============================================================

-- 1. orcamentos: campos opcionais de input (uso futuro no formulário)
--    A IA infere esses valores automaticamente se estiverem vazios.
ALTER TABLE orcamentos
  ADD COLUMN IF NOT EXISTS nivel_reforma  TEXT,
  ADD COLUMN IF NOT EXISTS tipo_imovel   TEXT,
  ADD COLUMN IF NOT EXISTS qtd_ambientes INTEGER;

COMMENT ON COLUMN orcamentos.nivel_reforma  IS 'Opcional. Inferido pela IA se vazio. Valores aceitos: basico, intermediario, alto_padrao, luxo';
COMMENT ON COLUMN orcamentos.tipo_imovel   IS 'Opcional. Inferido pela IA se vazio. Valores aceitos: apartamento, casa, cobertura, comercial, sala_comercial, galpao';
COMMENT ON COLUMN orcamentos.qtd_ambientes IS 'Opcional. Número de ambientes. Melhora a precisão quando tamanho_imovel não é informado';

-- 2. estimativas_tecnicas: campos de output v2
--    Tabela já existe com: id, orcamento_id, status, faixa_min, faixa_media,
--    faixa_alta, custo_m2_estimado, tipologia, perc_mao_obra, perc_materiais,
--    perc_gestao, observacoes, created_at
ALTER TABLE estimativas_tecnicas
  ADD COLUMN IF NOT EXISTS confianca               TEXT,
  ADD COLUMN IF NOT EXISTS fontes                  JSONB        DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS justificativa           TEXT,
  ADD COLUMN IF NOT EXISTS nivel_reforma_detectado TEXT,
  ADD COLUMN IF NOT EXISTS tipo_imovel_detectado   TEXT,
  ADD COLUMN IF NOT EXISTS inputs_snapshot         JSONB,
  ADD COLUMN IF NOT EXISTS historico_interno_count INTEGER      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at              TIMESTAMPTZ;

COMMENT ON COLUMN estimativas_tecnicas.confianca               IS 'Nível de confiança: baixa | media | alta';
COMMENT ON COLUMN estimativas_tecnicas.fontes                  IS 'Array JSON das fontes efetivamente usadas na estimativa';
COMMENT ON COLUMN estimativas_tecnicas.justificativa           IS 'Fundamentação técnica da faixa estimada';
COMMENT ON COLUMN estimativas_tecnicas.nivel_reforma_detectado IS 'Tipologia inferida pela IA: basico | intermediario | alto_padrao | luxo';
COMMENT ON COLUMN estimativas_tecnicas.tipo_imovel_detectado   IS 'Tipo de imóvel inferido pela IA';
COMMENT ON COLUMN estimativas_tecnicas.inputs_snapshot         IS 'Snapshot JSON dos dados de entrada usados na geração';
COMMENT ON COLUMN estimativas_tecnicas.historico_interno_count IS 'Quantidade de leads Reforma100 similares usados como referência';
COMMENT ON COLUMN estimativas_tecnicas.updated_at              IS 'Timestamp da última atualização do registro';

-- 3. orcamentos_crm_tracking: campos operacionais da estimativa IA
--    Esses campos alimentam carteira, metas, comissões e dashboard gerencial.
--    valor_lead_estimado = valor_estimado_ia_medio (mantido em sincronia pela edge function)
ALTER TABLE orcamentos_crm_tracking
  ADD COLUMN IF NOT EXISTS valor_estimado_ia_min            NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS valor_estimado_ia_medio          NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS valor_estimado_ia_max            NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS valor_estimado_ia_confianca      TEXT,
  ADD COLUMN IF NOT EXISTS valor_estimado_ia_justificativa  TEXT;

COMMENT ON COLUMN orcamentos_crm_tracking.valor_estimado_ia_min           IS 'Estimativa IA mínima — gerada por gerar-estimativa-tecnica v2';
COMMENT ON COLUMN orcamentos_crm_tracking.valor_estimado_ia_medio         IS 'Estimativa IA média — mantida em sincronia com valor_lead_estimado';
COMMENT ON COLUMN orcamentos_crm_tracking.valor_estimado_ia_max           IS 'Estimativa IA máxima';
COMMENT ON COLUMN orcamentos_crm_tracking.valor_estimado_ia_confianca     IS 'Confiança da estimativa: baixa | media | alta';
COMMENT ON COLUMN orcamentos_crm_tracking.valor_estimado_ia_justificativa IS 'Justificativa técnica resumida — para exibição em cards e dashboards';
