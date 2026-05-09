-- Pré-confirmação do fornecedor para visita presencial ou reunião online.
-- Registrado pelo fornecedor no painel; validação oficial permanece com o SDR.
--
-- pre_confirmado_em:  quando o fornecedor pré-confirmou presença
-- pre_confirmado_via: origem do registro (painel_fornecedor | notificacao_24h | notificacao_12h | notificacao_6h)

ALTER TABLE candidaturas_fornecedores
  ADD COLUMN IF NOT EXISTS pre_confirmado_em  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pre_confirmado_via TEXT;
