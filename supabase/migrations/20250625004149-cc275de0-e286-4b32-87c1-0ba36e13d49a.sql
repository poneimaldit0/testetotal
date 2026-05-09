
-- Adicionar nova coluna para armazenar o texto do prazo pretendido
ALTER TABLE public.orcamentos 
ADD COLUMN prazo_inicio_texto TEXT;

-- Comentário: Esta coluna armazenará os textos como "Em até 3 meses", "Imediato", etc.
-- Mantemos a coluna data_inicio existente para compatibilidade com orçamentos antigos
