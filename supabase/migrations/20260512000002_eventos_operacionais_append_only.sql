-- ============================================================
-- FASE 1 — Hardening: proteção técnica append-only
-- Tabela: eventos_operacionais
-- Data: 2026-05-12
-- ============================================================
--
-- Objetivo:
--   Impedir UPDATE e DELETE na tabela eventos_operacionais,
--   garantindo imutabilidade técnica do histórico de auditoria.
--   Complementa a ausência de políticas RLS para essas operações.
--   service_role também é bloqueado — a proteção é no nível do
--   próprio dado, não da camada de auth.
--
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_eventos_append_only ON public.eventos_operacionais;
--   DROP FUNCTION IF EXISTS public.fn_eventos_append_only();
-- ============================================================


-- ============================================================
-- PARTE 1: Função trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_eventos_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION
    'eventos_operacionais é append-only: UPDATE/DELETE não permitido. id=%', OLD.id
    USING ERRCODE = 'restrict_violation';
END;
$$;

COMMENT ON FUNCTION public.fn_eventos_append_only() IS
  'Garante imutabilidade de eventos_operacionais. '
  'Levanta exceção em qualquer tentativa de UPDATE ou DELETE, '
  'independente de role ou RLS.';


-- ============================================================
-- PARTE 2: Trigger BEFORE UPDATE OR DELETE
-- ============================================================

DROP TRIGGER IF EXISTS trg_eventos_append_only
  ON public.eventos_operacionais;

CREATE TRIGGER trg_eventos_append_only
  BEFORE UPDATE OR DELETE
  ON public.eventos_operacionais
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_eventos_append_only();


-- ============================================================
-- SELECTs de validação pós-migration
-- ============================================================

-- 1. Confirmar que o trigger foi criado
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table  = 'eventos_operacionais'
ORDER BY trigger_name, event_manipulation;

-- 2. Confirmar que a função existe
SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name   = 'fn_eventos_append_only';
