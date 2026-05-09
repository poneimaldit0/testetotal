-- Adicionar coluna data_inicio_contrato à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN data_inicio_contrato date;

-- Comentário explicativo
COMMENT ON COLUMN public.profiles.data_inicio_contrato IS 'Data de início do contrato do usuário (fornecedor)';