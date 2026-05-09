-- Corrigir constraint de status na tabela contas_receber para incluir 'perda'
ALTER TABLE public.contas_receber 
DROP CONSTRAINT IF EXISTS contas_receber_status_check;

ALTER TABLE public.contas_receber 
ADD CONSTRAINT contas_receber_status_check 
CHECK (status IN ('pendente', 'recebido', 'vencido', 'cancelado', 'perda'));

-- Corrigir constraint de status na tabela contas_pagar para incluir 'perda' (consistência)
ALTER TABLE public.contas_pagar 
DROP CONSTRAINT IF EXISTS contas_pagar_status_check;

ALTER TABLE public.contas_pagar 
ADD CONSTRAINT contas_pagar_status_check 
CHECK (status IN ('pendente', 'pago', 'vencido', 'cancelado', 'perda'));