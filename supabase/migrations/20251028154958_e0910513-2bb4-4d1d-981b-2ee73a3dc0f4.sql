-- Correção manual para conta recebida específica que teve valor_original alterado
-- mas não sincronizou com valor_recebido e movimentação bancária

-- 1. Atualizar valor_recebido para corresponder ao valor_original
UPDATE contas_receber 
SET valor_recebido = 4215.50
WHERE id = 'fe3777de-4789-4965-b7a5-f24b265e83d3'
  AND valor_original = 4215.50
  AND valor_recebido = 4125.50;

-- 2. Atualizar movimentação bancária correspondente
UPDATE movimentacoes_bancarias
SET valor = 4215.50
WHERE origem_tipo = 'conta_receber' 
  AND origem_id = 'fe3777de-4789-4965-b7a5-f24b265e83d3'
  AND valor = 4125.50;

-- 3. Ajustar saldo da conta bancária (adicionar a diferença de R$ 90,00)
UPDATE contas_bancarias
SET saldo_atual = saldo_atual + 90.00
WHERE id = 'ee45a079-fffd-416b-96c4-57e6701edfe2';