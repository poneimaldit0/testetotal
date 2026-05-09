-- Adiciona link_reuniao por horário proposto pelo SDR.
-- Cada slot pode ter seu próprio link Google Meet.
-- Aditiva — não altera outras tabelas existentes.

alter table public.horarios_visita_orcamento
  add column if not exists link_reuniao text null;

-- link_reuniao em candidaturas_fornecedores — necessário para EntrarReuniao.tsx
-- (já referenciado no código mas a coluna ainda não existia)
alter table public.candidaturas_fornecedores
  add column if not exists link_reuniao text null;
