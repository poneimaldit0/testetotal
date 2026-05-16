-- ============================================================
-- Sprint F: Permitir agendamento PROATIVO da compatibilização
-- Tabela: compatibilizacoes_analises_ia
-- Data: 2026-05-16
-- ============================================================
--
-- Contexto:
--   Até agora, a linha em compatibilizacoes_analises_ia só era criada
--   quando a IA rodava (após propostas enviadas). Mas o fluxo correto
--   é que o consultor AGENDE a apresentação assim que recebe a ficha,
--   ANTES de qualquer proposta. A data agendada vira o PRAZO LIMITE
--   para os fornecedores enviarem propostas.
--
--   Por isso, precisamos:
--   1. Novo status: 'agendamento_pendente' — consultor agendou, IA
--      ainda não rodou (e talvez nem hajam propostas ainda).
--   2. Permitir candidaturas_ids vazio quando status é
--      'agendamento_pendente' (não há propostas ainda).
--
--   O CHECK de status foi definido na migration
--   20260511000002_bloco2_compat_state_machine.sql.
--
-- Decisões de modelagem:
--   - Apenas alteração do CHECK constraint (DROP+ADD idempotente).
--   - candidaturas_ids continua NOT NULL no schema, mas array vazio
--     é tecnicamente válido em PostgreSQL — sem alteração de schema.
--   - 'agendamento_pendente' NÃO entra em ESTADOS_ATIVOS do
--     auto-recover de 10 min do useCompatibilizacaoIA — fica isento
--     do timeout (consultor pode agendar com semanas de antecedência).
--
-- Rollback:
--   ALTER TABLE compatibilizacoes_analises_ia
--     DROP CONSTRAINT IF EXISTS ck_compat_status;
--   ALTER TABLE compatibilizacoes_analises_ia
--     ADD CONSTRAINT ck_compat_status CHECK (status IN (
--       'processando','compatibilizando','concluida','erro','cancelada',
--       'pendente_revisao','revisado','aprovado','enviado',
--       'pending','completed','failed'
--     ));
-- ============================================================


-- ============================================================
-- PARTE 1: Atualizar CHECK constraint do status canônico
-- ============================================================

ALTER TABLE public.compatibilizacoes_analises_ia
  DROP CONSTRAINT IF EXISTS ck_compat_status;

ALTER TABLE public.compatibilizacoes_analises_ia
  ADD CONSTRAINT ck_compat_status CHECK (status IN (
    -- NOVO: agendado pelo consultor antes da IA / propostas
    'agendamento_pendente',
    -- Canônicos da edge function (pós-bloco2)
    'processando',
    'compatibilizando',
    'concluida',
    'erro',
    'cancelada',
    -- Workflow consultor
    'pendente_revisao',
    'revisado',
    'aprovado',
    'enviado',
    -- Legados (mantidos para backward compat)
    'pending',
    'completed',
    'failed'
  ));


-- ============================================================
-- PARTE 2: Índice para queries de "agendamentos sem propostas"
-- ============================================================
-- Usado pelas telas que listam compats agendadas aguardando análise.

CREATE INDEX IF NOT EXISTS idx_compat_agendamento_pendente
  ON public.compatibilizacoes_analises_ia (apresentacao_agendada_em)
  WHERE status = 'agendamento_pendente';


-- ============================================================
-- SELECTs de validação pós-migration
-- ============================================================

-- 1. Confirmar que o CHECK inclui 'agendamento_pendente'
SELECT constraint_name,
       check_clause LIKE '%agendamento_pendente%' AS tem_agendamento_pendente
FROM information_schema.check_constraints
WHERE constraint_name = 'ck_compat_status';

-- 2. Confirmar índice criado
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname='public'
  AND tablename='compatibilizacoes_analises_ia'
  AND indexname='idx_compat_agendamento_pendente';

-- 3. Smoke test: tentar inserir uma linha de teste e fazer rollback (manual,
-- não executar em prod com dados):
-- BEGIN;
--   INSERT INTO public.compatibilizacoes_analises_ia
--     (orcamento_id, candidaturas_ids, status, apresentacao_agendada_em)
--   VALUES
--     ('<orcamento_id_real>', '{}', 'agendamento_pendente', now() + interval '7 days');
-- ROLLBACK;
