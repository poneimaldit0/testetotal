-- Adicionar coluna forma_pagamento na tabela checklist_propostas
ALTER TABLE public.checklist_propostas 
ADD COLUMN forma_pagamento TEXT;