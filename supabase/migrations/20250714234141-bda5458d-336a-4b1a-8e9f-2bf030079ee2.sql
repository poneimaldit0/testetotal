-- Corrigir a transação do Marcos associando uma conta bancária
UPDATE public.transacoes_financeiras 
SET conta_bancaria_id = 'ee45a079-fffd-416b-96c4-57e6701edfe2'
WHERE id = '01e83b6d-9576-4799-91d9-6bfe1310fb78';

-- Criar a movimentação bancária correspondente
INSERT INTO public.movimentacoes_bancarias (
  conta_bancaria_id,
  data_movimentacao,
  tipo,
  valor,
  descricao,
  origem_tipo,
  origem_id,
  conciliado
) VALUES (
  'ee45a079-fffd-416b-96c4-57e6701edfe2',
  '2025-07-12',
  'entrada',
  1500.00,
  'Recebimento: Homologação (1/2) - Marcos Vinicius',
  'conta_receber',
  '01e83b6d-9576-4799-91d9-6bfe1310fb78',
  false
);