-- Criar tabela de tarefas para leads de marcenaria
CREATE TABLE public.crm_marcenaria_tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.crm_marcenaria_leads(id) ON DELETE CASCADE,
  
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
CREATE INDEX idx_marcenaria_tarefas_lead ON public.crm_marcenaria_tarefas(lead_id);
CREATE INDEX idx_marcenaria_tarefas_vencimento ON public.crm_marcenaria_tarefas(data_vencimento);
CREATE INDEX idx_marcenaria_tarefas_concluida ON public.crm_marcenaria_tarefas(concluida);

-- RLS Policies
ALTER TABLE public.crm_marcenaria_tarefas ENABLE ROW LEVEL SECURITY;

-- Admins e Masters podem ver tudo
CREATE POLICY "Admins podem ver todas as tarefas"
  ON public.crm_marcenaria_tarefas
  FOR SELECT
  USING (public.is_admin());

-- Admins e Masters podem inserir
CREATE POLICY "Admins podem criar tarefas"
  ON public.crm_marcenaria_tarefas
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins e Masters podem atualizar
CREATE POLICY "Admins podem atualizar tarefas"
  ON public.crm_marcenaria_tarefas
  FOR UPDATE
  USING (public.is_admin());

-- Admins e Masters podem deletar
CREATE POLICY "Admins podem deletar tarefas"
  ON public.crm_marcenaria_tarefas
  FOR DELETE
  USING (public.is_admin());

-- Trigger para updated_at
CREATE TRIGGER atualizar_updated_at_tarefas_marcenaria
  BEFORE UPDATE ON public.crm_marcenaria_tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_updated_at_avisos();