-- Adicionar campo para identificar orçamentos com prazo explicitamente definido
ALTER TABLE public.orcamentos 
ADD COLUMN prazo_explicitamente_definido boolean DEFAULT false;

-- Comentário: Este campo será marcado como true apenas quando um admin/gestor 
-- definir explicitamente um prazo para envio de propostas no momento do cadastro.
-- Orçamentos existentes ficam como false para não gerar alertas falsos.