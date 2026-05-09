-- Adicionar coluna para status de acompanhamento do concierge
ALTER TABLE candidaturas_fornecedores 
ADD COLUMN status_acompanhamento_concierge TEXT;

-- Criar índice para performance
CREATE INDEX idx_candidaturas_status_concierge 
ON candidaturas_fornecedores(status_acompanhamento_concierge);

-- Adicionar comentário explicativo
COMMENT ON COLUMN candidaturas_fornecedores.status_acompanhamento_concierge IS 'Status de acompanhamento preenchido pelo concierge/gestor de conta para controle interno';