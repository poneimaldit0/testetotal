-- ============================================================
-- FASE 1: Tabela de Eventos Operacionais — Trilha Histórica SDR/CRM
-- Data: 2026-05-12
-- ============================================================
--
-- Objetivo:
--   Base isolada e append-only para futura camada analítica de
--   reagendamentos, no-show, confirmações e eventos operacionais.
--   Não altera nenhuma tabela existente.
--   Não captura eventos ainda — apenas estrutura.
--
-- Decisões de modelagem:
--   - tipo_evento e origem_evento: CHECK constraint (não ENUM) para
--     permitir ADD sem migration destrutiva futura.
--   - orcamento_id: NOT NULL, sem ON DELETE CASCADE (preserva histórico).
--   - Referências opcionais: ON DELETE SET NULL (evento sobrevive à deleção).
--   - data_anterior / data_nova: colunas tipadas (não JSONB) — essenciais
--     para queries de tempo médio e diferença de datas.
--   - payload JSONB: dados extras livres sem adicionar colunas no futuro.
--   - Sem triggers agora. Sem INSERT de dados agora.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.eventos_operacionais;
-- ============================================================


-- ============================================================
-- PARTE 1: Tabela principal
-- ============================================================

CREATE TABLE IF NOT EXISTS public.eventos_operacionais (

  -- Identidade
  id                UUID        NOT NULL DEFAULT gen_random_uuid(),

  -- Contexto do evento (âncoras obrigatória e opcionais)
  orcamento_id      UUID        NOT NULL
                    REFERENCES public.orcamentos(id),
                    -- Sem ON DELETE CASCADE: evento deve sobreviver se orcamento for arquivado/soft-deleted
                    -- Default PostgreSQL = NO ACTION (RESTRICT implícito)

  candidatura_id    UUID        NULL
                    REFERENCES public.candidaturas_fornecedores(id) ON DELETE SET NULL,

  fornecedor_id     UUID        NULL
                    REFERENCES public.profiles(id) ON DELETE SET NULL,

  sdr_id            UUID        NULL
                    REFERENCES public.profiles(id) ON DELETE SET NULL,

  usuario_acao_id   UUID        NULL
                    REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Classificação do evento
  tipo_evento       TEXT        NOT NULL,
  origem_evento     TEXT        NOT NULL,
  canal_evento      TEXT        NULL,

  -- Motivo estruturado (opcional — preenchido pelo ator quando disponível)
  motivo_codigo     TEXT        NULL,
  motivo_texto      TEXT        NULL,

  -- Datas para cálculo de reagendamentos (tipadas, não em JSONB)
  data_anterior     TIMESTAMPTZ NULL,
  data_nova         TIMESTAMPTZ NULL,

  -- Dados extras livres (extensível sem migration)
  payload           JSONB       NOT NULL DEFAULT '{}'::jsonb,

  -- Metadados
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- PK
  CONSTRAINT pk_eventos_operacionais PRIMARY KEY (id),

  -- Valores canônicos de tipo_evento
  -- Novos tipos podem ser adicionados via ALTER TABLE ... DROP CONSTRAINT / ADD CONSTRAINT
  CONSTRAINT ck_eventos_tipo_evento CHECK (tipo_evento IN (
    -- Visita presencial
    'visita_agendada',
    'visita_reagendada',
    'visita_confirmada_fornecedor',
    'visita_confirmada_cliente',
    'visita_realizada',
    'visita_nao_realizada',
    'visita_cancelada',
    -- Reunião online
    'reuniao_agendada',
    'reuniao_reagendada',
    'reuniao_entrou',
    'reuniao_realizada',
    'reuniao_nao_realizada',
    'reuniao_cancelada',
    -- Contato SDR
    'contato_realizado_1',
    'contato_realizado_2',
    'contato_realizado_3',
    'contato_sem_resposta',
    -- Ciclo de candidatura
    'candidatura_inscrita',
    'candidatura_desistiu',
    'proposta_enviada',
    -- Macro operacional
    'lead_chegou',
    'etapa_crm_movida'
  )),

  -- Origem: quem/o quê disparou o evento
  CONSTRAINT ck_eventos_origem_evento CHECK (origem_evento IN (
    'sdr_manual',
    'fornecedor_autoservico',
    'cliente_autoservico',
    'sistema_automatico',
    'admin'
  )),

  -- Canal: como o evento foi mediado (nullable — nem todo evento tem canal)
  CONSTRAINT ck_eventos_canal_evento CHECK (canal_evento IS NULL OR canal_evento IN (
    'whatsapp',
    'telefone',
    'email',
    'plataforma',
    'link_publico',
    'calendario',
    'outro'
  ))

);

COMMENT ON TABLE public.eventos_operacionais IS
  'Trilha append-only de eventos operacionais SDR/CRM. '
  'Estado canônico permanece nas tabelas existentes. '
  'Esta tabela é histórico puro — nunca atualizar registros existentes.';

COMMENT ON COLUMN public.eventos_operacionais.orcamento_id IS
  'Âncora obrigatória. Sem ON DELETE CASCADE: o histórico deve sobreviver ao ciclo de vida do orçamento.';
COMMENT ON COLUMN public.eventos_operacionais.data_anterior IS
  'Data/hora que estava agendada antes do evento (reagendamentos). Tipada para queries de SLA.';
COMMENT ON COLUMN public.eventos_operacionais.data_nova IS
  'Data/hora resultante do evento (agendamento/reagendamento). Tipada para queries de SLA.';
COMMENT ON COLUMN public.eventos_operacionais.payload IS
  'Dados extras livres do evento. Extensível sem migration futura.';


-- ============================================================
-- PARTE 2: Índices essenciais
-- ============================================================

-- Busca cronológica geral (paginação, relatórios recentes)
CREATE INDEX IF NOT EXISTS idx_eventos_created_at
  ON public.eventos_operacionais (created_at DESC);

-- Filtragem e joins por dimensão principal
CREATE INDEX IF NOT EXISTS idx_eventos_orcamento_id
  ON public.eventos_operacionais (orcamento_id);

CREATE INDEX IF NOT EXISTS idx_eventos_candidatura_id
  ON public.eventos_operacionais (candidatura_id)
  WHERE candidatura_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_eventos_fornecedor_id
  ON public.eventos_operacionais (fornecedor_id)
  WHERE fornecedor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_eventos_sdr_id
  ON public.eventos_operacionais (sdr_id)
  WHERE sdr_id IS NOT NULL;

-- Filtragem por tipo e origem (queries analíticas)
CREATE INDEX IF NOT EXISTS idx_eventos_tipo_evento
  ON public.eventos_operacionais (tipo_evento);

CREATE INDEX IF NOT EXISTS idx_eventos_origem_evento
  ON public.eventos_operacionais (origem_evento);

-- Queries de SLA: ordenação por data do evento
CREATE INDEX IF NOT EXISTS idx_eventos_data_nova
  ON public.eventos_operacionais (data_nova)
  WHERE data_nova IS NOT NULL;

-- Compostos: timeline por orçamento e por fornecedor/SDR (padrão mais comum nas queries)
CREATE INDEX IF NOT EXISTS idx_eventos_orcamento_timeline
  ON public.eventos_operacionais (orcamento_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eventos_fornecedor_timeline
  ON public.eventos_operacionais (fornecedor_id, created_at DESC)
  WHERE fornecedor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_eventos_sdr_timeline
  ON public.eventos_operacionais (sdr_id, created_at DESC)
  WHERE sdr_id IS NOT NULL;


-- ============================================================
-- PARTE 3: RLS — Row Level Security
-- ============================================================
-- Padrão do projeto: can_manage_orcamentos() para leitura/inserção.
-- Edge functions e service_role bypassam RLS automaticamente.
-- Sem política de UPDATE/DELETE: eventos são imutáveis por design.

ALTER TABLE public.eventos_operacionais ENABLE ROW LEVEL SECURITY;

-- Admins e gestores podem ler todos os eventos
CREATE POLICY "Admin e Gestor podem ler eventos operacionais"
  ON public.eventos_operacionais
  FOR SELECT
  USING (public.can_manage_orcamentos());

-- Admins e gestores podem inserir eventos (fase 1: via aplicação)
-- Fase 2+: inserção via edge function/trigger usa service_role (bypassa RLS)
CREATE POLICY "Admin e Gestor podem inserir eventos operacionais"
  ON public.eventos_operacionais
  FOR INSERT
  WITH CHECK (public.can_manage_orcamentos());


-- ============================================================
-- SELECTs de validação pós-migration
-- ============================================================

-- 1. Confirmar que a tabela foi criada com as colunas corretas
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'eventos_operacionais'
ORDER BY ordinal_position;

-- 2. Confirmar constraints
SELECT
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name   = 'eventos_operacionais'
ORDER BY constraint_name;

-- 3. Confirmar índices criados
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename  = 'eventos_operacionais'
ORDER BY indexname;

-- 4. Confirmar RLS ativa
SELECT
  relname,
  relrowsecurity,
  relforcerowsecurity
FROM pg_class
WHERE relname = 'eventos_operacionais';

-- 5. Confirmar políticas
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename  = 'eventos_operacionais'
ORDER BY policyname;

-- 6. Tabela deve estar vazia (nenhum evento inserido ainda)
SELECT COUNT(*) AS total_eventos FROM public.eventos_operacionais;
