-- Criar tabela de subcategorias financeiras
CREATE TABLE public.subcategorias_financeiras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria_id UUID NOT NULL REFERENCES public.categorias_financeiras(id) ON DELETE CASCADE,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar coluna subcategoria_id nas tabelas de contas
ALTER TABLE public.contas_receber 
ADD COLUMN subcategoria_id UUID REFERENCES public.subcategorias_financeiras(id) ON DELETE SET NULL;

ALTER TABLE public.contas_pagar 
ADD COLUMN subcategoria_id UUID REFERENCES public.subcategorias_financeiras(id) ON DELETE SET NULL;

-- Criar índices para performance
CREATE INDEX idx_subcategorias_categoria_id ON public.subcategorias_financeiras(categoria_id);
CREATE INDEX idx_subcategorias_ativa ON public.subcategorias_financeiras(ativa);
CREATE INDEX idx_contas_receber_subcategoria ON public.contas_receber(subcategoria_id);
CREATE INDEX idx_contas_pagar_subcategoria ON public.contas_pagar(subcategoria_id);

-- Habilitar RLS para subcategorias
ALTER TABLE public.subcategorias_financeiras ENABLE ROW LEVEL SECURITY;

-- Política RLS para subcategorias (mesma lógica das categorias)
CREATE POLICY "Usuários autorizados podem acessar subcategorias financeiras" 
ON public.subcategorias_financeiras 
FOR ALL 
USING (can_access_financial());

-- Trigger para atualização automática do campo updated_at
CREATE OR REPLACE FUNCTION public.update_subcategorias_financeiras_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subcategorias_financeiras_updated_at
  BEFORE UPDATE ON public.subcategorias_financeiras
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subcategorias_financeiras_updated_at();