-- Adiciona colunas de rastreamento de visita/reunião por candidatura
ALTER TABLE candidaturas_fornecedores
  ADD COLUMN IF NOT EXISTS token_visita       text UNIQUE DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS visita_confirmada_em timestamptz,
  ADD COLUMN IF NOT EXISTS visita_confirmada_por uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS link_reuniao        text,
  ADD COLUMN IF NOT EXISTS acessos_reuniao     jsonb DEFAULT '[]'::jsonb;

-- Gera token_visita para candidaturas existentes que não têm um ainda
UPDATE candidaturas_fornecedores
SET token_visita = gen_random_uuid()::text
WHERE token_visita IS NULL;
