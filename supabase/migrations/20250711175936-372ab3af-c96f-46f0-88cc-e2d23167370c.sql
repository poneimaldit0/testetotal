-- Criar tabela unificada para fornecedores e clientes
CREATE TABLE public.fornecedores_clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  documento TEXT, -- CPF/CNPJ
  endereco TEXT,
  tipo TEXT NOT NULL DEFAULT 'ambos' CHECK (tipo IN ('fornecedor', 'cliente', 'ambos')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.fornecedores_clientes ENABLE ROW LEVEL SECURITY;

-- Política para masters acessarem fornecedores/clientes
CREATE POLICY "Apenas masters podem acessar fornecedores/clientes" 
ON public.fornecedores_clientes 
FOR ALL 
USING (is_master());

-- Adicionar trigger para updated_at
CREATE TRIGGER update_fornecedores_clientes_updated_at
BEFORE UPDATE ON public.fornecedores_clientes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar campos de recorrência às contas_pagar
ALTER TABLE public.contas_pagar 
ADD COLUMN is_recorrente BOOLEAN DEFAULT false,
ADD COLUMN frequencia_recorrencia TEXT CHECK (frequencia_recorrencia IN ('mensal', 'trimestral', 'semestral', 'anual')),
ADD COLUMN quantidade_parcelas INTEGER,
ADD COLUMN fornecedor_cliente_id UUID REFERENCES public.fornecedores_clientes(id);

-- Adicionar campo de referência para fornecedor/cliente nas contas_receber
ALTER TABLE public.contas_receber 
ADD COLUMN fornecedor_cliente_id UUID REFERENCES public.fornecedores_clientes(id);

-- Criar índices para performance
CREATE INDEX idx_fornecedores_clientes_tipo ON public.fornecedores_clientes(tipo);
CREATE INDEX idx_fornecedores_clientes_ativo ON public.fornecedores_clientes(ativo);
CREATE INDEX idx_contas_pagar_fornecedor_cliente ON public.contas_pagar(fornecedor_cliente_id);
CREATE INDEX idx_contas_receber_fornecedor_cliente ON public.contas_receber(fornecedor_cliente_id);