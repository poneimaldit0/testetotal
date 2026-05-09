-- Criar tabela para backups de revisões de propostas
CREATE TABLE IF NOT EXISTS public.backups_revisoes_propostas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_proposta_id UUID NOT NULL REFERENCES public.checklist_propostas(id) ON DELETE CASCADE,
  respostas_backup JSONB NOT NULL DEFAULT '[]'::jsonb,
  valor_total_backup NUMERIC NOT NULL DEFAULT 0,
  forma_pagamento_backup JSONB,
  data_backup TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  motivo_backup TEXT NOT NULL DEFAULT 'Backup automático',
  restored BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.backups_revisoes_propostas ENABLE ROW LEVEL SECURITY;

-- Política para admins gerenciarem todos os backups
CREATE POLICY "Admins podem gerenciar todos os backups"
ON public.backups_revisoes_propostas
FOR ALL
USING (is_admin());

-- Política para fornecedores acessarem seus próprios backups
CREATE POLICY "Fornecedores podem acessar seus backups"
ON public.backups_revisoes_propostas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.checklist_propostas cp
    JOIN public.candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
    WHERE cp.id = backups_revisoes_propostas.checklist_proposta_id
    AND cf.fornecedor_id = auth.uid()
  )
);

-- Índices para melhor performance
CREATE INDEX idx_backups_checklist_proposta ON public.backups_revisoes_propostas(checklist_proposta_id);
CREATE INDEX idx_backups_data_backup ON public.backups_revisoes_propostas(data_backup DESC);
CREATE INDEX idx_backups_restored ON public.backups_revisoes_propostas(restored) WHERE NOT restored;