-- Create table for material/item requests from clients to suppliers
CREATE TABLE public.solicitacoes_materiais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID REFERENCES public.contratos(id),
  cliente_id UUID REFERENCES public.clientes(id),
  fornecedor_id UUID REFERENCES public.profiles(id),
  tipo_solicitacao TEXT NOT NULL DEFAULT 'material', -- 'material' ou 'item_extra'
  descricao TEXT NOT NULL,
  quantidade TEXT,
  urgencia TEXT NOT NULL DEFAULT 'normal', -- 'baixa', 'normal', 'alta'
  data_solicitacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_resposta TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'em_analise', 'aprovado', 'rejeitado'
  resposta_fornecedor TEXT,
  valor_estimado NUMERIC,
  observacoes_cliente TEXT,
  observacoes_fornecedor TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.solicitacoes_materiais ENABLE ROW LEVEL SECURITY;

-- Policies for material requests
CREATE POLICY "Clientes podem criar e ver suas solicitações"
ON public.solicitacoes_materiais
FOR ALL
USING (
  cliente_id IN (
    SELECT id FROM public.clientes WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Fornecedores podem ver e responder suas solicitações"
ON public.solicitacoes_materiais
FOR ALL
USING (fornecedor_id = auth.uid());

CREATE POLICY "Admins podem gerenciar todas as solicitações"
ON public.solicitacoes_materiais
FOR ALL
USING (is_admin());

-- Create indexes for better performance
CREATE INDEX idx_solicitacoes_materiais_contrato ON public.solicitacoes_materiais(contrato_id);
CREATE INDEX idx_solicitacoes_materiais_cliente ON public.solicitacoes_materiais(cliente_id);
CREATE INDEX idx_solicitacoes_materiais_fornecedor ON public.solicitacoes_materiais(fornecedor_id);
CREATE INDEX idx_solicitacoes_materiais_status ON public.solicitacoes_materiais(status);

-- Update trigger for updated_at
CREATE TRIGGER update_solicitacoes_materiais_updated_at
  BEFORE UPDATE ON public.solicitacoes_materiais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();