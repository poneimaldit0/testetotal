-- Criar tabela para avaliações internas de leads
CREATE TABLE public.crm_avaliacoes_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  perfil_ideal BOOLEAN NOT NULL DEFAULT FALSE,
  orcamento_compativel BOOLEAN NOT NULL DEFAULT FALSE,
  decisor_direto BOOLEAN NOT NULL DEFAULT FALSE,
  prazo_curto BOOLEAN NOT NULL DEFAULT FALSE,
  engajamento_alto BOOLEAN NOT NULL DEFAULT FALSE,
  fornecedor_consegue_orcar BOOLEAN NOT NULL DEFAULT FALSE,
  pontuacao_total INTEGER GENERATED ALWAYS AS (
    (CASE WHEN perfil_ideal THEN 2 ELSE 0 END) +
    (CASE WHEN orcamento_compativel THEN 2 ELSE 0 END) +
    (CASE WHEN decisor_direto THEN 1 ELSE 0 END) +
    (CASE WHEN prazo_curto THEN 1 ELSE 0 END) +
    (CASE WHEN engajamento_alto THEN 2 ELSE 0 END) +
    (CASE WHEN fornecedor_consegue_orcar THEN 2 ELSE 0 END)
  ) STORED,
  avaliado_por_id UUID REFERENCES public.profiles(id),
  avaliado_por_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(orcamento_id)
);

-- Enable RLS
ALTER TABLE public.crm_avaliacoes_leads ENABLE ROW LEVEL SECURITY;

-- Policy para concierges, gestores e admins visualizarem
CREATE POLICY "Equipe pode visualizar avaliacoes" 
ON public.crm_avaliacoes_leads 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND tipo_usuario IN ('concierge', 'gestor_conta', 'admin')
  )
);

-- Policy para concierges, gestores e admins criarem
CREATE POLICY "Equipe pode criar avaliacoes" 
ON public.crm_avaliacoes_leads 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND tipo_usuario IN ('concierge', 'gestor_conta', 'admin')
  )
);

-- Policy para concierges, gestores e admins atualizarem
CREATE POLICY "Equipe pode atualizar avaliacoes" 
ON public.crm_avaliacoes_leads 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND tipo_usuario IN ('concierge', 'gestor_conta', 'admin')
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_crm_avaliacoes_leads_updated_at
BEFORE UPDATE ON public.crm_avaliacoes_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();