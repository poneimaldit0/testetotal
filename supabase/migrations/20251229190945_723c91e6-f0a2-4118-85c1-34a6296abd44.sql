-- Criar tabela de produtos de segmentação
CREATE TABLE IF NOT EXISTS public.produtos_segmentacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT DEFAULT '#3B82F6',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.produtos_segmentacao ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Todos autenticados podem ver produtos ativos"
ON public.produtos_segmentacao FOR SELECT
USING (ativo = true OR is_admin());

CREATE POLICY "Apenas admin/master podem gerenciar produtos"
ON public.produtos_segmentacao FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Adicionar coluna produto_segmentacao_id na tabela profiles (se não existir)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS produto_segmentacao_id UUID REFERENCES public.produtos_segmentacao(id);

-- Adicionar coluna produto_segmentacao_id na tabela orcamentos (se não existir)
ALTER TABLE public.orcamentos
ADD COLUMN IF NOT EXISTS produto_segmentacao_id UUID REFERENCES public.produtos_segmentacao(id);

-- Criar função para verificar se fornecedor pode ver orçamento baseado no produto
CREATE OR REPLACE FUNCTION public.fornecedor_pode_ver_orcamento(orcamento_produto_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  fornecedor_produto UUID;
  user_tipo TEXT;
BEGIN
  -- Buscar tipo e produto do usuário atual
  SELECT tipo_usuario, produto_segmentacao_id 
  INTO user_tipo, fornecedor_produto
  FROM public.profiles 
  WHERE id = auth.uid();
  
  -- Se não for fornecedor, retorna true (outras regras RLS se aplicam)
  IF user_tipo != 'fornecedor' THEN
    RETURN TRUE;
  END IF;
  
  -- Se orçamento não tem produto definido → visível para todos os fornecedores
  IF orcamento_produto_id IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Se fornecedor não tem produto definido (legado) → vê tudo
  IF fornecedor_produto IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Caso contrário, verifica se corresponde
  RETURN orcamento_produto_id = fornecedor_produto;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Atualizar política RLS de orcamentos para fornecedores
-- Primeiro, dropar a política existente
DROP POLICY IF EXISTS "Fornecedores podem ver orçamentos abertos" ON public.orcamentos;

-- Criar nova política que inclui a verificação de produto
CREATE POLICY "Fornecedores podem ver orçamentos abertos"
ON public.orcamentos FOR SELECT
USING (
  status = 'aberto'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tipo_usuario = 'fornecedor'
      AND profiles.status = 'ativo'
    )
  )
  AND fornecedor_pode_ver_orcamento(produto_segmentacao_id)
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_produtos_segmentacao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_produtos_segmentacao_updated_at ON public.produtos_segmentacao;

CREATE TRIGGER update_produtos_segmentacao_updated_at
BEFORE UPDATE ON public.produtos_segmentacao
FOR EACH ROW
EXECUTE FUNCTION public.update_produtos_segmentacao_updated_at();