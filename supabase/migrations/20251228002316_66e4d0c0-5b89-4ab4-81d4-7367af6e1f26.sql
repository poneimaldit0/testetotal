-- Adicionar coluna para motivo de fechamento manual
ALTER TABLE public.orcamentos 
ADD COLUMN IF NOT EXISTS motivo_fechamento_manual TEXT,
ADD COLUMN IF NOT EXISTS fechado_manualmente BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS data_fechamento_manual TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS fechado_por_id UUID REFERENCES public.profiles(id);

-- Comentários para documentação
COMMENT ON COLUMN public.orcamentos.motivo_fechamento_manual IS 'Motivo informado pelo admin/master ao fechar manualmente o orçamento';
COMMENT ON COLUMN public.orcamentos.fechado_manualmente IS 'Indica se o orçamento foi fechado manualmente (true) ou automaticamente por atingir limite de fornecedores';
COMMENT ON COLUMN public.orcamentos.data_fechamento_manual IS 'Data/hora em que o orçamento foi fechado ou pausado manualmente';
COMMENT ON COLUMN public.orcamentos.fechado_por_id IS 'ID do usuário que fechou/pausou manualmente o orçamento';