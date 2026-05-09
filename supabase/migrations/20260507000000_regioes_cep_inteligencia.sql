-- Base de inteligência de regiões (sem coordenadas, match por bairro/cidade)
CREATE TABLE IF NOT EXISTS regioes_estrategicas (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  cidade          TEXT        NOT NULL,
  bairro          TEXT,
  estado          TEXT        NOT NULL DEFAULT 'SP',
  classificacao   TEXT        NOT NULL CHECK (classificacao IN (
                    'Premium A+', 'Premium A', 'A-', 'B+', 'B', 'Oportunidade', 'Periférico com potencial'
                  )),
  potencial       TEXT        NOT NULL CHECK (potencial IN ('alto', 'médio', 'baixo')),
  zona            TEXT        NOT NULL CHECK (zona IN ('capital', 'metropolitana', 'litoral', 'expansão', 'fora')),
  status_regiao   TEXT        NOT NULL DEFAULT 'ativa' CHECK (status_regiao IN ('ativa', 'expansão', 'fora')),
  descricao       TEXT,
  faixa_valor_min INTEGER,
  faixa_valor_max INTEGER,
  ativo           BOOLEAN     NOT NULL DEFAULT TRUE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Histórico de consultas de CEP (inteligência interna)
CREATE TABLE IF NOT EXISTS cep_pesquisas (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  cep           TEXT        NOT NULL,
  bairro        TEXT,
  cidade        TEXT,
  uf            TEXT,
  ibge          TEXT,
  zona          TEXT,
  classificacao TEXT,
  potencial     TEXT,
  status_regiao TEXT,
  lead_id       UUID,
  sdr_id        UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regioes_bairro_cidade
  ON regioes_estrategicas (lower(bairro), lower(cidade))
  WHERE bairro IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_regioes_cidade
  ON regioes_estrategicas (lower(cidade));

CREATE INDEX IF NOT EXISTS idx_cep_pesquisas_cep
  ON cep_pesquisas (cep);

CREATE INDEX IF NOT EXISTS idx_cep_pesquisas_created
  ON cep_pesquisas (created_at DESC);

ALTER TABLE regioes_estrategicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cep_pesquisas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "regioes_select" ON regioes_estrategicas
  FOR SELECT USING (true);

CREATE POLICY "cep_pesquisas_insert" ON cep_pesquisas
  FOR INSERT WITH CHECK (true);

CREATE POLICY "cep_pesquisas_select" ON cep_pesquisas
  FOR SELECT USING (true);
