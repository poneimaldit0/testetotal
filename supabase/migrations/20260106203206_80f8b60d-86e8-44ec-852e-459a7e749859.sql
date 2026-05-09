-- Adicionar campos de recorrência à tabela contas_receber para manter paridade com contas_pagar
ALTER TABLE public.contas_receber
ADD COLUMN IF NOT EXISTS is_recorrente boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS frequencia_recorrencia text,
ADD COLUMN IF NOT EXISTS quantidade_parcelas integer;