-- Criar tabela de tarefas para orçamentos CRM
CREATE TABLE public.crm_orcamentos_tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_vencimento DATE NOT NULL,
  
  concluida BOOLEAN DEFAULT false,
  data_conclusao TIMESTAMPTZ,
  concluida_por_id UUID,
  concluida_por_nome TEXT,
  
  criado_por_id UUID NOT NULL,
  criado_por_nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_crm_orcamentos_tarefas_orcamento ON public.crm_orcamentos_tarefas(orcamento_id);
CREATE INDEX idx_crm_orcamentos_tarefas_vencimento ON public.crm_orcamentos_tarefas(data_vencimento);
CREATE INDEX idx_crm_orcamentos_tarefas_concluida ON public.crm_orcamentos_tarefas(concluida);

-- RLS Policies
ALTER TABLE public.crm_orcamentos_tarefas ENABLE ROW LEVEL SECURITY;

-- Admins, Master e Customer Success podem ver e gerenciar todas as tarefas
CREATE POLICY "Admins podem ver tarefas CRM"
  ON public.crm_orcamentos_tarefas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND tipo_usuario IN ('admin', 'master', 'customer_success')
        AND status = 'ativo'
    )
  );

CREATE POLICY "Admins podem criar tarefas CRM"
  ON public.crm_orcamentos_tarefas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND tipo_usuario IN ('admin', 'master', 'customer_success')
        AND status = 'ativo'
    )
  );

CREATE POLICY "Admins podem atualizar tarefas CRM"
  ON public.crm_orcamentos_tarefas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND tipo_usuario IN ('admin', 'master', 'customer_success')
        AND status = 'ativo'
    )
  );

CREATE POLICY "Admins podem deletar tarefas CRM"
  ON public.crm_orcamentos_tarefas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND tipo_usuario IN ('admin', 'master', 'customer_success')
        AND status = 'ativo'
    )
  );

-- Gestores de conta podem gerenciar tarefas dos seus orçamentos
CREATE POLICY "Gestores podem ver tarefas dos seus orçamentos"
  ON public.crm_orcamentos_tarefas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orcamentos o
      WHERE o.id = crm_orcamentos_tarefas.orcamento_id
        AND o.gestor_conta_id = auth.uid()
    )
  );

CREATE POLICY "Gestores podem criar tarefas dos seus orçamentos"
  ON public.crm_orcamentos_tarefas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orcamentos o
      WHERE o.id = crm_orcamentos_tarefas.orcamento_id
        AND o.gestor_conta_id = auth.uid()
    )
  );

CREATE POLICY "Gestores podem atualizar tarefas dos seus orçamentos"
  ON public.crm_orcamentos_tarefas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.orcamentos o
      WHERE o.id = crm_orcamentos_tarefas.orcamento_id
        AND o.gestor_conta_id = auth.uid()
    )
  );

CREATE POLICY "Gestores podem deletar tarefas dos seus orçamentos"
  ON public.crm_orcamentos_tarefas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.orcamentos o
      WHERE o.id = crm_orcamentos_tarefas.orcamento_id
        AND o.gestor_conta_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER atualizar_updated_at_tarefas_crm
  BEFORE UPDATE ON public.crm_orcamentos_tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_updated_at_notas_crm();

-- Atualizar view para incluir contadores de tarefas
DROP VIEW IF EXISTS public.view_orcamentos_crm_com_checklist;

CREATE VIEW public.view_orcamentos_crm_com_checklist AS
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
  o.gestor_conta_id,
  
  -- CRM tracking
  t.etapa_crm,
  t.status_contato,
  t.observacoes_internas,
  t.feedback_cliente_nota,
  t.feedback_cliente_comentario,
  t.updated_at as ultima_atualizacao,
  t.valor_lead_estimado,
  t.concierge_responsavel_id,
  t.motivo_perda_id,
  t.justificativa_perda,
  t.data_conclusao,
  
  -- Responsáveis
  p_concierge.nome as concierge_nome,
  p_concierge.email as concierge_email,
  p_gestor.nome as gestor_nome,
  
  -- Motivo perda
  mp.nome as motivo_perda_nome,
  mp.descricao as motivo_perda_descricao,
  
  -- Contadores de fornecedores e propostas
  COUNT(DISTINCT cf.id) FILTER (WHERE cf.data_desistencia IS NULL) as fornecedores_inscritos_count,
  COUNT(DISTINCT cf.id) FILTER (WHERE cf.proposta_enviada = true AND cf.data_desistencia IS NULL) as propostas_enviadas_count,
  
  -- Tempo na etapa
  EXTRACT(DAY FROM (NOW() - t.updated_at))::INTEGER as tempo_na_etapa_dias,
  
  -- Checklist
  CASE 
    WHEN COUNT(pc.id) > 0 THEN 
      ROUND((COUNT(pc.id) FILTER (WHERE pc.concluido = true)::NUMERIC / COUNT(pc.id)::NUMERIC) * 100)::INTEGER
    ELSE 0 
  END as percentual_checklist_concluido,
  
  EXISTS (
    SELECT 1 
    FROM public.crm_checklist_progresso pc2
    JOIN public.crm_checklist_etapas ce ON ce.id = pc2.item_checklist_id
    WHERE pc2.orcamento_id = o.id 
      AND pc2.concluido = false
      AND ce.dias_para_alerta > 0
      AND t.updated_at < NOW() - (ce.dias_para_alerta || ' days')::INTERVAL
  ) as tem_alertas,
  
  COUNT(DISTINCT pc.id)::INTEGER as total_itens_checklist,
  COUNT(DISTINCT pc.id) FILTER (WHERE pc.concluido = true)::INTEGER as itens_checklist_concluidos,
  
  -- Contadores de tarefas
  COALESCE(COUNT(DISTINCT tar.id) FILTER (WHERE tar.concluida = false), 0)::integer as total_tarefas,
  COALESCE(COUNT(DISTINCT tar.id) FILTER (WHERE tar.data_vencimento = CURRENT_DATE AND tar.concluida = false), 0)::integer as tarefas_hoje,
  COALESCE(COUNT(DISTINCT tar.id) FILTER (WHERE tar.data_vencimento < CURRENT_DATE AND tar.concluida = false), 0)::integer as tarefas_atrasadas,
  COALESCE(COUNT(DISTINCT tar.id) FILTER (WHERE tar.concluida = true), 0)::integer as tarefas_concluidas

FROM public.orcamentos o
JOIN public.orcamentos_crm_tracking t ON t.orcamento_id = o.id
LEFT JOIN public.profiles p_concierge ON p_concierge.id = t.concierge_responsavel_id
LEFT JOIN public.profiles p_gestor ON p_gestor.id = o.gestor_conta_id
LEFT JOIN public.motivos_perda_crm mp ON mp.id = t.motivo_perda_id
LEFT JOIN public.candidaturas_fornecedores cf ON cf.orcamento_id = o.id
LEFT JOIN public.crm_checklist_progresso pc ON pc.orcamento_id = o.id
LEFT JOIN public.crm_orcamentos_tarefas tar ON tar.orcamento_id = o.id
GROUP BY 
  o.id, o.gestor_conta_id, t.etapa_crm, t.status_contato, t.observacoes_internas,
  t.feedback_cliente_nota, t.feedback_cliente_comentario, t.updated_at,
  t.valor_lead_estimado, t.concierge_responsavel_id, t.motivo_perda_id,
  t.justificativa_perda, t.data_conclusao,
  p_concierge.nome, p_concierge.email, p_gestor.nome,
  mp.nome, mp.descricao;