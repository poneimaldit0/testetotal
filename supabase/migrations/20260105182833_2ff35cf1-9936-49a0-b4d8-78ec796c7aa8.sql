-- Adicionar coluna para armazenar o microtreinamento selecionado manualmente
ALTER TABLE public.cs_rituais_semanais 
ADD COLUMN microtreinamento_id UUID REFERENCES public.cs_microtreinamentos(id);

-- Comentário explicativo
COMMENT ON COLUMN public.cs_rituais_semanais.microtreinamento_id IS 
  'ID do microtreinamento selecionado/ministrado nesta semana';