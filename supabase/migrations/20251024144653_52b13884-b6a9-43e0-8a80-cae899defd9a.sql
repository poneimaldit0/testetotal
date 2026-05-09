-- Criar tabela para notas do CRM
CREATE TABLE IF NOT EXISTS public.crm_notas_orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  criado_por_id UUID NOT NULL,
  criado_por_nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  editada BOOLEAN DEFAULT false
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_crm_notas_orcamento ON public.crm_notas_orcamentos(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_crm_notas_created ON public.crm_notas_orcamentos(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.crm_notas_orcamentos ENABLE ROW LEVEL SECURITY;

-- Policy: Acesso a notas CRM (admin, master e gestor responsável)
CREATE POLICY "Acesso a notas CRM" ON public.crm_notas_orcamentos
  FOR SELECT
  USING (
    public.is_admin_or_gestor()
    OR EXISTS (
      SELECT 1 FROM public.orcamentos_crm_tracking oct
      WHERE oct.orcamento_id = crm_notas_orcamentos.orcamento_id
        AND oct.concierge_responsavel_id = auth.uid()
    )
  );

-- Policy: Criar notas CRM
CREATE POLICY "Criar notas CRM" ON public.crm_notas_orcamentos
  FOR INSERT
  WITH CHECK (
    criado_por_id = auth.uid()
    AND (
      public.is_admin_or_gestor()
      OR EXISTS (
        SELECT 1 FROM public.orcamentos_crm_tracking oct
        WHERE oct.orcamento_id = crm_notas_orcamentos.orcamento_id
          AND oct.concierge_responsavel_id = auth.uid()
      )
    )
  );

-- Policy: Editar próprias notas
CREATE POLICY "Editar próprias notas CRM" ON public.crm_notas_orcamentos
  FOR UPDATE
  USING (criado_por_id = auth.uid())
  WITH CHECK (criado_por_id = auth.uid());

-- Policy: Deletar próprias notas
CREATE POLICY "Deletar próprias notas CRM" ON public.crm_notas_orcamentos
  FOR DELETE
  USING (criado_por_id = auth.uid());

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.atualizar_updated_at_notas_crm()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF OLD.conteudo IS DISTINCT FROM NEW.conteudo THEN
    NEW.editada = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_updated_at_notas_crm
  BEFORE UPDATE ON public.crm_notas_orcamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_updated_at_notas_crm();