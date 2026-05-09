-- Criar tabela de contas bancárias
CREATE TABLE public.contas_bancarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  banco TEXT NOT NULL,
  agencia TEXT,
  conta TEXT NOT NULL,
  saldo_atual DECIMAL(10,2) NOT NULL DEFAULT 0,
  ativa BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de movimentações bancárias
CREATE TABLE public.movimentacoes_bancarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conta_bancaria_id UUID NOT NULL REFERENCES public.contas_bancarias(id) ON DELETE CASCADE,
  data_movimentacao DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  valor DECIMAL(10,2) NOT NULL,
  descricao TEXT NOT NULL,
  conciliado BOOLEAN NOT NULL DEFAULT false,
  origem_tipo TEXT CHECK (origem_tipo IN ('conta_receber', 'conta_pagar', 'manual')),
  origem_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de conciliações bancárias (histórico)
CREATE TABLE public.conciliacoes_bancarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conta_bancaria_id UUID NOT NULL REFERENCES public.contas_bancarias(id) ON DELETE CASCADE,
  data_conciliacao DATE NOT NULL,
  saldo_sistema DECIMAL(10,2) NOT NULL,
  saldo_banco DECIMAL(10,2) NOT NULL,
  diferenca DECIMAL(10,2) NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conciliacoes_bancarias ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas usuários master têm acesso
CREATE POLICY "Apenas masters podem acessar contas bancárias" 
ON public.contas_bancarias 
FOR ALL 
USING (is_master());

CREATE POLICY "Apenas masters podem acessar movimentações bancárias" 
ON public.movimentacoes_bancarias 
FOR ALL 
USING (is_master());

CREATE POLICY "Apenas masters podem acessar conciliações bancárias" 
ON public.conciliacoes_bancarias 
FOR ALL 
USING (is_master());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_contas_bancarias_updated_at
  BEFORE UPDATE ON public.contas_bancarias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar colunas às tabelas existentes para vincular movimentações bancárias
ALTER TABLE public.contas_receber 
ADD COLUMN conta_bancaria_id UUID REFERENCES public.contas_bancarias(id);

ALTER TABLE public.contas_pagar 
ADD COLUMN conta_bancaria_id UUID REFERENCES public.contas_bancarias(id);

ALTER TABLE public.transacoes_financeiras 
ADD COLUMN conta_bancaria_id UUID REFERENCES public.contas_bancarias(id);

-- Função para criar movimentação bancária automaticamente
CREATE OR REPLACE FUNCTION public.criar_movimentacao_bancaria()
RETURNS TRIGGER AS $$
BEGIN
  -- Se uma transação tem conta bancária vinculada, criar movimentação
  IF NEW.conta_bancaria_id IS NOT NULL THEN
    INSERT INTO public.movimentacoes_bancarias (
      conta_bancaria_id,
      data_movimentacao,
      tipo,
      valor,
      descricao,
      origem_tipo,
      origem_id
    ) VALUES (
      NEW.conta_bancaria_id,
      NEW.data_transacao,
      NEW.tipo,
      NEW.valor,
      CASE 
        WHEN NEW.tipo = 'recebimento' THEN 'Recebimento: ' || 
          (SELECT descricao FROM public.contas_receber WHERE id = NEW.conta_receber_id LIMIT 1)
        WHEN NEW.tipo = 'pagamento' THEN 'Pagamento: ' || 
          (SELECT descricao FROM public.contas_pagar WHERE id = NEW.conta_pagar_id LIMIT 1)
        ELSE 'Transação financeira'
      END,
      CASE 
        WHEN NEW.conta_receber_id IS NOT NULL THEN 'conta_receber'
        WHEN NEW.conta_pagar_id IS NOT NULL THEN 'conta_pagar'
        ELSE 'manual'
      END,
      COALESCE(NEW.conta_receber_id, NEW.conta_pagar_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar movimentações automaticamente
CREATE TRIGGER trigger_criar_movimentacao_bancaria
  AFTER INSERT ON public.transacoes_financeiras
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_movimentacao_bancaria();

-- Inserir algumas contas bancárias padrão
INSERT INTO public.contas_bancarias (nome, banco, conta, saldo_atual) VALUES
('Conta Corrente Principal', 'Banco do Brasil', '12345-6', 0),
('Conta Poupança', 'Caixa Econômica', '98765-4', 0);

-- Índices para performance
CREATE INDEX idx_movimentacoes_conta_data ON public.movimentacoes_bancarias(conta_bancaria_id, data_movimentacao);
CREATE INDEX idx_movimentacoes_conciliado ON public.movimentacoes_bancarias(conciliado);
CREATE INDEX idx_conciliacoes_conta_data ON public.conciliacoes_bancarias(conta_bancaria_id, data_conciliacao);