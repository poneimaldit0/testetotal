-- Atualizar constraint da tabela checklist_propostas para incluir status 'pendente_revisao'
ALTER TABLE public.checklist_propostas 
DROP CONSTRAINT IF EXISTS checklist_propostas_status_check;

ALTER TABLE public.checklist_propostas 
ADD CONSTRAINT checklist_propostas_status_check 
CHECK (status = ANY (ARRAY[
  'rascunho'::text, 
  'finalizada'::text, 
  'em_revisao'::text, 
  'pre_orcamento'::text,
  'rascunho_colaborativo'::text,
  'enviado'::text,
  'pendente_revisao'::text
]));