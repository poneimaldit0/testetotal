-- Extensão da tabela profiles para descrição do fornecedor
ALTER TABLE public.profiles 
ADD COLUMN descricao_fornecedor TEXT;

-- Tabela de portfólios dos fornecedores
CREATE TABLE public.portfolios_fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  imagem_url TEXT,
  categoria TEXT NOT NULL,
  data_projeto DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de avaliações dos fornecedores
CREATE TABLE public.avaliacoes_fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  cliente_email TEXT,
  nota_geral NUMERIC(2,1) NOT NULL CHECK (nota_geral >= 1 AND nota_geral <= 5),
  prazo NUMERIC(2,1) CHECK (prazo >= 1 AND prazo <= 5),
  qualidade NUMERIC(2,1) CHECK (qualidade >= 1 AND qualidade <= 5),
  gestao_mao_obra NUMERIC(2,1) CHECK (gestao_mao_obra >= 1 AND gestao_mao_obra <= 5),
  gestao_materiais NUMERIC(2,1) CHECK (gestao_materiais >= 1 AND gestao_materiais <= 5),
  custo_planejado NUMERIC(2,1) CHECK (custo_planejado >= 1 AND custo_planejado <= 5),
  comentario TEXT,
  data_avaliacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de depoimentos dos fornecedores
CREATE TABLE public.depoimentos_fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cliente_nome TEXT NOT NULL,
  depoimento TEXT NOT NULL,
  data_depoimento DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_por_admin UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de selos dos fornecedores
CREATE TABLE public.selos_fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome_selo TEXT NOT NULL,
  descricao TEXT,
  cor TEXT NOT NULL DEFAULT '#3B82F6',
  icone TEXT,
  data_concessao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_expiracao DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  concedido_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_portfolios_fornecedor_id ON public.portfolios_fornecedores(fornecedor_id);
CREATE INDEX idx_portfolios_ativo_ordem ON public.portfolios_fornecedores(ativo, ordem);

CREATE INDEX idx_avaliacoes_fornecedor_id ON public.avaliacoes_fornecedores(fornecedor_id);
CREATE INDEX idx_avaliacoes_data ON public.avaliacoes_fornecedores(data_avaliacao);

CREATE INDEX idx_depoimentos_fornecedor_id ON public.depoimentos_fornecedores(fornecedor_id);
CREATE INDEX idx_depoimentos_ativo ON public.depoimentos_fornecedores(ativo);

CREATE INDEX idx_selos_fornecedor_id ON public.selos_fornecedores(fornecedor_id);
CREATE INDEX idx_selos_ativo_expiracao ON public.selos_fornecedores(ativo, data_expiracao);

-- Triggers para updated_at
CREATE TRIGGER update_portfolios_fornecedores_updated_at
  BEFORE UPDATE ON public.portfolios_fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_depoimentos_fornecedores_updated_at
  BEFORE UPDATE ON public.depoimentos_fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_selos_fornecedores_updated_at
  BEFORE UPDATE ON public.selos_fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Portfolios
ALTER TABLE public.portfolios_fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar todos os portfolios"
  ON public.portfolios_fornecedores
  FOR ALL
  USING (public.is_admin());

CREATE POLICY "Fornecedores podem gerenciar seus portfolios"
  ON public.portfolios_fornecedores
  FOR ALL
  USING (fornecedor_id = auth.uid());

CREATE POLICY "Acesso público para portfolios ativos"
  ON public.portfolios_fornecedores
  FOR SELECT
  USING (ativo = true);

-- Avaliações
ALTER TABLE public.avaliacoes_fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar todas as avaliações"
  ON public.avaliacoes_fornecedores
  FOR ALL
  USING (public.is_admin());

CREATE POLICY "Fornecedores podem ver suas avaliações"
  ON public.avaliacoes_fornecedores
  FOR SELECT
  USING (fornecedor_id = auth.uid());

CREATE POLICY "Acesso público para avaliações"
  ON public.avaliacoes_fornecedores
  FOR SELECT
  USING (true);

-- Depoimentos
ALTER TABLE public.depoimentos_fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar todos os depoimentos"
  ON public.depoimentos_fornecedores
  FOR ALL
  USING (public.is_admin());

CREATE POLICY "Fornecedores podem ver seus depoimentos"
  ON public.depoimentos_fornecedores
  FOR SELECT
  USING (fornecedor_id = auth.uid());

CREATE POLICY "Acesso público para depoimentos ativos"
  ON public.depoimentos_fornecedores
  FOR SELECT
  USING (ativo = true);

-- Selos
ALTER TABLE public.selos_fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar todos os selos"
  ON public.selos_fornecedores
  FOR ALL
  USING (public.is_admin());

CREATE POLICY "Fornecedores podem ver seus selos"
  ON public.selos_fornecedores
  FOR SELECT
  USING (fornecedor_id = auth.uid());

CREATE POLICY "Acesso público para selos ativos e não expirados"
  ON public.selos_fornecedores
  FOR SELECT
  USING (ativo = true AND (data_expiracao IS NULL OR data_expiracao >= CURRENT_DATE));

-- Função para calcular média de avaliações
CREATE OR REPLACE FUNCTION public.calcular_media_avaliacoes(p_fornecedor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  resultado JSONB;
BEGIN
  SELECT jsonb_build_object(
    'nota_geral', ROUND(AVG(nota_geral), 2),
    'prazo', ROUND(AVG(prazo), 2),
    'qualidade', ROUND(AVG(qualidade), 2),
    'gestao_mao_obra', ROUND(AVG(gestao_mao_obra), 2),
    'gestao_materiais', ROUND(AVG(gestao_materiais), 2),
    'custo_planejado', ROUND(AVG(custo_planejado), 2),
    'total_avaliacoes', COUNT(*)
  ) INTO resultado
  FROM public.avaliacoes_fornecedores
  WHERE fornecedor_id = p_fornecedor_id;
  
  RETURN COALESCE(resultado, jsonb_build_object(
    'nota_geral', 0,
    'prazo', 0,
    'qualidade', 0,
    'gestao_mao_obra', 0,
    'gestao_materiais', 0,
    'custo_planejado', 0,
    'total_avaliacoes', 0
  ));
END;
$$;