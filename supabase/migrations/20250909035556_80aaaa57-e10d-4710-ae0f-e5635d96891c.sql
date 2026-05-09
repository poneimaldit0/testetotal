-- Atualizar o check constraint para incluir novos status colaborativos
ALTER TABLE public.checklist_propostas 
DROP CONSTRAINT checklist_propostas_status_check;

-- Adicionar constraint atualizado com novos status
ALTER TABLE public.checklist_propostas 
ADD CONSTRAINT checklist_propostas_status_check 
CHECK (status = ANY (ARRAY[
  'rascunho'::text, 
  'finalizada'::text, 
  'em_revisao'::text, 
  'pre_orcamento'::text,
  'rascunho_colaborativo'::text,
  'enviado'::text
]));