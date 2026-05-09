CREATE TABLE IF NOT EXISTS avaliacoes_fornecedor (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id    UUID NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  candidatura_id  UUID NOT NULL REFERENCES candidaturas_fornecedores(id) ON DELETE CASCADE,
  rota100_token   TEXT NOT NULL,
  nota_geral      SMALLINT CHECK (nota_geral BETWEEN 1 AND 5),
  notas           JSONB NOT NULL DEFAULT '{}',
  comentario      TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidatura_id, rota100_token)
);

ALTER TABLE avaliacoes_fornecedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cliente_insert" ON avaliacoes_fornecedor
  FOR INSERT WITH CHECK (true);

CREATE POLICY "autenticado_select" ON avaliacoes_fornecedor
  FOR SELECT USING (auth.role() = 'authenticated');
