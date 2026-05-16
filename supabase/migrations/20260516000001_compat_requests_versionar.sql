-- ============================================================
-- Versionamento da tabela compat_requests (já existia em prod)
-- Data: 2026-05-16
-- ============================================================
--
-- Contexto:
--   A tabela `compat_requests` é usada em produção via
--   `src/lib/rota100Storage.ts` e `supabase/functions/rota100-dados/index.ts`
--   mas nunca foi versionada em migrations.
--
--   Esta migration documenta o schema atual de forma idempotente:
--   - `CREATE TABLE IF NOT EXISTS` → no-op se a tabela já existir em prod
--   - Em ambientes novos (dev, staging novo), cria a tabela com o schema esperado
--
--   Sem alteração de dados existentes. Sem remoção de coluna.
--
-- Schema (extraído do código que escreve em rota100Storage.ts:saveCompatRequest):
--   - token: identificador único da solicitação (gerado client-side)
--   - cliente_nome: nome do cliente para exibição
--   - solicitado_em: timestamp ISO de quando o cliente solicitou
--   - status: 'pendente' | 'visualizado' | 'enviado'
--   - tipo: 'completa' | 'individual'
--   - obra_id / consultor_id / empresa_id / orcamento_id: refs opcionais
--
-- Rollback:
--   DROP TABLE IF EXISTS public.compat_requests;
-- ============================================================

-- ============================================================
-- PARTE 1: Criar a tabela se ainda não existir (no-op em prod)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.compat_requests (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  token         TEXT         NOT NULL UNIQUE,
  cliente_nome  TEXT         NOT NULL,
  solicitado_em TEXT         NOT NULL,
  status        TEXT         NOT NULL DEFAULT 'pendente',
  tipo          TEXT         NOT NULL,
  obra_id       TEXT         NULL,
  consultor_id  TEXT         NULL,
  empresa_id    TEXT         NULL,
  orcamento_id  TEXT         NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.compat_requests IS
  'Solicitações de geração de compatibilização (legado pré-versionamento). Versionada em 2026-05-16 para regularizar o schema.';


-- ============================================================
-- PARTE 2: Garantir coluna created_at (tabela em prod não tinha)
-- ATENÇÃO: precisa rodar ANTES dos índices que referenciam created_at.
-- ============================================================
ALTER TABLE public.compat_requests
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();


-- ============================================================
-- PARTE 3: CHECK constraints (DROP+ADD para garantir estado idempotente)
-- ============================================================
ALTER TABLE public.compat_requests
  DROP CONSTRAINT IF EXISTS ck_compat_requests_status;
ALTER TABLE public.compat_requests
  ADD CONSTRAINT ck_compat_requests_status CHECK (
    status IN ('pendente', 'visualizado', 'enviado')
  );

ALTER TABLE public.compat_requests
  DROP CONSTRAINT IF EXISTS ck_compat_requests_tipo;
ALTER TABLE public.compat_requests
  ADD CONSTRAINT ck_compat_requests_tipo CHECK (
    tipo IN ('completa', 'individual')
  );


-- ============================================================
-- PARTE 4: Habilitar RLS (idempotente — no-op se já habilitada)
-- Policy permissiva que preserva o comportamento atual do código
-- (rota100Storage + edge function). Pode ser endurecida em sprint
-- de hardening posterior.
-- ============================================================
ALTER TABLE public.compat_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compat_requests_access_temporario" ON public.compat_requests;
CREATE POLICY "compat_requests_access_temporario"
  ON public.compat_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- PARTE 5: Índices usados pelas queries do código
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_compat_requests_token
  ON public.compat_requests (token);

CREATE INDEX IF NOT EXISTS idx_compat_requests_orcamento_id
  ON public.compat_requests (orcamento_id)
  WHERE orcamento_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_compat_requests_status_pendente
  ON public.compat_requests (status, created_at DESC)
  WHERE status = 'pendente';


-- ============================================================
-- SELECTs de validação
-- ============================================================

-- 1. Confirmar que a tabela existe
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'compat_requests';

-- 2. Confirmar índices criados
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'compat_requests'
ORDER BY indexname;

-- 3. Confirmar constraints CHECK
SELECT constraint_name
FROM information_schema.check_constraints
WHERE constraint_name IN ('ck_compat_requests_status', 'ck_compat_requests_tipo');
