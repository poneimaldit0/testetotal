-- Confirmação dupla operacional do SDR (cliente + fornecedor) por janela temporal.
-- Aditiva — não altera nenhuma tabela existente.
-- Cada linha representa a decisão do SDR sobre uma parte (cliente/fornecedor)
-- em uma janela específica (24h/12h/6h) para uma candidatura de um orçamento.

create table if not exists public.sdr_confirmacoes_visita (
  id             uuid        primary key default gen_random_uuid(),
  orcamento_id   uuid        not null,
  candidatura_id uuid        null,
  etapa          text        not null check (etapa in ('24h', '12h', '6h')),
  parte          text        not null check (parte in ('cliente', 'fornecedor')),
  status         text        not null default 'pendente'
                             check (status in ('confirmou', 'nao_confirmou', 'pendente')),
  confirmado_em  timestamptz null,
  usuario_id     uuid        null,
  observacao     text        null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint sdr_confirmacoes_visita_unique
    unique (orcamento_id, candidatura_id, etapa, parte)
);

-- Indexes para lookup rápido
create index if not exists idx_sdr_conf_candidatura
  on public.sdr_confirmacoes_visita (candidatura_id);

create index if not exists idx_sdr_conf_orcamento
  on public.sdr_confirmacoes_visita (orcamento_id);

-- RLS
alter table public.sdr_confirmacoes_visita enable row level security;

create policy "sdr_conf_select"
  on public.sdr_confirmacoes_visita for select
  to authenticated using (true);

create policy "sdr_conf_insert"
  on public.sdr_confirmacoes_visita for insert
  to authenticated with check (true);

create policy "sdr_conf_update"
  on public.sdr_confirmacoes_visita for update
  to authenticated using (true) with check (true);
