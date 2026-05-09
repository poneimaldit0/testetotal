-- Corrigir revisão pendente para fabibnunes@hotmail.com
UPDATE public.revisoes_propostas_clientes 
SET 
  status = 'concluida',
  data_resposta = NOW(),
  observacoes_fornecedor = 'Revisão finalizada - item planejamento de obra adicionado'
WHERE id = '753ab6d0-f9d4-4fb1-9e93-b42fbb92da29' 
  AND status = 'pendente';

-- Inserir item extra "Planejamento de obra" que foi perdido
INSERT INTO public.respostas_checklist (
  checklist_proposta_id,
  item_id,
  incluido,
  valor_estimado,
  ambientes,
  observacoes,
  item_extra,
  nome_item_extra,
  descricao_item_extra
) 
SELECT 
  '6111062f-08de-404b-8e2e-10253ced59f8' as checklist_proposta_id,
  gen_random_uuid() as item_id,
  true as incluido,
  999.00 as valor_estimado,
  '{}' as ambientes,
  'Item adicionado durante revisão' as observacoes,
  true as item_extra,
  'Planejamento de obra (cronograma)' as nome_item_extra,
  'Elaboração de cronograma detalhado da obra' as descricao_item_extra
WHERE NOT EXISTS (
  SELECT 1 FROM public.respostas_checklist 
  WHERE checklist_proposta_id = '6111062f-08de-404b-8e2e-10253ced59f8' 
    AND item_extra = true 
    AND nome_item_extra = 'Planejamento de obra (cronograma)'
);

-- Atualizar valor total da proposta incluindo o item extra
UPDATE public.checklist_propostas 
SET 
  valor_total_estimado = 2598.00, -- 1599 + 999 do item extra
  updated_at = NOW()
WHERE id = '6111062f-08de-404b-8e2e-10253ced59f8';

-- Log da correção
INSERT INTO public.logs_acesso (user_id, acao)
VALUES (
  '7516d842-1903-4ece-82d0-e8d06fa6739e',
  'correcao_revisao_item_extra: planejamento_obra_fabibnunes - valor_adicionado: 999.00'
);