-- Adicionar campos para controle de notificação na tabela checklist_propostas
ALTER TABLE public.checklist_propostas 
ADD COLUMN notificado BOOLEAN DEFAULT FALSE,
ADD COLUMN data_notificacao TIMESTAMP WITH TIME ZONE;