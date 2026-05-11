-- Adiciona flag de qualidade de leitura à análise de proposta.
-- completa        → valor, composição e escopo identificados com confiança
-- parcial         → dados extraídos com limitações (ex: PDF escaneado)
-- proposta_incompleta → documento sem estrutura suficiente para análise técnica

ALTER TABLE propostas_analises_ia
  ADD COLUMN IF NOT EXISTS qualidade_leitura TEXT DEFAULT 'completa';

CREATE INDEX IF NOT EXISTS idx_analises_qualidade
  ON propostas_analises_ia(qualidade_leitura);
