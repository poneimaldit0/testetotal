-- Criar tabelas de checklist para CRM Marcenaria
CREATE TABLE IF NOT EXISTS crm_marcenaria_checklist_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_marcenaria TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL,
  dias_para_alerta INTEGER NOT NULL DEFAULT 1,
  permite_whatsapp BOOLEAN DEFAULT false,
  modelo_mensagem_key TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_marcenaria_checklist_progresso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_marcenaria_leads(id) ON DELETE CASCADE,
  item_checklist_id UUID NOT NULL REFERENCES crm_marcenaria_checklist_etapas(id) ON DELETE CASCADE,
  concluido BOOLEAN DEFAULT false,
  concluido_por_id UUID REFERENCES profiles(id),
  concluido_por_nome TEXT,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lead_id, item_checklist_id)
);

CREATE INDEX idx_checklist_marcenaria_progresso_lead ON crm_marcenaria_checklist_progresso(lead_id);
CREATE INDEX idx_checklist_marcenaria_progresso_item ON crm_marcenaria_checklist_progresso(item_checklist_id);
CREATE INDEX idx_checklist_marcenaria_etapas_etapa ON crm_marcenaria_checklist_etapas(etapa_marcenaria);

-- RLS Policies
ALTER TABLE crm_marcenaria_checklist_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_marcenaria_checklist_progresso ENABLE ROW LEVEL SECURITY;

-- Políticas para checklist_etapas
CREATE POLICY "Admins e CS podem gerenciar itens do checklist"
  ON crm_marcenaria_checklist_etapas
  FOR ALL
  USING (is_admin_or_gestor() OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND tipo_usuario = 'customer_success' 
    AND status = 'ativo'
  ));

CREATE POLICY "Todos podem ver itens ativos do checklist"
  ON crm_marcenaria_checklist_etapas
  FOR SELECT
  USING (ativo = true);

-- Políticas para checklist_progresso
CREATE POLICY "Admins e CS podem ver progresso"
  ON crm_marcenaria_checklist_progresso
  FOR SELECT
  USING (is_admin_or_gestor() OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND tipo_usuario = 'customer_success' 
    AND status = 'ativo'
  ));

CREATE POLICY "Usuários autorizados podem atualizar progresso"
  ON crm_marcenaria_checklist_progresso
  FOR UPDATE
  USING (is_admin_or_gestor() OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND tipo_usuario = 'customer_success' 
    AND status = 'ativo'
  ));

CREATE POLICY "Sistema pode inserir progresso"
  ON crm_marcenaria_checklist_progresso
  FOR INSERT
  WITH CHECK (true);