-- ============================================================
-- D10+: Status da apresentação + confirmação/reagendamento do cliente
-- Tabela: compatibilizacoes_analises_ia
-- Data: 2026-05-16
-- ============================================================
--
-- Contexto:
--   Migration D10 (20260515000001) adicionou os campos
--   apresentacao_agendada_em / canal / link / observacao — o consultor
--   agenda a apresentação da compatibilização.
--
--   Faltam 5 sinais para fechar o fluxo descrito pelo produto:
--   1. cliente_solicitou_em — o cliente, no Rota100, pediu para a
--      Reforma100 gerar a compatibilização (sinal canônico, 1 fonte).
--      Tabela `compatibilizacoes_solicitacoes` continua sendo log de
--      auditoria (não conflita).
--   2. apresentacao_status — máquina de estados do AGENDAMENTO:
--      agendada → confirmada → realizada (ou no_show, reagendamento_solicitado).
--      Independente do `status` canônico da compat em si.
--   3. apresentacao_confirmada_em — o cliente confirmou a apresentação
--      no Rota100.
--   4. apresentacao_reagendamento_solicitado_em — o cliente pediu
--      reagendamento. Operacional para o consultor.
--   5. apresentacao_reagendamento_motivo — texto livre do cliente.
--
-- Decisões de modelagem:
--   - Apenas colunas adicionais (IF NOT EXISTS). Sem alteração de
--     colunas existentes do D10.
--   - apresentacao_status é nullable e segue CHECK constraint.
--   - cliente_solicitou_em pode ser preenchido MÚLTIPLAS vezes
--     (latest-write-wins) — logging detalhado fica em
--     compatibilizacoes_solicitacoes.
--   - Compatibilidade total: UI atual não lê esses campos novos.
--
-- Rollback:
--   ALTER TABLE compatibilizacoes_analises_ia
--     DROP COLUMN IF EXISTS apresentacao_reagendamento_motivo,
--     DROP COLUMN IF EXISTS apresentacao_reagendamento_solicitado_em,
--     DROP COLUMN IF EXISTS apresentacao_confirmada_em,
--     DROP COLUMN IF EXISTS apresentacao_status,
--     DROP COLUMN IF EXISTS cliente_solicitou_em;
--   ALTER TABLE compatibilizacoes_analises_ia
--     DROP CONSTRAINT IF EXISTS ck_compat_apresentacao_status;
-- ============================================================


-- ============================================================
-- PARTE 1: Novas colunas
-- ============================================================

ALTER TABLE public.compatibilizacoes_analises_ia
  ADD COLUMN IF NOT EXISTS cliente_solicitou_em                     TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS apresentacao_status                      TEXT        NULL,
  ADD COLUMN IF NOT EXISTS apresentacao_confirmada_em               TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS apresentacao_reagendamento_solicitado_em TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS apresentacao_reagendamento_motivo        TEXT        NULL;

COMMENT ON COLUMN public.compatibilizacoes_analises_ia.cliente_solicitou_em IS
  'Quando o cliente solicitou a compatibilização no Rota100. NULL = sem solicitação registrada. Latest-write-wins; log detalhado em compatibilizacoes_solicitacoes.';

COMMENT ON COLUMN public.compatibilizacoes_analises_ia.apresentacao_status IS
  'Estado da apresentação agendada: agendada (consultor agendou) → confirmada (cliente confirmou) → realizada (aconteceu). Estados alternativos: no_show, reagendamento_solicitado.';

COMMENT ON COLUMN public.compatibilizacoes_analises_ia.apresentacao_confirmada_em IS
  'Quando o cliente clicou "Confirmar" no card de apresentação agendada (Rota100). NULL = não confirmou.';

COMMENT ON COLUMN public.compatibilizacoes_analises_ia.apresentacao_reagendamento_solicitado_em IS
  'Quando o cliente clicou "Solicitar reagendamento". NULL = sem pedido pendente.';

COMMENT ON COLUMN public.compatibilizacoes_analises_ia.apresentacao_reagendamento_motivo IS
  'Texto livre informado pelo cliente ao pedir reagendamento.';


-- ============================================================
-- PARTE 2: CHECK constraint para apresentacao_status
-- ============================================================

ALTER TABLE public.compatibilizacoes_analises_ia
  DROP CONSTRAINT IF EXISTS ck_compat_apresentacao_status;

ALTER TABLE public.compatibilizacoes_analises_ia
  ADD CONSTRAINT ck_compat_apresentacao_status CHECK (
    apresentacao_status IS NULL
    OR apresentacao_status IN ('agendada', 'confirmada', 'realizada', 'no_show', 'reagendamento_solicitado')
  );


-- ============================================================
-- PARTE 3: Índices parciais (queries de pendência operacional)
-- ============================================================

-- Pendência "cliente solicitou compat, consultor ainda não agendou"
CREATE INDEX IF NOT EXISTS idx_compat_cliente_solicitou
  ON public.compatibilizacoes_analises_ia (cliente_solicitou_em)
  WHERE cliente_solicitou_em IS NOT NULL;

-- Pendência "cliente pediu reagendamento — consultor precisa agir"
CREATE INDEX IF NOT EXISTS idx_compat_reagendamento_solicitado
  ON public.compatibilizacoes_analises_ia (apresentacao_reagendamento_solicitado_em)
  WHERE apresentacao_reagendamento_solicitado_em IS NOT NULL;

-- Filtros por estado da apresentação
CREATE INDEX IF NOT EXISTS idx_compat_apresentacao_status
  ON public.compatibilizacoes_analises_ia (apresentacao_status)
  WHERE apresentacao_status IS NOT NULL;


-- ============================================================
-- SELECTs de validação pós-migration
-- ============================================================

-- 1. Confirmar colunas criadas (deve retornar 5 linhas)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'compatibilizacoes_analises_ia'
  AND column_name IN (
    'cliente_solicitou_em',
    'apresentacao_status',
    'apresentacao_confirmada_em',
    'apresentacao_reagendamento_solicitado_em',
    'apresentacao_reagendamento_motivo'
  )
ORDER BY column_name;

-- 2. Confirmar CHECK constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'ck_compat_apresentacao_status';

-- 3. Confirmar 3 índices parciais
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename  = 'compatibilizacoes_analises_ia'
  AND indexname IN (
    'idx_compat_cliente_solicitou',
    'idx_compat_reagendamento_solicitado',
    'idx_compat_apresentacao_status'
  )
ORDER BY indexname;

-- 4. Nenhuma linha existente deve ter os campos novos preenchidos (esperado: 0)
SELECT COUNT(*) AS com_sinal_novo
FROM public.compatibilizacoes_analises_ia
WHERE cliente_solicitou_em                     IS NOT NULL
   OR apresentacao_status                      IS NOT NULL
   OR apresentacao_confirmada_em               IS NOT NULL
   OR apresentacao_reagendamento_solicitado_em IS NOT NULL;
