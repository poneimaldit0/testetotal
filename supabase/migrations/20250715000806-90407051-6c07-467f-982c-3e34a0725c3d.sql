-- Atualizar o constraint para permitir 'ajuste_saldo' como origem_tipo
ALTER TABLE public.movimentacoes_bancarias 
DROP CONSTRAINT movimentacoes_bancarias_origem_tipo_check;

ALTER TABLE public.movimentacoes_bancarias 
ADD CONSTRAINT movimentacoes_bancarias_origem_tipo_check 
CHECK (origem_tipo = ANY (ARRAY['conta_receber'::text, 'conta_pagar'::text, 'manual'::text, 'ajuste_saldo'::text]));