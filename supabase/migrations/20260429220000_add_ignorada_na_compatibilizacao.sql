ALTER TABLE public.candidaturas_fornecedores
  ADD COLUMN IF NOT EXISTS ignorada_na_compatibilizacao BOOLEAN DEFAULT false;
