-- Corrigir constraint de status na tabela checklist_propostas
-- Remover constraint antiga
ALTER TABLE public.checklist_propostas DROP CONSTRAINT IF EXISTS checklist_propostas_status_check;

-- Adicionar nova constraint com valores corretos
ALTER TABLE public.checklist_propostas 
ADD CONSTRAINT checklist_propostas_status_check 
CHECK (status IN ('rascunho', 'finalizada', 'em_revisao', 'aceita', 'rejeitada'));