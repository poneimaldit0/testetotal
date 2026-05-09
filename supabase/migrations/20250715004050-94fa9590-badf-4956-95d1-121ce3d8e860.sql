-- Criar tabela de fechamentos de caixa
CREATE TABLE public.fechamentos_caixa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conta_bancaria_id UUID NOT NULL REFERENCES public.contas_bancarias(id),
  data_fechamento DATE NOT NULL,
  saldo_inicial NUMERIC NOT NULL DEFAULT 0,
  saldo_final NUMERIC NOT NULL DEFAULT 0,
  total_movimentacoes INTEGER NOT NULL DEFAULT 0,
  usuario_fechamento_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'fechado',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conta_bancaria_id, data_fechamento)
);

-- Habilitar RLS
ALTER TABLE public.fechamentos_caixa ENABLE ROW LEVEL SECURITY;

-- Apenas masters podem acessar fechamentos de caixa
CREATE POLICY "Apenas masters podem acessar fechamentos de caixa" 
ON public.fechamentos_caixa 
FOR ALL 
USING (is_master());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_fechamentos_caixa_updated_at
BEFORE UPDATE ON public.fechamentos_caixa
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para verificar se uma data está em período fechado
CREATE OR REPLACE FUNCTION public.verificar_periodo_fechado(
  p_conta_bancaria_id UUID,
  p_data DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.fechamentos_caixa 
    WHERE conta_bancaria_id = p_conta_bancaria_id 
      AND data_fechamento = p_data 
      AND status = 'fechado'
  );
END;
$$;

-- Função para fechar caixa
CREATE OR REPLACE FUNCTION public.fechar_caixa(
  p_conta_bancaria_id UUID,
  p_data_fechamento DATE,
  p_observacoes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_saldo_inicial NUMERIC;
  v_saldo_final NUMERIC;
  v_total_movimentacoes INTEGER;
  v_movimentacoes_pendentes INTEGER;
BEGIN
  -- Verificar se é master
  IF NOT public.is_master() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Apenas usuários master podem fechar caixas'
    );
  END IF;

  -- Verificar se já existe fechamento para esta data
  IF EXISTS (
    SELECT 1 FROM public.fechamentos_caixa 
    WHERE conta_bancaria_id = p_conta_bancaria_id 
      AND data_fechamento = p_data_fechamento
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_closed',
      'message', 'Caixa já foi fechado para esta data'
    );
  END IF;

  -- Contar movimentações não conciliadas
  SELECT COUNT(*) INTO v_movimentacoes_pendentes
  FROM public.movimentacoes_bancarias
  WHERE conta_bancaria_id = p_conta_bancaria_id
    AND data_movimentacao = p_data_fechamento
    AND conciliado = false;

  IF v_movimentacoes_pendentes > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'pending_transactions',
      'message', format('Existem %s movimentações não conciliadas', v_movimentacoes_pendentes)
    );
  END IF;

  -- Calcular saldos e total de movimentações
  SELECT 
    COALESCE(saldo_atual, 0) INTO v_saldo_inicial
  FROM public.contas_bancarias
  WHERE id = p_conta_bancaria_id;

  SELECT COUNT(*) INTO v_total_movimentacoes
  FROM public.movimentacoes_bancarias
  WHERE conta_bancaria_id = p_conta_bancaria_id
    AND data_movimentacao = p_data_fechamento;

  v_saldo_final := v_saldo_inicial;

  -- Criar registro de fechamento
  INSERT INTO public.fechamentos_caixa (
    conta_bancaria_id,
    data_fechamento,
    saldo_inicial,
    saldo_final,
    total_movimentacoes,
    usuario_fechamento_id,
    observacoes
  ) VALUES (
    p_conta_bancaria_id,
    p_data_fechamento,
    v_saldo_inicial,
    v_saldo_final,
    v_total_movimentacoes,
    auth.uid(),
    p_observacoes
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Caixa fechado com sucesso',
    'data_fechamento', p_data_fechamento,
    'total_movimentacoes', v_total_movimentacoes
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Erro interno: ' || SQLERRM
    );
END;
$$;

-- Função para reabrir caixa
CREATE OR REPLACE FUNCTION public.reabrir_caixa(
  p_conta_bancaria_id UUID,
  p_data_fechamento DATE,
  p_motivo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se é master
  IF NOT public.is_master() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Apenas usuários master podem reabrir caixas'
    );
  END IF;

  -- Verificar se existe fechamento para esta data
  IF NOT EXISTS (
    SELECT 1 FROM public.fechamentos_caixa 
    WHERE conta_bancaria_id = p_conta_bancaria_id 
      AND data_fechamento = p_data_fechamento
      AND status = 'fechado'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Caixa não encontrado ou já está aberto'
    );
  END IF;

  -- Remover o fechamento (reabrir)
  DELETE FROM public.fechamentos_caixa
  WHERE conta_bancaria_id = p_conta_bancaria_id 
    AND data_fechamento = p_data_fechamento;

  -- Log da reabertura
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (
    auth.uid(), 
    'reabertura_caixa: ' || p_data_fechamento || ' - Motivo: ' || COALESCE(p_motivo, 'Não informado')
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Caixa reaberto com sucesso'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error', 
      'message', 'Erro interno: ' || SQLERRM
    );
END;
$$;