-- Estimativa Técnica Reforma100
-- Gerada pela IA com base no escopo do cliente, ANTES das propostas.
-- Usada como contexto no prompt da análise de proposta (não como regra de decisão).

CREATE TABLE IF NOT EXISTS estimativas_tecnicas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id      UUID NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'pending',  -- pending | completed | failed
  faixa_min         NUMERIC,
  faixa_media       NUMERIC,
  faixa_alta        NUMERIC,
  custo_m2_estimado NUMERIC,
  tipologia         TEXT,
  perc_mao_obra     NUMERIC,
  perc_materiais    NUMERIC,
  perc_gestao       NUMERIC,
  observacoes       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estimativas_orcamento ON estimativas_tecnicas(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_estimativas_status    ON estimativas_tecnicas(status);
CREATE INDEX IF NOT EXISTS idx_estimativas_created   ON estimativas_tecnicas(created_at DESC);

ALTER TABLE estimativas_tecnicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON estimativas_tecnicas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read" ON estimativas_tecnicas
  FOR SELECT TO authenticated USING (true);
