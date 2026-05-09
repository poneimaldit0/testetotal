-- Corrigir saldo da conta "Conta Corrente Principal" para R$ 30.315,39
UPDATE public.contas_bancarias 
SET saldo_atual = 30315.39,
    updated_at = now()
WHERE nome = 'Conta Corrente Principal';