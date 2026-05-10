-- cep_classificacoes_ia: cache de classificações socioeconômicas por bairro+cidade+UF
-- Chave geográfica única: (bairro_norm, cidade_norm, uf)
-- Entradas com validado_manualmente = true nunca são sobrescritas pela IA
-- (a proteção acontece via cache-hit-first no cliente e na edge function)

CREATE TABLE IF NOT EXISTS cep_classificacoes_ia (
  id                      UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  bairro_norm             TEXT        NOT NULL,
  cidade_norm             TEXT        NOT NULL,
  uf                      TEXT        NOT NULL,
  classificacao           TEXT        NOT NULL,
  potencial               TEXT        NOT NULL,
  ticket_min              INTEGER,
  ticket_max              INTEGER,
  justificativa           TEXT,
  confianca               TEXT        NOT NULL DEFAULT 'media'
                            CHECK (confianca IN ('alta', 'media', 'baixa', 'insuficiente')),
  fontes                  TEXT[],
  inferencia_ia           BOOLEAN     NOT NULL DEFAULT TRUE,
  inferencia_conservadora BOOLEAN     NOT NULL DEFAULT FALSE,
  revisao_manual          BOOLEAN     NOT NULL DEFAULT FALSE,
  validado_manualmente    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bairro_norm, cidade_norm, uf)
);

CREATE INDEX IF NOT EXISTS idx_cep_class_ia_lookup
  ON cep_classificacoes_ia (bairro_norm, cidade_norm, uf);

ALTER TABLE cep_classificacoes_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cep_class_ia_select" ON cep_classificacoes_ia
  FOR SELECT USING (true);

CREATE POLICY "cep_class_ia_insert" ON cep_classificacoes_ia
  FOR INSERT WITH CHECK (true);

CREATE POLICY "cep_class_ia_update" ON cep_classificacoes_ia
  FOR UPDATE USING (true);
