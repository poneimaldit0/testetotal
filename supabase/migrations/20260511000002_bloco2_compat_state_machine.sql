-- ============================================================
-- BLOCO 2: Máquina de Estados Explícita — Compatibilização IA
-- Data: 2026-05-11
-- ============================================================
--
-- Problemas resolvidos:
--   1. status TEXT sem constraint → qualquer string passava
--   2. Propostas excluídas nunca salvas → somiam silenciosamente
--   3. Duplicatas ativas por orcamento_id sem prevenção
--   4. Erros sem detalhe estruturado persistido
--   5. Versão não rastreada
--
-- Estados canônicos após este bloco:
--   processando     → buscando dados, validando candidaturas
--   compatibilizando → chamada Claude em andamento
--   concluida       → IA finalizou, aguarda revisão
--   erro            → falha em qualquer etapa (com erro_detalhe)
--   cancelada       → cancelado manualmente (futuro)
--   pendente_revisao, revisado, aprovado, enviado → workflow consultor (inalterado)
--
-- Backward compat:
--   Valores antigos (pending, completed, failed) incluídos no CHECK.
--   Serão removidos em migration futura após edge function estável.
--
-- RLS: NÃO ALTERADA.
--   Rota100.tsx acessa a tabela com anon key (fluxo /rota100/:token sem auth).
--   Alterar agora quebraria visualização do cliente final.
--   Fix adiado para quando rota100 migrar para auth ou service role proxy.
--
-- Rollback:
--   ALTER TABLE compatibilizacoes_analises_ia DROP CONSTRAINT ck_compat_status;
--   DROP INDEX IF EXISTS idx_compat_orcamento_ativo;
--   ALTER TABLE compatibilizacoes_analises_ia
--     DROP COLUMN IF EXISTS versao,
--     DROP COLUMN IF EXISTS proposta_filtros_log,
--     DROP COLUMN IF EXISTS erro_detalhe;
--   (Não é possível reverter automaticamente os UPDATEs de status —
--    restaurar de backup se necessário)
-- ============================================================


-- ============================================================
-- PARTE 1: Novas colunas de rastreabilidade
-- ============================================================

ALTER TABLE compatibilizacoes_analises_ia
  ADD COLUMN IF NOT EXISTS versao               INTEGER  NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS proposta_filtros_log JSONB,
  ADD COLUMN IF NOT EXISTS erro_detalhe         TEXT;

COMMENT ON COLUMN compatibilizacoes_analises_ia.versao IS
  'Número da versão da análise para este orçamento. Incrementado manualmente no futuro.';

COMMENT ON COLUMN compatibilizacoes_analises_ia.proposta_filtros_log IS
  'Log estruturado das decisões de filtragem por proposta: incluídas, excluídas e motivo técnico de cada exclusão.';

COMMENT ON COLUMN compatibilizacoes_analises_ia.erro_detalhe IS
  'Motivo técnico do erro quando status=erro. Nunca vazio em registros com status=erro.';


-- ============================================================
-- PARTE 2: Deduplicar registros 'pending' simultâneos
-- ============================================================
-- Se existirem múltiplos 'pending' para o mesmo orcamento_id,
-- mantém o mais recente; os demais recebem status='erro'.
-- Garante que o partial unique index (parte 5) possa ser criado.

DO $$
DECLARE
  v_deduplicados integer;
BEGIN
  WITH duplicatas AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY orcamento_id ORDER BY created_at DESC) AS rn
    FROM compatibilizacoes_analises_ia
    WHERE status = 'pending'
  )
  UPDATE compatibilizacoes_analises_ia AS c
  SET
    status       = 'erro',
    erro_detalhe = 'Registro duplicado detectado e deduplicado na migration bloco2 (2026-05-11)'
  FROM duplicatas d
  WHERE c.id = d.id AND d.rn > 1;

  GET DIAGNOSTICS v_deduplicados = ROW_COUNT;
  RAISE NOTICE 'Bloco2 dedup: % registros pending duplicados marcados como erro', v_deduplicados;
END;
$$;


-- ============================================================
-- PARTE 3: Migrar status legados para canônicos
-- ============================================================

DO $$
DECLARE
  v_processando integer;
  v_concluida   integer;
  v_erro        integer;
BEGIN
  UPDATE compatibilizacoes_analises_ia SET status = 'processando'
    WHERE status = 'pending';
  GET DIAGNOSTICS v_processando = ROW_COUNT;

  UPDATE compatibilizacoes_analises_ia SET status = 'concluida'
    WHERE status = 'completed';
  GET DIAGNOSTICS v_concluida = ROW_COUNT;

  UPDATE compatibilizacoes_analises_ia SET status = 'erro'
    WHERE status = 'failed';
  GET DIAGNOSTICS v_erro = ROW_COUNT;

  RAISE NOTICE 'Bloco2 migração status: % pending→processando | % completed→concluida | % failed→erro',
    v_processando, v_concluida, v_erro;
END;
$$;


-- ============================================================
-- PARTE 4: CHECK constraint com valores canônicos + legado
-- ============================================================
-- Legado incluído para segurança durante janela entre migration e deploy.
-- Remover 'pending','completed','failed' em migration futura após confirmar
-- que edge function não grava mais com valores antigos.

ALTER TABLE compatibilizacoes_analises_ia
  DROP CONSTRAINT IF EXISTS ck_compat_status;

ALTER TABLE compatibilizacoes_analises_ia
  ADD CONSTRAINT ck_compat_status CHECK (status IN (
    -- Canônicos novos (edge function pós-bloco2)
    'processando',
    'compatibilizando',
    'concluida',
    'erro',
    'cancelada',
    -- Workflow consultor (inalterado)
    'pendente_revisao',
    'revisado',
    'aprovado',
    'enviado',
    -- Legado backward compat (remover após edge fn estável)
    'pending',
    'completed',
    'failed'
  ));


-- ============================================================
-- PARTE 5: Partial unique index — previne análises ativas duplicadas
-- ============================================================
-- Garante: no máximo 1 registro em (processando | compatibilizando)
-- por orcamento_id ao mesmo tempo.
-- Não impede reprocessamento após 'erro' ou 'concluida'.

DROP INDEX IF EXISTS idx_compat_orcamento_ativo;

CREATE UNIQUE INDEX idx_compat_orcamento_ativo
  ON compatibilizacoes_analises_ia (orcamento_id)
  WHERE status IN ('processando', 'compatibilizando');


-- ============================================================
-- SELECTs de validação pós-migration
-- ============================================================

-- 1. Distribuição de status após migração (não deve ter 'pending','completed','failed')
SELECT status, COUNT(*) AS total
FROM compatibilizacoes_analises_ia
GROUP BY status
ORDER BY status;

-- 2. Confirmar que não restam legados ativos (exceto por backward compat)
SELECT COUNT(*) AS registros_legado_restantes
FROM compatibilizacoes_analises_ia
WHERE status IN ('pending', 'completed', 'failed');

-- 3. Confirmar partial unique index criado
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'compatibilizacoes_analises_ia'
  AND indexname = 'idx_compat_orcamento_ativo';

-- 4. Confirmar novas colunas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'compatibilizacoes_analises_ia'
  AND column_name IN ('versao', 'proposta_filtros_log', 'erro_detalhe')
ORDER BY column_name;

-- 5. Confirmar constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'ck_compat_status';
