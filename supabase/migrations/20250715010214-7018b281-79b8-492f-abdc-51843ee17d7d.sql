-- Atualizar transações de pagamento sem conta bancária para associá-las ao Banco Inter
UPDATE public.transacoes_financeiras 
SET conta_bancaria_id = 'ee45a079-fffd-416b-96c4-57e6701edfe2'
WHERE tipo = 'pagamento' 
  AND conta_bancaria_id IS NULL;

-- Inserir movimentações bancárias para essas transações (que não foram criadas pelo trigger)
INSERT INTO public.movimentacoes_bancarias (
  conta_bancaria_id,
  data_movimentacao,
  tipo,
  valor,
  descricao,
  origem_tipo,
  origem_id
)
SELECT 
  tf.conta_bancaria_id,
  tf.data_transacao,
  'saida' as tipo,
  tf.valor,
  'Pagamento: ' || cp.descricao as descricao,
  'conta_pagar' as origem_tipo,
  tf.conta_pagar_id as origem_id
FROM public.transacoes_financeiras tf
JOIN public.contas_pagar cp ON cp.id = tf.conta_pagar_id
WHERE tf.tipo = 'pagamento' 
  AND tf.conta_bancaria_id = 'ee45a079-fffd-416b-96c4-57e6701edfe2'
  AND NOT EXISTS (
    SELECT 1 FROM public.movimentacoes_bancarias mb 
    WHERE mb.origem_tipo = 'conta_pagar' 
      AND mb.origem_id = tf.conta_pagar_id
  );