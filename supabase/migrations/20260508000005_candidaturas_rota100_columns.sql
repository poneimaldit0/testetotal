-- Colunas para fluxo operacional Rota100
-- QR único, confirmação presencial, tracking de reunião, auditoria
--
-- token_visita:        token único por candidatura — valida acesso ao link de reunião
-- link_reuniao:        URL da reunião online (Google Meet, Zoom etc.)
-- acessos_reuniao:     log JSONB de cada entrada na reunião (quem, quando, user_agent)
-- visita_confirmada_em:  timestamp da confirmação presencial via QR
-- visita_confirmada_por: UUID do fornecedor que confirmou a visita

ALTER TABLE candidaturas_fornecedores
  ADD COLUMN IF NOT EXISTS token_visita           TEXT,
  ADD COLUMN IF NOT EXISTS link_reuniao            TEXT,
  ADD COLUMN IF NOT EXISTS acessos_reuniao         JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS visita_confirmada_em    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS visita_confirmada_por   UUID;

-- Gerar token_visita para candidaturas já existentes (backward compat)
UPDATE candidaturas_fornecedores
  SET token_visita = gen_random_uuid()::TEXT
  WHERE token_visita IS NULL;

-- Default para novas candidaturas
ALTER TABLE candidaturas_fornecedores
  ALTER COLUMN token_visita SET DEFAULT gen_random_uuid()::TEXT;

-- Índice único para lookup rápido pelo token
CREATE UNIQUE INDEX IF NOT EXISTS candidaturas_token_visita_idx
  ON candidaturas_fornecedores (token_visita)
  WHERE token_visita IS NOT NULL;
