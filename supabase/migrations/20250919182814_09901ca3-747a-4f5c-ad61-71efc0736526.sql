-- Add cronograma_inicial_aprovado field to obras table
ALTER TABLE public.obras 
ADD COLUMN cronograma_inicial_aprovado boolean NOT NULL DEFAULT false;

-- Add index for better performance on this field
CREATE INDEX idx_obras_cronograma_inicial_aprovado ON public.obras (cronograma_inicial_aprovado);

-- Add comment to document the field purpose
COMMENT ON COLUMN public.obras.cronograma_inicial_aprovado IS 'Indica se o cronograma inicial foi aprovado pelo fornecedor e não pode mais ser editado';