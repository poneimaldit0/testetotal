-- Tabela para checklist da Semana 0 (Pré-Onboarding)
CREATE TABLE public.cs_checklist_semana_zero (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cs_fornecedor_id UUID NOT NULL REFERENCES public.cs_fornecedores(id) ON DELETE CASCADE,
  
  -- Itens do checklist
  boas_vindas_enviada BOOLEAN NOT NULL DEFAULT FALSE,
  grupo_whatsapp_criado BOOLEAN NOT NULL DEFAULT FALSE,
  material_educativo_enviado BOOLEAN NOT NULL DEFAULT FALSE,
  documentos_solicitados BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Observações opcionais
  observacoes TEXT,
  
  -- Conclusão
  concluido BOOLEAN NOT NULL DEFAULT FALSE,
  concluido_por_id UUID,
  concluido_por_nome TEXT,
  data_conclusao TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Cada fornecedor só pode ter um checklist de semana 0
  UNIQUE(cs_fornecedor_id)
);

-- Habilitar RLS
ALTER TABLE public.cs_checklist_semana_zero ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins e CS podem ver checklist semana zero"
ON public.cs_checklist_semana_zero
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.tipo_usuario IN ('admin', 'master', 'customer_success')
    AND profiles.status = 'ativo'
  )
);

CREATE POLICY "Admins e CS podem inserir checklist semana zero"
ON public.cs_checklist_semana_zero
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.tipo_usuario IN ('admin', 'master', 'customer_success')
    AND profiles.status = 'ativo'
  )
);

CREATE POLICY "Admins e CS podem atualizar checklist semana zero"
ON public.cs_checklist_semana_zero
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.tipo_usuario IN ('admin', 'master', 'customer_success')
    AND profiles.status = 'ativo'
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_cs_checklist_semana_zero_updated_at
BEFORE UPDATE ON public.cs_checklist_semana_zero
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Alterar cs_fornecedores para permitir semana_atual = 0
-- (já aceita 0 por ser INTEGER, mas garantir que novos fornecedores comecem em 0)
ALTER TABLE public.cs_fornecedores 
ALTER COLUMN semana_atual SET DEFAULT 0;