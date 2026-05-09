-- Verificar constraint atual
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'checklist_propostas_status_check';

-- Remover constraint existente se houver
ALTER TABLE public.checklist_propostas 
DROP CONSTRAINT IF EXISTS checklist_propostas_status_check;

-- Adicionar nova constraint incluindo 'pre_orcamento'
ALTER TABLE public.checklist_propostas 
ADD CONSTRAINT checklist_propostas_status_check 
CHECK (status IN ('rascunho', 'finalizada', 'em_revisao', 'pre_orcamento'));

-- Verificar se existem registros com status inválido
SELECT DISTINCT status FROM public.checklist_propostas;