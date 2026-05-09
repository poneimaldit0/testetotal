
CREATE TABLE public.propostas_analises_ia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidatura_id UUID NOT NULL REFERENCES public.candidaturas_fornecedores(id) ON DELETE CASCADE,
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  propostas_arquivo_id UUID REFERENCES public.propostas_arquivos(id) ON DELETE SET NULL,
  posicionamento TEXT,
  valor_proposta NUMERIC,
  valor_referencia_mercado NUMERIC,
  pontos_fortes JSONB DEFAULT '[]'::jsonb,
  pontos_atencao JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  raw_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.propostas_analises_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fornecedor vê suas próprias análises"
  ON public.propostas_analises_ia
  FOR SELECT
  TO authenticated
  USING (fornecedor_id = auth.uid());

CREATE POLICY "Service role pode inserir análises"
  ON public.propostas_analises_ia
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role pode atualizar análises"
  ON public.propostas_analises_ia
  FOR UPDATE
  TO service_role
  USING (true);

CREATE INDEX idx_propostas_analises_ia_candidatura ON public.propostas_analises_ia(candidatura_id);
CREATE INDEX idx_propostas_analises_ia_fornecedor ON public.propostas_analises_ia(fornecedor_id);
