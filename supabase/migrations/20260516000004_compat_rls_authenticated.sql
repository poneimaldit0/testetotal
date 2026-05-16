-- ============================================================
-- BUG FIX: RLS de compatibilizacoes_analises_ia bloqueava o consultor
-- Tabela: compatibilizacoes_analises_ia
-- Data: 2026-05-16
-- ============================================================
--
-- Contexto:
--   A migration original (20260426000000) criou apenas 2 policies:
--     - service_role_all : ALL para service_role (edge functions)
--     - anon_read_by_orcamento : SELECT para anon/authenticated
--
--   O resultado prático: usuários authenticated (admin/consultor) NÃO
--   conseguem INSERT/UPDATE/DELETE. Toda mutação direta via supabase
--   client (ex.: hook useAgendamentoCompat, useConfirmacaoApresentacao)
--   falhava com:
--     "new row violates row-level security policy for table
--      compatibilizacoes_analises_ia"
--
--   Esta migration adiciona uma policy permissiva para authenticated
--   cobrindo INSERT/UPDATE/DELETE. É temporária — em sprint de hardening
--   posterior, pode ser endurecida com filtros por role/owner.
--
-- Por que não restringir mais agora:
--   - Vários hooks no admin (CRM Kanban, Ficha, Painel Compat IA, modal
--     consultor) precisam dessas operações.
--   - Sem service_role no client (e nem deveríamos expor), a única forma
--     de o admin escrever é via policy authenticated.
--   - A coluna orcamento_id já filtra a "tenancy" no nível de leitura;
--     adicionar checagem por orcamento.gestor_conta_id pode ser feito
--     em sprint de hardening dedicado.
--
-- Rollback:
--   DROP POLICY IF EXISTS "authenticated_write_compat"
--     ON public.compatibilizacoes_analises_ia;
-- ============================================================

ALTER TABLE public.compatibilizacoes_analises_ia
  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_write_compat"
  ON public.compatibilizacoes_analises_ia;

CREATE POLICY "authenticated_write_compat"
  ON public.compatibilizacoes_analises_ia
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- SELECTs de validação pós-migration
-- ============================================================

-- Confirmar que a policy foi criada e RLS está habilitada
SELECT
  (SELECT relrowsecurity FROM pg_class
     WHERE relname='compatibilizacoes_analises_ia'
  ) AS rls_habilitada,
  (SELECT COUNT(*) FROM pg_policies
     WHERE schemaname='public'
       AND tablename='compatibilizacoes_analises_ia'
       AND policyname='authenticated_write_compat'
  ) AS policy_criada,
  (SELECT COUNT(*) FROM pg_policies
     WHERE schemaname='public'
       AND tablename='compatibilizacoes_analises_ia'
  ) AS total_policies;
