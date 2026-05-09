-- Correção do valor recebido do Francisco Jonas de Moura
-- De R$ 5.000,01 para R$ 5.000,00

-- 1. Corrigir o valor recebido na conta a receber
UPDATE public.contas_receber 
SET valor_recebido = 5000.00,
    updated_at = now()
WHERE id = '8659e64e-953b-48c7-b02a-3563105e65d0';

-- 2. Corrigir o valor na transação financeira
UPDATE public.transacoes_financeiras 
SET valor = 5000.00,
    updated_at = now()
WHERE id = '0e2116d5-d43b-41de-8173-231470115013';

-- 3. Corrigir o valor na movimentação bancária
UPDATE public.movimentacoes_bancarias 
SET valor = 5000.00
WHERE id = '1a8a671e-5070-4c92-9346-a79396c5bb72';

-- 4. Ajustar o saldo da conta bancária (subtrair R$ 0,01)
UPDATE public.contas_bancarias 
SET saldo_atual = saldo_atual - 0.01,
    updated_at = now()
WHERE id = 'ee45a079-fffd-416b-96c4-57e6701edfe2';

-- Log da correção
INSERT INTO public.logs_acesso (user_id, acao)
VALUES (
  auth.uid(), 
  'correcao_valor_recebido: Francisco Jonas de Moura - 5000.01 -> 5000.00'
);