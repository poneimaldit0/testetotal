-- Criar tabela de categorias financeiras
CREATE TABLE public.categorias_financeiras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  descricao TEXT,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de contas a receber
CREATE TABLE public.contas_receber (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  cliente_email TEXT,
  cliente_telefone TEXT,
  descricao TEXT NOT NULL,
  valor_original DECIMAL(10,2) NOT NULL,
  valor_recebido DECIMAL(10,2) NOT NULL DEFAULT 0,
  data_vencimento DATE NOT NULL,
  data_recebimento DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'recebido', 'vencido', 'cancelado')),
  categoria_id UUID REFERENCES public.categorias_financeiras(id),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de contas a pagar
CREATE TABLE public.contas_pagar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_nome TEXT NOT NULL,
  fornecedor_email TEXT,
  fornecedor_telefone TEXT,
  descricao TEXT NOT NULL,
  valor_original DECIMAL(10,2) NOT NULL,
  valor_pago DECIMAL(10,2) NOT NULL DEFAULT 0,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido', 'cancelado')),
  categoria_id UUID REFERENCES public.categorias_financeiras(id),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de transações financeiras
CREATE TABLE public.transacoes_financeiras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('recebimento', 'pagamento')),
  conta_receber_id UUID REFERENCES public.contas_receber(id) ON DELETE CASCADE,
  conta_pagar_id UUID REFERENCES public.contas_pagar(id) ON DELETE CASCADE,
  valor DECIMAL(10,2) NOT NULL,
  data_transacao DATE NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes_financeiras ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas usuários master têm acesso
CREATE POLICY "Apenas masters podem acessar categorias financeiras" 
ON public.categorias_financeiras 
FOR ALL 
USING (is_master());

CREATE POLICY "Apenas masters podem acessar contas a receber" 
ON public.contas_receber 
FOR ALL 
USING (is_master());

CREATE POLICY "Apenas masters podem acessar contas a pagar" 
ON public.contas_pagar 
FOR ALL 
USING (is_master());

CREATE POLICY "Apenas masters podem acessar transações financeiras" 
ON public.transacoes_financeiras 
FOR ALL 
USING (is_master());

-- Inserir categorias padrão
INSERT INTO public.categorias_financeiras (nome, tipo, descricao) VALUES
('Receita de Orçamentos', 'receita', 'Receitas provenientes de orçamentos fechados'),
('Comissões', 'receita', 'Comissões de parceiros'),
('Outras Receitas', 'receita', 'Outras fontes de receita'),
('Despesas Operacionais', 'despesa', 'Despesas do dia a dia da operação'),
('Marketing', 'despesa', 'Gastos com marketing e publicidade'),
('Tecnologia', 'despesa', 'Gastos com sistemas e tecnologia'),
('Outras Despesas', 'despesa', 'Outras despesas gerais');

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categorias_financeiras_updated_at
  BEFORE UPDATE ON public.categorias_financeiras
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contas_receber_updated_at
  BEFORE UPDATE ON public.contas_receber
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contas_pagar_updated_at
  BEFORE UPDATE ON public.contas_pagar
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();