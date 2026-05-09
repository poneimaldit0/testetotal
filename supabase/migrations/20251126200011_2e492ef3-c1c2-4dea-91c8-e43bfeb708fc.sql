-- Adicionar coluna visivel_para_todos nas tabelas de tags
ALTER TABLE crm_tags 
ADD COLUMN visivel_para_todos BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE crm_marcenaria_tags 
ADD COLUMN visivel_para_todos BOOLEAN NOT NULL DEFAULT false;

-- Comentários para documentação
COMMENT ON COLUMN crm_tags.visivel_para_todos IS 'Se true, tag é visível para todos os usuários (tags globais criadas por admins)';
COMMENT ON COLUMN crm_marcenaria_tags.visivel_para_todos IS 'Se true, tag é visível para todos os usuários (tags globais criadas por admins)';