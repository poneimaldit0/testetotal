-- Tabela de clientes (evolução natural do sistema)
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  proposta_aceita_id UUID REFERENCES public.checklist_propostas(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  cpf TEXT,
  endereco_atual JSONB,
  endereco_reforma JSONB,  
  telefone TEXT,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'cadastro_pendente'::TEXT,
  data_aceite TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email)
);

-- Sistema de revisões de propostas  
CREATE TABLE public.revisoes_propostas_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_proposta_id UUID REFERENCES public.checklist_propostas(id) ON DELETE CASCADE,
  cliente_temp_email TEXT NOT NULL, -- Email temporário do cliente antes do cadastro
  motivo_revisao TEXT NOT NULL,
  status TEXT DEFAULT 'pendente'::TEXT,
  data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_resposta TIMESTAMP WITH TIME ZONE,
  observacoes_fornecedor TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contratos e assinaturas
CREATE TABLE public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  proposta_id UUID REFERENCES public.checklist_propostas(id) ON DELETE CASCADE,
  tipo TEXT DEFAULT 'principal'::TEXT, -- principal, aditivo
  documento_url TEXT,
  zapsign_document_id TEXT,
  status_assinatura TEXT DEFAULT 'aguardando'::TEXT,
  data_assinatura_cliente TIMESTAMP WITH TIME ZONE,
  data_assinatura_fornecedor TIMESTAMP WITH TIME ZONE,
  valor_contrato NUMERIC,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cronograma de obra
CREATE TABLE public.cronograma_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_checklist TEXT NOT NULL,
  categoria TEXT NOT NULL,
  data_inicio_prevista DATE,
  data_fim_prevista DATE,
  data_inicio_real DATE,
  data_fim_real DATE,
  status TEXT DEFAULT 'planejado'::TEXT, -- planejado, em_andamento, concluido, atrasado
  porcentagem_conclusao INTEGER DEFAULT 0,
  observacoes TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Solicações de materiais
CREATE TABLE public.solicitacoes_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo TEXT DEFAULT 'inicial'::TEXT, -- inicial, extra, mudanca
  descricao TEXT NOT NULL,
  valor_estimado NUMERIC,
  status TEXT DEFAULT 'solicitado'::TEXT, -- solicitado, aprovado, rejeitado, entregue
  data_necessidade DATE,
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  observacoes_cliente TEXT,
  observacoes_fornecedor TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medições de obra
CREATE TABLE public.medicoes_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  numero_medicao INTEGER NOT NULL,
  data_medicao DATE NOT NULL,
  valor_medicao NUMERIC NOT NULL,
  descricao TEXT,
  status TEXT DEFAULT 'enviada'::TEXT, -- enviada, aprovada, rejeitada, paga
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  data_pagamento TIMESTAMP WITH TIME ZONE,
  observacoes_cliente TEXT,
  observacoes_fornecedor TEXT,
  arquivos_comprobatorios JSONB, -- URLs das fotos/documentos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contrato_id, numero_medicao)
);

-- Diário de obra
CREATE TABLE public.diario_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  data_registro DATE NOT NULL,
  clima TEXT,
  atividades_realizadas TEXT NOT NULL,
  materiais_utilizados TEXT,
  funcionarios_presentes TEXT,
  observacoes TEXT,
  fotos JSONB, -- URLs das fotos
  visivel_cliente BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_clientes_orcamento_id ON public.clientes(orcamento_id);
CREATE INDEX idx_clientes_email ON public.clientes(email);
CREATE INDEX idx_revisoes_propostas_checklist_id ON public.revisoes_propostas_clientes(checklist_proposta_id);
CREATE INDEX idx_contratos_cliente_id ON public.contratos(cliente_id);
CREATE INDEX idx_contratos_fornecedor_id ON public.contratos(fornecedor_id);
CREATE INDEX idx_cronograma_contrato_id ON public.cronograma_obra(contrato_id);
CREATE INDEX idx_solicitacoes_contrato_id ON public.solicitacoes_materiais(contrato_id);
CREATE INDEX idx_medicoes_contrato_id ON public.medicoes_obra(contrato_id);
CREATE INDEX idx_diario_contrato_id ON public.diario_obra(contrato_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_revisoes_propostas_clientes_updated_at BEFORE UPDATE ON public.revisoes_propostas_clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cronograma_obra_updated_at BEFORE UPDATE ON public.cronograma_obra
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_solicitacoes_materiais_updated_at BEFORE UPDATE ON public.solicitacoes_materiais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medicoes_obra_updated_at BEFORE UPDATE ON public.medicoes_obra
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revisoes_propostas_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cronograma_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicoes_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diario_obra ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público para comparação
CREATE POLICY "Acesso público para clientes via token" ON public.clientes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tokens_comparacao_cliente t
    JOIN public.orcamentos o ON o.id = t.orcamento_id
    WHERE o.id = clientes.orcamento_id AND t.expires_at > NOW()
  )
);

-- Políticas para admins
CREATE POLICY "Admins podem gerenciar clientes" ON public.clientes
FOR ALL USING (public.is_admin());

CREATE POLICY "Admins podem gerenciar revisões" ON public.revisoes_propostas_clientes
FOR ALL USING (public.is_admin());

CREATE POLICY "Admins podem gerenciar contratos" ON public.contratos
FOR ALL USING (public.is_admin());

CREATE POLICY "Admins podem gerenciar cronograma" ON public.cronograma_obra
FOR ALL USING (public.is_admin());

CREATE POLICY "Admins podem gerenciar solicitações" ON public.solicitacoes_materiais
FOR ALL USING (public.is_admin());

CREATE POLICY "Admins podem gerenciar medições" ON public.medicoes_obra
FOR ALL USING (public.is_admin());

CREATE POLICY "Admins podem gerenciar diário" ON public.diario_obra
FOR ALL USING (public.is_admin());

-- Políticas para fornecedores
CREATE POLICY "Fornecedores podem ver seus contratos" ON public.contratos
FOR SELECT USING (fornecedor_id = auth.uid());

CREATE POLICY "Fornecedores podem gerenciar seu cronograma" ON public.cronograma_obra
FOR ALL USING (fornecedor_id = auth.uid());

CREATE POLICY "Fornecedores podem gerenciar suas solicitações" ON public.solicitacoes_materiais
FOR ALL USING (fornecedor_id = auth.uid());

CREATE POLICY "Fornecedores podem gerenciar suas medições" ON public.medicoes_obra
FOR ALL USING (fornecedor_id = auth.uid());

CREATE POLICY "Fornecedores podem gerenciar seu diário" ON public.diario_obra
FOR ALL USING (fornecedor_id = auth.uid());

-- Políticas para clientes autenticados
CREATE POLICY "Clientes podem ver seus dados" ON public.clientes
FOR ALL USING (auth_user_id = auth.uid());

CREATE POLICY "Clientes podem ver contratos de seus projetos" ON public.contratos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = contratos.cliente_id AND c.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Clientes podem gerenciar solicitações de seus projetos" ON public.solicitacoes_materiais
FOR ALL USING (cliente_id IN (
  SELECT id FROM public.clientes WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Clientes podem ver medições de seus projetos" ON public.medicoes_obra
FOR SELECT USING (
  contrato_id IN (
    SELECT id FROM public.contratos WHERE cliente_id IN (
      SELECT id FROM public.clientes WHERE auth_user_id = auth.uid()
    )
  )
);

CREATE POLICY "Clientes podem ver diário de seus projetos" ON public.diario_obra
FOR SELECT USING (
  visivel_cliente = TRUE AND contrato_id IN (
    SELECT id FROM public.contratos WHERE cliente_id IN (
      SELECT id FROM public.clientes WHERE auth_user_id = auth.uid()
    )
  )
);