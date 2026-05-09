-- Migration: Sistema de Checklists por Etapa do CRM (FINAL)

-- ============================================================================
-- PARTE 1: CRIAR TABELAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_checklist_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_crm public.etapa_crm_enum NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 1,
  dias_para_alerta INTEGER NOT NULL DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_checklist_etapas_etapa ON public.crm_checklist_etapas(etapa_crm);

CREATE TABLE IF NOT EXISTS public.crm_checklist_progresso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  item_checklist_id UUID NOT NULL REFERENCES public.crm_checklist_etapas(id) ON DELETE CASCADE,
  concluido BOOLEAN NOT NULL DEFAULT false,
  concluido_por_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  concluido_por_nome TEXT,
  data_conclusao TIMESTAMPTZ,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(orcamento_id, item_checklist_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_checklist_progresso_orcamento ON public.crm_checklist_progresso(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_crm_checklist_progresso_item ON public.crm_checklist_progresso(item_checklist_id);
CREATE INDEX IF NOT EXISTS idx_crm_checklist_progresso_concluido ON public.crm_checklist_progresso(orcamento_id, concluido);

-- ============================================================================
-- PARTE 2: ADICIONAR CAMPOS EM orcamentos_crm_tracking
-- ============================================================================

ALTER TABLE public.orcamentos_crm_tracking 
ADD COLUMN IF NOT EXISTS data_entrada_etapa_atual TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS tem_alertas_pendentes BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS total_itens_checklist INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS itens_checklist_concluidos INTEGER DEFAULT 0;

-- ============================================================================
-- PARTE 3: INSERIR DADOS INICIAIS DOS CHECKLISTS
-- ============================================================================

INSERT INTO public.crm_checklist_etapas (etapa_crm, titulo, descricao, ordem, dias_para_alerta) VALUES
('orcamento_postado', 'Enviar mensagem de boas-vindas para o cliente', 'Fazer o primeiro contato apresentando a plataforma e o processo', 1, 1),
('contato_agendamento', 'Perguntar ao cliente se deu tudo certo com o contato das empresas', 'Verificar se os fornecedores conseguiram fazer contato inicial', 1, 2),
('em_orcamento', 'Perguntar ao cliente se deu tudo certo com as visitas ou reuniões', 'Acompanhar se as visitas técnicas foram realizadas', 1, 7),
('propostas_enviadas', 'Verificar se o fornecedor enviou a proposta', 'Confirmar que as propostas foram recebidas pelo cliente', 1, 5),
('propostas_enviadas', 'Enviar mensagem de acompanhamento para o cliente', 'Perguntar se o cliente recebeu e analisou as propostas', 2, 5),
('compatibilizacao', 'Enviar o documento de compatibilização para o cliente', 'Preparar e enviar comparativo das propostas', 1, 1),
('compatibilizacao', 'Definir o próximo passo com o cliente', 'Agendar reunião de análise ou decisão', 2, 1),
('fechamento_contrato', 'Criar o grupo de WhatsApp com o fornecedor e o cliente', 'Facilitar a comunicação entre as partes', 1, 1),
('pos_venda_feedback', 'Enviar o link de avaliação para o cliente', 'Coletar feedback sobre a experiência', 1, 1)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PARTE 4: FUNCTIONS E TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.atualizar_data_entrada_etapa()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.etapa_crm IS DISTINCT FROM OLD.etapa_crm THEN
    NEW.data_entrada_etapa_atual = now();
    NEW.tem_alertas_pendentes = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_data_entrada_etapa ON public.orcamentos_crm_tracking;
CREATE TRIGGER trigger_atualizar_data_entrada_etapa
  BEFORE UPDATE ON public.orcamentos_crm_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_data_entrada_etapa();

CREATE OR REPLACE FUNCTION public.inicializar_checklist_orcamento()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.etapa_crm IS DISTINCT FROM OLD.etapa_crm THEN
    INSERT INTO public.crm_checklist_progresso (
      orcamento_id,
      item_checklist_id,
      concluido
    )
    SELECT 
      NEW.orcamento_id,
      ce.id,
      false
    FROM public.crm_checklist_etapas ce
    WHERE ce.etapa_crm = NEW.etapa_crm
      AND ce.ativo = true
    ON CONFLICT (orcamento_id, item_checklist_id) DO NOTHING;
    
    UPDATE public.orcamentos_crm_tracking
    SET total_itens_checklist = (
      SELECT COUNT(*)
      FROM public.crm_checklist_progresso
      WHERE orcamento_id = NEW.orcamento_id
    ),
    itens_checklist_concluidos = (
      SELECT COUNT(*)
      FROM public.crm_checklist_progresso
      WHERE orcamento_id = NEW.orcamento_id AND concluido = true
    )
    WHERE orcamento_id = NEW.orcamento_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_inicializar_checklist ON public.orcamentos_crm_tracking;
CREATE TRIGGER trigger_inicializar_checklist
  AFTER UPDATE ON public.orcamentos_crm_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.inicializar_checklist_orcamento();

CREATE OR REPLACE FUNCTION public.atualizar_contadores_checklist()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.orcamentos_crm_tracking
  SET 
    itens_checklist_concluidos = (
      SELECT COUNT(*)
      FROM public.crm_checklist_progresso
      WHERE orcamento_id = COALESCE(NEW.orcamento_id, OLD.orcamento_id)
        AND concluido = true
    ),
    total_itens_checklist = (
      SELECT COUNT(*)
      FROM public.crm_checklist_progresso
      WHERE orcamento_id = COALESCE(NEW.orcamento_id, OLD.orcamento_id)
    )
  WHERE orcamento_id = COALESCE(NEW.orcamento_id, OLD.orcamento_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_contadores_checklist ON public.crm_checklist_progresso;
CREATE TRIGGER trigger_atualizar_contadores_checklist
  AFTER INSERT OR UPDATE OR DELETE ON public.crm_checklist_progresso
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_contadores_checklist();

CREATE OR REPLACE FUNCTION public.calcular_alertas_checklist()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.orcamentos_crm_tracking oct
  SET tem_alertas_pendentes = (
    SELECT EXISTS (
      SELECT 1
      FROM public.crm_checklist_progresso cp
      JOIN public.crm_checklist_etapas ce ON ce.id = cp.item_checklist_id
      WHERE cp.orcamento_id = oct.orcamento_id
        AND ce.etapa_crm = oct.etapa_crm
        AND cp.concluido = false
        AND oct.data_entrada_etapa_atual + (ce.dias_para_alerta || ' days')::INTERVAL <= now()
    )
  );
END;
$$;

-- ============================================================================
-- PARTE 5: CRIAR VIEW ESTENDIDA COM CHECKLIST
-- ============================================================================

CREATE OR REPLACE VIEW public.view_orcamentos_crm_com_checklist AS
SELECT 
  voc.*,
  EXTRACT(DAY FROM (now() - COALESCE(oct.data_entrada_etapa_atual, voc.created_at)))::INTEGER as tempo_na_etapa_dias,
  CASE 
    WHEN oct.total_itens_checklist > 0 
    THEN ROUND((oct.itens_checklist_concluidos::NUMERIC / oct.total_itens_checklist::NUMERIC) * 100, 0)
    ELSE 0
  END as percentual_checklist_concluido,
  COALESCE(oct.tem_alertas_pendentes, false) as tem_alertas,
  COALESCE(oct.total_itens_checklist, 0) as total_itens_checklist,
  COALESCE(oct.itens_checklist_concluidos, 0) as itens_checklist_concluidos
FROM public.view_orcamentos_crm voc
LEFT JOIN public.orcamentos_crm_tracking oct ON oct.orcamento_id = voc.id;

-- ============================================================================
-- PARTE 6: INICIALIZAR CHECKLISTS PARA ORÇAMENTOS EXISTENTES
-- ============================================================================

UPDATE public.orcamentos_crm_tracking
SET data_entrada_etapa_atual = COALESCE(data_entrada_etapa_atual, created_at)
WHERE data_entrada_etapa_atual IS NULL;

INSERT INTO public.crm_checklist_progresso (
  orcamento_id,
  item_checklist_id,
  concluido
)
SELECT 
  oct.orcamento_id,
  ce.id,
  false
FROM public.orcamentos_crm_tracking oct
CROSS JOIN public.crm_checklist_etapas ce
WHERE ce.etapa_crm = oct.etapa_crm
  AND ce.ativo = true
ON CONFLICT (orcamento_id, item_checklist_id) DO NOTHING;

UPDATE public.orcamentos_crm_tracking oct
SET 
  total_itens_checklist = (
    SELECT COUNT(*)
    FROM public.crm_checklist_progresso cp
    WHERE cp.orcamento_id = oct.orcamento_id
  ),
  itens_checklist_concluidos = (
    SELECT COUNT(*)
    FROM public.crm_checklist_progresso cp
    WHERE cp.orcamento_id = oct.orcamento_id AND cp.concluido = true
  );

-- ============================================================================
-- PARTE 7: RLS POLICIES
-- ============================================================================

ALTER TABLE public.crm_checklist_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_checklist_progresso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ler itens de checklist"
  ON public.crm_checklist_etapas FOR SELECT
  USING (true);

CREATE POLICY "Apenas admins podem gerenciar itens de checklist"
  ON public.crm_checklist_etapas FOR ALL
  USING (public.is_admin());

CREATE POLICY "Usuários podem ver progresso de seus orçamentos"
  ON public.crm_checklist_progresso FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orcamentos_crm_tracking oct
      WHERE oct.orcamento_id = crm_checklist_progresso.orcamento_id
        AND (
          oct.concierge_responsavel_id = auth.uid()
          OR public.is_admin()
        )
    )
  );

CREATE POLICY "Usuários podem atualizar progresso de seus orçamentos"
  ON public.crm_checklist_progresso FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.orcamentos_crm_tracking oct
      WHERE oct.orcamento_id = crm_checklist_progresso.orcamento_id
        AND (
          oct.concierge_responsavel_id = auth.uid()
          OR public.is_admin()
        )
    )
  );

CREATE POLICY "Sistema pode inserir progresso"
  ON public.crm_checklist_progresso FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- PARTE 8: CONFIGURAR PG_CRON PARA ALERTAS DIÁRIOS
-- ============================================================================

SELECT cron.schedule(
  'calcular-alertas-crm-diario',
  '0 8 * * *',
  $$SELECT public.calcular_alertas_checklist()$$
);