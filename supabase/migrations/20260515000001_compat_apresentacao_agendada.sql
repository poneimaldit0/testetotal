-- ============================================================
-- D10: Compatibilização agendada
-- Tabela: compatibilizacoes_analises_ia
-- Data: 2026-05-15
-- ============================================================
--
-- Objetivo:
--   Permitir que o consultor agende a apresentação da compatibilização
--   ao cliente (data/hora/canal/link), expondo essa informação no
--   Rota100 do cliente e na Ficha do fornecedor.
--   Mesmo padrão operacional da visita técnica — sem criar sistema
--   paralelo.
--
-- Decisões de modelagem:
--   - Apenas colunas adicionais (IF NOT EXISTS). Não cria tabela nova.
--   - apresentacao_agendada_em é o sinal canônico (quando preenchido,
--     há agendamento). Demais colunas são opcionais.
--   - apresentacao_canal: CHECK constraint para valores conhecidos +
--     NULL permitido.
--   - Sem alteração na máquina de estados existente (Bloco2). O
--     agendamento é independente do status (consultor pode agendar
--     antes mesmo de aprovar).
--   - Sem migration de dados: tudo NULL por default.
--
-- Compatibilidade:
--   - Rota100, Ficha fornecedor e consultor continuam funcionando se
--     as colunas estiverem NULL (campos novos só renderizam quando
--     preenchidos).
--   - useCompatibilizacaoIA não lê esses campos hoje — UI nova lê
--     diretamente.
--
-- Rollback:
--   ALTER TABLE compatibilizacoes_analises_ia
--     DROP COLUMN IF EXISTS apresentacao_observacao,
--     DROP COLUMN IF EXISTS apresentacao_link,
--     DROP COLUMN IF EXISTS apresentacao_canal,
--     DROP COLUMN IF EXISTS apresentacao_agendada_em;
--   ALTER TABLE compatibilizacoes_analises_ia
--     DROP CONSTRAINT IF EXISTS ck_compat_apresentacao_canal;
-- ============================================================


-- ============================================================
-- PARTE 1: Colunas novas
-- ============================================================

ALTER TABLE public.compatibilizacoes_analises_ia
  ADD COLUMN IF NOT EXISTS apresentacao_agendada_em TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS apresentacao_canal       TEXT         NULL,
  ADD COLUMN IF NOT EXISTS apresentacao_link        TEXT         NULL,
  ADD COLUMN IF NOT EXISTS apresentacao_observacao  TEXT         NULL;

COMMENT ON COLUMN public.compatibilizacoes_analises_ia.apresentacao_agendada_em IS
  'Data/hora marcada pelo consultor para apresentar a compatibilização ao cliente. NULL = sem agendamento.';

COMMENT ON COLUMN public.compatibilizacoes_analises_ia.apresentacao_canal IS
  'Canal da apresentação: presencial, online, whatsapp, email. NULL quando não definido.';

COMMENT ON COLUMN public.compatibilizacoes_analises_ia.apresentacao_link IS
  'Link da reunião (Meet/Zoom/etc.) quando canal=online. Opcional para outros canais.';

COMMENT ON COLUMN public.compatibilizacoes_analises_ia.apresentacao_observacao IS
  'Observação livre do consultor sobre a apresentação agendada.';


-- ============================================================
-- PARTE 2: CHECK constraint para apresentacao_canal
-- ============================================================
-- NULL permitido. Valores conhecidos: presencial/online/whatsapp/email.

ALTER TABLE public.compatibilizacoes_analises_ia
  DROP CONSTRAINT IF EXISTS ck_compat_apresentacao_canal;

ALTER TABLE public.compatibilizacoes_analises_ia
  ADD CONSTRAINT ck_compat_apresentacao_canal CHECK (
    apresentacao_canal IS NULL
    OR apresentacao_canal IN ('presencial', 'online', 'whatsapp', 'email')
  );


-- ============================================================
-- PARTE 3: Índice parcial — apenas linhas com agendamento futuro
-- ============================================================
-- Usado por queries de "próximas apresentações" e SLA do consultor.
-- Parcial para manter o índice enxuto.

CREATE INDEX IF NOT EXISTS idx_compat_apresentacao_agendada
  ON public.compatibilizacoes_analises_ia (apresentacao_agendada_em)
  WHERE apresentacao_agendada_em IS NOT NULL;


-- ============================================================
-- SELECTs de validação pós-migration
-- ============================================================

-- 1. Confirmar colunas criadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'compatibilizacoes_analises_ia'
  AND column_name IN ('apresentacao_agendada_em', 'apresentacao_canal', 'apresentacao_link', 'apresentacao_observacao')
ORDER BY column_name;

-- 2. Confirmar constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'ck_compat_apresentacao_canal';

-- 3. Confirmar índice parcial
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename  = 'compatibilizacoes_analises_ia'
  AND indexname  = 'idx_compat_apresentacao_agendada';

-- 4. Nenhuma linha existente deve ter agendamento (NULL por default)
SELECT COUNT(*) AS com_agendamento
FROM public.compatibilizacoes_analises_ia
WHERE apresentacao_agendada_em IS NOT NULL;
