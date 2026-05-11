-- Fase 4: Compatibilização + Ranking + Consultor
-- Tabela separada da IA do fornecedor (propostas_analises_ia)

CREATE TABLE IF NOT EXISTS compatibilizacoes_analises_ia (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id       UUID REFERENCES orcamentos(id) ON DELETE CASCADE,
  candidaturas_ids   TEXT[]       NOT NULL,  -- IDs das candidaturas comparadas
  status             TEXT         NOT NULL DEFAULT 'pending',
  -- Camada do consultor
  nota_consultor     TEXT,
  ajuste_leitura     TEXT,
  aprovado_por       UUID         REFERENCES auth.users(id),
  aprovado_em        TIMESTAMPTZ,
  -- Resultado da IA
  analise_completa   JSONB,
  raw_response       TEXT,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Status possíveis:
-- pending           → IA processando
-- completed         → IA concluiu, aguarda revisão do consultor
-- failed            → IA falhou
-- pendente_revisao  → enviado para o consultor revisar
-- revisado          → consultor adicionou notas
-- aprovado          → consultor aprovou para envio
-- enviado           → entregue ao cliente

CREATE INDEX IF NOT EXISTS idx_compat_orcamento_id  ON compatibilizacoes_analises_ia(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_compat_status        ON compatibilizacoes_analises_ia(status);
CREATE INDEX IF NOT EXISTS idx_compat_created_at    ON compatibilizacoes_analises_ia(created_at DESC);

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION update_compat_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compat_updated_at
  BEFORE UPDATE ON compatibilizacoes_analises_ia
  FOR EACH ROW EXECUTE FUNCTION update_compat_updated_at();

-- RLS: apenas service_role escreve; anon/authenticated lê pelo orcamento_id
ALTER TABLE compatibilizacoes_analises_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON compatibilizacoes_analises_ia
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_by_orcamento" ON compatibilizacoes_analises_ia
  FOR SELECT TO anon, authenticated
  USING (true);
