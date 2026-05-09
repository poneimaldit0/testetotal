-- Tabela para histórico de exclusões de contas (auditoria)
CREATE TABLE public.historico_exclusao_contas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conta_id UUID NOT NULL,
  tipo_conta TEXT NOT NULL CHECK (tipo_conta IN ('conta_receber', 'conta_pagar')),
  
  -- Dados da conta excluída (snapshot para auditoria)
  descricao TEXT NOT NULL,
  cliente_fornecedor TEXT NOT NULL,
  valor_original DECIMAL(15,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  
  -- Motivo e justificativa
  motivo_exclusao TEXT NOT NULL,
  observacao_exclusao TEXT,
  
  -- Auditoria
  excluido_por UUID,
  excluido_por_nome TEXT,
  data_exclusao TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.historico_exclusao_contas ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (apenas usuários autenticados)
CREATE POLICY "Usuarios autenticados podem ver historico de exclusoes" 
  ON public.historico_exclusao_contas FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados podem inserir historico de exclusoes" 
  ON public.historico_exclusao_contas FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Índices para consultas frequentes
CREATE INDEX idx_historico_exclusao_tipo_conta ON public.historico_exclusao_contas(tipo_conta);
CREATE INDEX idx_historico_exclusao_data ON public.historico_exclusao_contas(data_exclusao DESC);
CREATE INDEX idx_historico_exclusao_motivo ON public.historico_exclusao_contas(motivo_exclusao);