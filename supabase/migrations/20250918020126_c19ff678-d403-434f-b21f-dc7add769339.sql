-- Primeira correção: Verificar se há função com referência incorreta
DROP FUNCTION IF EXISTS public.notificar_revisao_concluida();

-- Corrigir a revisão pendente manualmente
UPDATE public.revisoes_propostas_clientes 
SET 
  status = 'concluida',
  data_resposta = NOW(),
  observacoes_fornecedor = 'Revisão finalizada - item planejamento de obra adicionado'
WHERE id = '753ab6d0-f9d4-4fb1-9e93-b42fbb92da29';

-- Inserir o item extra que foi perdido na revisão
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
) VALUES (
  '6111062f-08de-404b-8e2e-10253ced59f8',
  gen_random_uuid(),
  true,
  999.00,
  '{}',
  'Item adicionado durante revisão',
  true,
  'Planejamento de obra (cronograma)',
  'Elaboração de cronograma detalhado da obra'
);

-- Atualizar valor total da proposta
UPDATE public.checklist_propostas 
SET 
  valor_total_estimado = (
    SELECT COALESCE(SUM(valor_estimado), 0) 
    FROM public.respostas_checklist 
    WHERE checklist_proposta_id = '6111062f-08de-404b-8e2e-10253ced59f8' 
      AND incluido = true
  ),
  updated_at = NOW()
WHERE id = '6111062f-08de-404b-8e2e-10253ced59f8';