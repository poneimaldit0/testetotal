-- ============================================================
-- BLOCO 1: Fechar desconexão SDR → CRM
-- Data: 2026-05-11
-- ============================================================
--
-- Problema raiz:
--   mover_orcamento_etapa retornava {success:false} quando não existia
--   row em orcamentos_crm_tracking. PaginaSDR não verifica o JSON de
--   retorno — só verifica o erro HTTP. Resultado: SDR exibia sucesso,
--   mas etapa_crm nunca avançava. Lead ficava invisível no CRM Kanban.
--
-- Esta migration corrige em 3 camadas:
--   1. mover_orcamento_etapa — cria tracking row se não existir
--   2. Trigger de segurança em candidaturas_fornecedores
--   3. Backfill de registros antigos já com visita/reunião realizada
--
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_auto_mover_crm_apos_atendimento
--     ON candidaturas_fornecedores;
--   DROP FUNCTION IF EXISTS fn_auto_mover_crm_apos_atendimento();
--   (restaurar mover_orcamento_etapa da migration 20251105150755)
-- ============================================================


-- ============================================================
-- PARTE 1: Corrigir mover_orcamento_etapa
-- ============================================================
-- Quando não existe tracking row: cria e move diretamente.
-- Quando existe: atualiza normalmente.
-- Em ambos os casos: registra no histórico e retorna success:true.
-- ============================================================

DROP FUNCTION IF EXISTS public.mover_orcamento_etapa(uuid, text, uuid, text);

CREATE OR REPLACE FUNCTION public.mover_orcamento_etapa(
  p_orcamento_id uuid,
  p_nova_etapa   text,
  p_usuario_id   uuid,
  p_observacao   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_etapa_atual    text;
  v_usuario_nome   text;
  v_concierge_id   uuid;
  v_tracking_criado boolean := false;
BEGIN
  -- 1. Buscar etapa atual (se existir)
  SELECT etapa_crm::text INTO v_etapa_atual
  FROM orcamentos_crm_tracking
  WHERE orcamento_id = p_orcamento_id;

  -- 2. Buscar nome do usuário para o histórico
  SELECT nome INTO v_usuario_nome
  FROM profiles
  WHERE id = p_usuario_id;

  IF v_etapa_atual IS NULL THEN
    -- Sem tracking row: criar agora para não bloquear o fluxo SDR

    -- Determinar concierge: gestor do orçamento > admin > usuário atual
    SELECT gestor_conta_id INTO v_concierge_id
    FROM orcamentos
    WHERE id = p_orcamento_id;

    IF v_concierge_id IS NULL THEN
      SELECT id INTO v_concierge_id
      FROM profiles
      WHERE tipo_usuario IN ('admin', 'master')
        AND status = 'ativo'
      LIMIT 1;
    END IF;

    IF v_concierge_id IS NULL THEN
      v_concierge_id := p_usuario_id;
    END IF;

    INSERT INTO orcamentos_crm_tracking (
      orcamento_id,
      etapa_crm,
      status_contato,
      concierge_responsavel_id,
      data_entrada_etapa
    ) VALUES (
      p_orcamento_id,
      p_nova_etapa::etapa_crm_enum,
      'sem_contato'::status_contato_enum,
      v_concierge_id,
      NOW()
    )
    ON CONFLICT (orcamento_id) DO NOTHING;
    -- ON CONFLICT: se outro processo criou o row entre o SELECT e o INSERT,
    -- simplesmente ignora — o UPDATE abaixo ainda não rodou, mas o histórico
    -- será registrado com a etapa virtual 'orcamento_postado'

    v_etapa_atual     := 'orcamento_postado'; -- etapa virtual para log
    v_tracking_criado := true;

  ELSE
    -- Tracking existe: avança para nova etapa
    UPDATE orcamentos_crm_tracking
    SET
      etapa_crm          = p_nova_etapa::etapa_crm_enum,
      updated_at         = NOW(),
      data_entrada_etapa = NOW()
    WHERE orcamento_id = p_orcamento_id;
  END IF;

  -- 3. Registrar no histórico (sempre, em ambos os caminhos)
  INSERT INTO orcamentos_crm_historico (
    orcamento_id,
    etapa_anterior,
    etapa_nova,
    movido_por_id,
    movido_por_nome,
    observacao
  ) VALUES (
    p_orcamento_id,
    v_etapa_atual::etapa_crm_enum,
    p_nova_etapa::etapa_crm_enum,
    p_usuario_id,
    COALESCE(v_usuario_nome, 'Sistema'),
    COALESCE(
      p_observacao,
      CASE WHEN v_tracking_criado
        THEN 'Tracking inicializado automaticamente — lead liberado para o CRM'
        ELSE NULL
      END
    )
  );

  RETURN jsonb_build_object(
    'success',          true,
    'message',          'Orçamento movido com sucesso',
    'etapa_anterior',   v_etapa_atual,
    'etapa_nova',       p_nova_etapa,
    'tracking_criado',  v_tracking_criado
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'database_error',
      'message', 'Erro ao mover orçamento: ' || SQLERRM
    );
END;
$function$;

COMMENT ON FUNCTION public.mover_orcamento_etapa IS
  'Move orçamento entre etapas do CRM. Cria tracking row se não existir (nunca retorna not_found).';


-- ============================================================
-- PARTE 2: Trigger de segurança em candidaturas_fornecedores
-- ============================================================
-- Dispara AFTER UPDATE OF status_acompanhamento.
-- Quando valor muda para visita_realizada ou reuniao_realizada:
--   - UPSERT em orcamentos_crm_tracking com etapa em_orcamento
--   - Nunca regride se etapa já for mais avançada
--   - Nunca bloqueia a atualização da candidatura (EXCEPTION silenciosa)
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_auto_mover_crm_apos_atendimento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_concierge_id uuid;
BEGIN
  -- Guarda 1: apenas quando muda para os status-alvo
  IF NEW.status_acompanhamento NOT IN ('visita_realizada', 'reuniao_realizada') THEN
    RETURN NEW;
  END IF;

  -- Guarda 2: apenas quando o valor realmente mudou
  IF OLD.status_acompanhamento IS NOT DISTINCT FROM NEW.status_acompanhamento THEN
    RETURN NEW;
  END IF;

  -- Guarda 3: precisa de orcamento_id
  IF NEW.orcamento_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar concierge: gestor do orçamento > primeiro admin ativo
  SELECT gestor_conta_id INTO v_concierge_id
  FROM orcamentos
  WHERE id = NEW.orcamento_id;

  IF v_concierge_id IS NULL THEN
    SELECT id INTO v_concierge_id
    FROM profiles
    WHERE tipo_usuario IN ('admin', 'master')
      AND status = 'ativo'
    LIMIT 1;
  END IF;

  -- UPSERT idempotente:
  --   INSERT: cria com em_orcamento se não existir
  --   DO UPDATE: avança para em_orcamento se etapa for inicial
  --   WHERE no DO UPDATE: nunca regride se já estiver em etapa avançada
  INSERT INTO orcamentos_crm_tracking (
    orcamento_id,
    etapa_crm,
    status_contato,
    concierge_responsavel_id,
    data_entrada_etapa
  ) VALUES (
    NEW.orcamento_id,
    'em_orcamento'::etapa_crm_enum,
    'sem_contato'::status_contato_enum,
    v_concierge_id,
    NOW()
  )
  ON CONFLICT (orcamento_id) DO UPDATE
    SET
      etapa_crm          = 'em_orcamento'::etapa_crm_enum,
      data_entrada_etapa = NOW(),
      updated_at         = NOW()
    WHERE orcamentos_crm_tracking.etapa_crm::text
            IN ('orcamento_postado', 'contato_agendamento');

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Nunca bloqueia a operação original
    RAISE WARNING
      'fn_auto_mover_crm_apos_atendimento: erro para orcamento_id=% : %',
      NEW.orcamento_id, SQLERRM;
    RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.fn_auto_mover_crm_apos_atendimento IS
  'Trigger: ao marcar visita_realizada ou reuniao_realizada, avança etapa_crm para em_orcamento. Nunca regride etapas avançadas.';

-- Idempotência: remove trigger anterior antes de recriar
DROP TRIGGER IF EXISTS trg_auto_mover_crm_apos_atendimento
  ON candidaturas_fornecedores;

CREATE TRIGGER trg_auto_mover_crm_apos_atendimento
  AFTER UPDATE OF status_acompanhamento
  ON candidaturas_fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_mover_crm_apos_atendimento();


-- ============================================================
-- PARTE 3: Backfill de registros antigos
-- ============================================================
-- Para todos os orçamentos que já têm candidatura com
-- visita_realizada ou reuniao_realizada mas ainda estão em
-- etapa inicial (ou sem tracking), inicializa em em_orcamento.
-- ============================================================

DO $$
DECLARE
  v_fallback_concierge uuid;
  v_afetados           integer;
BEGIN
  -- Concierge de fallback para orçamentos sem gestor
  SELECT id INTO v_fallback_concierge
  FROM profiles
  WHERE tipo_usuario IN ('admin', 'master')
    AND status = 'ativo'
  LIMIT 1;

  WITH orcamentos_para_corrigir AS (
    SELECT DISTINCT cf.orcamento_id,
                    COALESCE(o.gestor_conta_id, v_fallback_concierge) AS concierge_id
    FROM candidaturas_fornecedores cf
    JOIN orcamentos o ON o.id = cf.orcamento_id
    WHERE cf.status_acompanhamento IN ('visita_realizada', 'reuniao_realizada')
  )
  INSERT INTO orcamentos_crm_tracking (
    orcamento_id,
    etapa_crm,
    status_contato,
    concierge_responsavel_id,
    data_entrada_etapa
  )
  SELECT
    opc.orcamento_id,
    'em_orcamento'::etapa_crm_enum,
    'sem_contato'::status_contato_enum,
    opc.concierge_id,
    NOW()
  FROM orcamentos_para_corrigir opc
  ON CONFLICT (orcamento_id) DO UPDATE
    SET
      etapa_crm          = 'em_orcamento'::etapa_crm_enum,
      data_entrada_etapa = NOW(),
      updated_at         = NOW()
    WHERE orcamentos_crm_tracking.etapa_crm::text
            IN ('orcamento_postado', 'contato_agendamento');

  GET DIAGNOSTICS v_afetados = ROW_COUNT;
  RAISE NOTICE 'Backfill SDR→CRM: % orçamentos inicializados ou avançados para em_orcamento', v_afetados;
END;
$$;


-- ============================================================
-- SELECTs de validação pós-migration
-- ============================================================

-- 1. Orçamentos com visita/reunião realizada que ainda estão SEM tracking
--    (deve retornar 0 após o backfill)
SELECT COUNT(*) AS orcamentos_sem_tracking_apos_backfill
FROM candidaturas_fornecedores cf
LEFT JOIN orcamentos_crm_tracking oct ON oct.orcamento_id = cf.orcamento_id
WHERE cf.status_acompanhamento IN ('visita_realizada', 'reuniao_realizada')
  AND oct.orcamento_id IS NULL;

-- 2. Orçamentos com visita/reunião realizada ainda em etapa inicial
--    (deve retornar 0 após o backfill)
SELECT COUNT(*) AS orcamentos_em_etapa_inicial_apos_backfill
FROM candidaturas_fornecedores cf
JOIN orcamentos_crm_tracking oct ON oct.orcamento_id = cf.orcamento_id
WHERE cf.status_acompanhamento IN ('visita_realizada', 'reuniao_realizada')
  AND oct.etapa_crm::text IN ('orcamento_postado', 'contato_agendamento');

-- 3. Confirmar que o trigger foi criado
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trg_auto_mover_crm_apos_atendimento';

-- 4. Distribuição de etapas após backfill
SELECT
  oct.etapa_crm::text AS etapa,
  COUNT(*)            AS total
FROM orcamentos_crm_tracking oct
GROUP BY oct.etapa_crm
ORDER BY oct.etapa_crm;
