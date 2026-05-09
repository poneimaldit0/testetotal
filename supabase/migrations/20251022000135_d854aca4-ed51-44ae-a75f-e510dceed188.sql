-- Criar enum para etapas do CRM
CREATE TYPE etapa_crm_enum AS ENUM (
  'orcamento_postado',
  'fornecedores_inscritos',
  'contato_agendamento',
  'em_orcamento',
  'propostas_enviadas',
  'compatibilizacao',
  'fechamento_contrato',
  'pos_venda_feedback'
);

-- Criar enum para status de contato
CREATE TYPE status_contato_enum AS ENUM (
  'sem_contato',
  'em_contato',
  'visita_agendada',
  'visita_realizada'
);

-- Criar tabela de tracking do CRM
CREATE TABLE public.orcamentos_crm_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE CASCADE NOT NULL UNIQUE,
  etapa_crm etapa_crm_enum NOT NULL DEFAULT 'orcamento_postado',
  status_contato status_contato_enum DEFAULT 'sem_contato',
  observacoes_internas TEXT,
  feedback_cliente_nota INTEGER CHECK (feedback_cliente_nota >= 1 AND feedback_cliente_nota <= 5),
  feedback_cliente_comentario TEXT,
  concierge_responsavel_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_orcamentos_crm_orcamento ON public.orcamentos_crm_tracking(orcamento_id);
CREATE INDEX idx_orcamentos_crm_etapa ON public.orcamentos_crm_tracking(etapa_crm);
CREATE INDEX idx_orcamentos_crm_concierge ON public.orcamentos_crm_tracking(concierge_responsavel_id);

-- Criar tabela de histórico de movimentações
CREATE TABLE public.orcamentos_crm_historico (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE CASCADE NOT NULL,
  etapa_anterior etapa_crm_enum,
  etapa_nova etapa_crm_enum NOT NULL,
  movido_por_id UUID REFERENCES public.profiles(id) NOT NULL,
  movido_por_nome TEXT NOT NULL,
  observacao TEXT,
  data_movimentacao TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscar histórico por orçamento
CREATE INDEX idx_crm_historico_orcamento ON public.orcamentos_crm_historico(orcamento_id);
CREATE INDEX idx_crm_historico_data ON public.orcamentos_crm_historico(data_movimentacao DESC);

-- Enable RLS
ALTER TABLE public.orcamentos_crm_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos_crm_historico ENABLE ROW LEVEL SECURITY;

-- Policies para tracking
CREATE POLICY "Admin e Gestor podem gerenciar CRM tracking"
ON public.orcamentos_crm_tracking
FOR ALL
USING (public.can_manage_orcamentos());

-- Policies para histórico
CREATE POLICY "Admin e Gestor podem ver histórico"
ON public.orcamentos_crm_historico
FOR SELECT
USING (public.can_manage_orcamentos());

CREATE POLICY "Admin e Gestor podem inserir histórico"
ON public.orcamentos_crm_historico
FOR INSERT
WITH CHECK (public.can_manage_orcamentos());

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_orcamentos_crm_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_orcamentos_crm_tracking
BEFORE UPDATE ON public.orcamentos_crm_tracking
FOR EACH ROW
EXECUTE FUNCTION update_orcamentos_crm_tracking_updated_at();

-- Função para inicializar novo orçamento no CRM
CREATE OR REPLACE FUNCTION public.inicializar_orcamento_crm(
  p_orcamento_id UUID,
  p_concierge_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Inserir tracking inicial apenas se não existir
  INSERT INTO public.orcamentos_crm_tracking (
    orcamento_id,
    etapa_crm,
    status_contato,
    concierge_responsavel_id
  ) 
  SELECT 
    p_orcamento_id,
    'orcamento_postado',
    'sem_contato',
    p_concierge_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.orcamentos_crm_tracking 
    WHERE orcamento_id = p_orcamento_id
  );
  
  -- Registrar no histórico apenas se foi inserido
  IF FOUND THEN
    INSERT INTO public.orcamentos_crm_historico (
      orcamento_id,
      etapa_anterior,
      etapa_nova,
      movido_por_id,
      movido_por_nome,
      observacao
    )
    SELECT 
      p_orcamento_id,
      NULL,
      'orcamento_postado',
      p_concierge_id,
      p.nome,
      'Orçamento criado e iniciado no CRM'
    FROM public.profiles p
    WHERE p.id = p_concierge_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para mover orçamento entre etapas
CREATE OR REPLACE FUNCTION public.mover_orcamento_etapa(
  p_orcamento_id UUID,
  p_nova_etapa TEXT,
  p_usuario_id UUID,
  p_observacao TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_etapa_anterior etapa_crm_enum;
  v_usuario_nome TEXT;
  v_result JSON;
BEGIN
  -- Buscar etapa anterior
  SELECT etapa_crm INTO v_etapa_anterior
  FROM public.orcamentos_crm_tracking
  WHERE orcamento_id = p_orcamento_id;
  
  IF v_etapa_anterior IS NULL THEN
    RAISE EXCEPTION 'Orçamento não encontrado no CRM';
  END IF;
  
  -- Buscar nome do usuário
  SELECT nome INTO v_usuario_nome
  FROM public.profiles
  WHERE id = p_usuario_id;
  
  -- Atualizar etapa atual
  UPDATE public.orcamentos_crm_tracking
  SET 
    etapa_crm = p_nova_etapa::etapa_crm_enum,
    observacoes_internas = COALESCE(p_observacao, observacoes_internas)
  WHERE orcamento_id = p_orcamento_id;
  
  -- Registrar no histórico
  INSERT INTO public.orcamentos_crm_historico (
    orcamento_id,
    etapa_anterior,
    etapa_nova,
    movido_por_id,
    movido_por_nome,
    observacao
  ) VALUES (
    p_orcamento_id,
    v_etapa_anterior,
    p_nova_etapa::etapa_crm_enum,
    p_usuario_id,
    v_usuario_nome,
    p_observacao
  );
  
  -- Retornar resultado
  v_result := json_build_object(
    'success', true,
    'etapa_anterior', v_etapa_anterior::text,
    'etapa_nova', p_nova_etapa,
    'movido_por', v_usuario_nome
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View para dados completos do CRM
CREATE OR REPLACE VIEW public.view_orcamentos_crm AS
SELECT 
  o.id,
  o.codigo_orcamento,
  o.necessidade,
  o.local,
  o.categorias,
  o.tamanho_imovel,
  o.dados_contato,
  o.data_publicacao,
  o.created_at,
  
  -- Dados do CRM tracking
  crm.etapa_crm::text as etapa_crm,
  crm.status_contato::text as status_contato,
  crm.observacoes_internas,
  crm.feedback_cliente_nota,
  crm.feedback_cliente_comentario,
  crm.updated_at as ultima_atualizacao,
  
  -- Concierge responsável
  crm.concierge_responsavel_id,
  p_concierge.nome as concierge_nome,
  p_concierge.email as concierge_email,
  
  -- Gestor da conta
  o.gestor_conta_id,
  p_gestor.nome as gestor_nome,
  
  -- Contagem de fornecedores inscritos
  (
    SELECT COUNT(*)::integer
    FROM public.candidaturas_fornecedores cf
    WHERE cf.orcamento_id = o.id
      AND cf.data_desistencia IS NULL
  ) as fornecedores_inscritos_count,
  
  -- Contagem de propostas enviadas (JOIN correto)
  (
    SELECT COUNT(*)::integer
    FROM public.checklist_propostas cp
    JOIN public.candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
    WHERE cf.orcamento_id = o.id
      AND cp.status IN ('enviado', 'em_revisao', 'aprovado', 'finalizada')
  ) as propostas_enviadas_count

FROM public.orcamentos o
LEFT JOIN public.orcamentos_crm_tracking crm ON o.id = crm.orcamento_id
LEFT JOIN public.profiles p_concierge ON crm.concierge_responsavel_id = p_concierge.id
LEFT JOIN public.profiles p_gestor ON o.gestor_conta_id = p_gestor.id
WHERE public.can_manage_orcamentos();

-- Comentários para documentação
COMMENT ON TABLE public.orcamentos_crm_tracking IS 'Tabela de tracking de orçamentos no CRM Kanban';
COMMENT ON TABLE public.orcamentos_crm_historico IS 'Histórico de movimentações dos orçamentos no CRM';
COMMENT ON FUNCTION public.inicializar_orcamento_crm IS 'Inicializa um orçamento no CRM com a primeira etapa';
COMMENT ON FUNCTION public.mover_orcamento_etapa IS 'Move um orçamento entre etapas do CRM e registra no histórico';