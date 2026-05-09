-- =============================================
-- CRM MARCENARIA - MÓDULO COMPLETO
-- =============================================

-- 1. Tabela de motivos de perda específicos para marcenaria
CREATE TABLE motivos_perda_marcenaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir motivos padrão
INSERT INTO motivos_perda_marcenaria (nome, ordem) VALUES
('Preço acima do orçamento', 1),
('Já contratou outro fornecedor', 2),
('Não tem interesse em marcenaria', 3),
('Obra paralisada/cancelada', 4),
('Não respondeu após 3 tentativas', 5),
('Quer fazer por conta própria', 6),
('Outros', 99);

-- 2. Tabela principal de leads de marcenaria
CREATE TABLE crm_marcenaria_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  codigo_orcamento TEXT,
  
  -- Dados do cliente
  cliente_nome TEXT,
  cliente_email TEXT,
  cliente_telefone TEXT,
  
  -- Etapa do funil de marcenaria
  etapa_marcenaria TEXT NOT NULL DEFAULT 'identificacao_automatica',
  
  -- Status e controle
  bloqueado BOOLEAN DEFAULT TRUE,
  data_desbloqueio TIMESTAMP WITH TIME ZONE,
  data_criacao_lead TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Responsável
  consultor_responsavel_id UUID REFERENCES profiles(id),
  consultor_nome TEXT,
  
  -- Informações coletadas no briefing
  ambientes_mobiliar TEXT[],
  tem_planta BOOLEAN,
  tem_medidas BOOLEAN,
  tem_fotos BOOLEAN,
  estilo_preferido TEXT,
  
  -- Projeto e documentos
  projeto_url TEXT,
  projeto_enviado_em TIMESTAMP WITH TIME ZONE,
  
  -- Reunião
  reuniao_agendada_para TIMESTAMP WITH TIME ZONE,
  reuniao_realizada_em TIMESTAMP WITH TIME ZONE,
  
  -- Contrato
  contratado BOOLEAN DEFAULT FALSE,
  valor_contrato NUMERIC(10,2),
  data_contratacao TIMESTAMP WITH TIME ZONE,
  
  -- Observações e feedback
  observacoes_internas TEXT,
  feedback_cliente TEXT,
  
  -- Motivo de perda
  motivo_perda_id UUID REFERENCES motivos_perda_marcenaria(id),
  justificativa_perda TEXT,
  data_perda TIMESTAMP WITH TIME ZONE,
  
  -- Controle de mensagens automáticas
  mensagem_1_enviada BOOLEAN DEFAULT FALSE,
  mensagem_1_enviada_em TIMESTAMP WITH TIME ZONE,
  mensagem_2_enviada BOOLEAN DEFAULT FALSE,
  mensagem_2_enviada_em TIMESTAMP WITH TIME ZONE,
  mensagem_3_enviada BOOLEAN DEFAULT FALSE,
  mensagem_3_enviada_em TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_crm_marcenaria_orcamento ON crm_marcenaria_leads(orcamento_id);
CREATE INDEX idx_crm_marcenaria_etapa ON crm_marcenaria_leads(etapa_marcenaria);
CREATE INDEX idx_crm_marcenaria_consultor ON crm_marcenaria_leads(consultor_responsavel_id);
CREATE INDEX idx_crm_marcenaria_desbloqueio ON crm_marcenaria_leads(data_desbloqueio);
CREATE INDEX idx_crm_marcenaria_bloqueado ON crm_marcenaria_leads(bloqueado);

-- 3. Tabela de histórico de movimentações
CREATE TABLE crm_marcenaria_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_marcenaria_leads(id) ON DELETE CASCADE,
  etapa_anterior TEXT,
  etapa_nova TEXT NOT NULL,
  movido_por_id UUID REFERENCES profiles(id),
  movido_por_nome TEXT,
  observacao TEXT,
  data_movimentacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_marcenaria_hist_lead ON crm_marcenaria_historico(lead_id);

-- 4. Tabela de notas
CREATE TABLE crm_marcenaria_notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_marcenaria_leads(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  criado_por_id UUID NOT NULL REFERENCES profiles(id),
  criado_por_nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  editada BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_marcenaria_notas_lead ON crm_marcenaria_notas(lead_id);

-- 5. View consolidada para o Kanban
CREATE OR REPLACE VIEW view_crm_marcenaria_leads AS
SELECT 
  cml.*,
  o.necessidade,
  o.local,
  o.categorias,
  (cml.data_desbloqueio IS NOT NULL AND cml.data_desbloqueio <= NOW()) AS pode_visualizar,
  EXTRACT(DAY FROM NOW() - cml.data_criacao_lead)::INTEGER AS dias_desde_criacao,
  (SELECT COUNT(*) FROM crm_marcenaria_notas WHERE lead_id = cml.id) AS total_notas
FROM crm_marcenaria_leads cml
JOIN orcamentos o ON o.id = cml.orcamento_id;

-- 6. Função para criar leads automaticamente após 7 dias
CREATE OR REPLACE FUNCTION criar_lead_marcenaria_apos_7_dias()
RETURNS void AS $$
BEGIN
  INSERT INTO crm_marcenaria_leads (
    orcamento_id,
    codigo_orcamento,
    cliente_nome,
    cliente_email,
    cliente_telefone,
    data_desbloqueio,
    bloqueado
  )
  SELECT 
    oct.orcamento_id,
    o.codigo_orcamento,
    o.dados_contato->>'nome',
    o.dados_contato->>'email',
    o.dados_contato->>'telefone',
    o.created_at + INTERVAL '7 days',
    TRUE
  FROM orcamentos_crm_tracking oct
  JOIN orcamentos o ON o.id = oct.orcamento_id
  WHERE 
    oct.etapa_crm NOT IN ('perdido', 'ganho')
    AND o.created_at <= NOW() - INTERVAL '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM crm_marcenaria_leads 
      WHERE orcamento_id = oct.orcamento_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Função RPC para mover lead entre etapas
CREATE OR REPLACE FUNCTION mover_lead_marcenaria_etapa(
  p_lead_id UUID,
  p_nova_etapa TEXT,
  p_observacao TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_etapa_anterior TEXT;
  v_user_id UUID;
  v_user_nome TEXT;
BEGIN
  SELECT auth.uid() INTO v_user_id;
  SELECT nome FROM profiles WHERE id = v_user_id INTO v_user_nome;
  
  SELECT etapa_marcenaria INTO v_etapa_anterior
  FROM crm_marcenaria_leads
  WHERE id = p_lead_id;
  
  UPDATE crm_marcenaria_leads
  SET 
    etapa_marcenaria = p_nova_etapa,
    updated_at = NOW()
  WHERE id = p_lead_id;
  
  INSERT INTO crm_marcenaria_historico (
    lead_id,
    etapa_anterior,
    etapa_nova,
    movido_por_id,
    movido_por_nome,
    observacao
  ) VALUES (
    p_lead_id,
    v_etapa_anterior,
    p_nova_etapa,
    v_user_id,
    v_user_nome,
    p_observacao
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Função RPC para apropriar lead
CREATE OR REPLACE FUNCTION apropriar_lead_marcenaria(
  p_lead_id UUID,
  p_consultor_id UUID
) RETURNS void AS $$
DECLARE
  v_consultor_nome TEXT;
BEGIN
  IF p_consultor_id IS NOT NULL THEN
    SELECT nome INTO v_consultor_nome FROM profiles WHERE id = p_consultor_id;
  END IF;
  
  UPDATE crm_marcenaria_leads
  SET 
    consultor_responsavel_id = p_consultor_id,
    consultor_nome = v_consultor_nome,
    updated_at = NOW()
  WHERE id = p_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RLS (Row Level Security)
ALTER TABLE motivos_perda_marcenaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_marcenaria_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_marcenaria_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_marcenaria_notas ENABLE ROW LEVEL SECURITY;

-- Policies para motivos_perda_marcenaria
CREATE POLICY "Todos podem ver motivos de perda ativos"
ON motivos_perda_marcenaria FOR SELECT
USING (ativo = TRUE);

CREATE POLICY "Admins podem gerenciar motivos de perda"
ON motivos_perda_marcenaria FOR ALL
USING (is_admin());

-- Policies para crm_marcenaria_leads
CREATE POLICY "Admins e gestores podem gerenciar todos os leads"
ON crm_marcenaria_leads FOR ALL
USING (is_admin_or_gestor());

CREATE POLICY "Customer Success podem ver todos os leads"
ON crm_marcenaria_leads FOR SELECT
USING (
  is_admin_or_gestor() 
  OR (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND tipo_usuario = 'customer_success'
      AND status = 'ativo'
    )
  )
);

CREATE POLICY "Customer Success podem atualizar leads"
ON crm_marcenaria_leads FOR UPDATE
USING (
  is_admin_or_gestor() 
  OR (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND tipo_usuario = 'customer_success'
      AND status = 'ativo'
    )
  )
);

CREATE POLICY "Consultores podem ver seus leads apropriados"
ON crm_marcenaria_leads FOR SELECT
USING (consultor_responsavel_id = auth.uid());

-- Policies para histórico
CREATE POLICY "Admins e CS podem ver histórico"
ON crm_marcenaria_historico FOR SELECT
USING (
  is_admin_or_gestor() 
  OR (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND tipo_usuario = 'customer_success'
      AND status = 'ativo'
    )
  )
);

CREATE POLICY "Sistema pode inserir histórico"
ON crm_marcenaria_historico FOR INSERT
WITH CHECK (TRUE);

-- Policies para notas
CREATE POLICY "Admins e CS podem ver notas"
ON crm_marcenaria_notas FOR SELECT
USING (
  is_admin_or_gestor() 
  OR (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND tipo_usuario = 'customer_success'
      AND status = 'ativo'
    )
  )
);

CREATE POLICY "Usuários autorizados podem criar notas"
ON crm_marcenaria_notas FOR INSERT
WITH CHECK (
  criado_por_id = auth.uid() 
  AND (
    is_admin_or_gestor() 
    OR (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND tipo_usuario = 'customer_success'
        AND status = 'ativo'
      )
    )
  )
);

CREATE POLICY "Criador pode editar suas notas"
ON crm_marcenaria_notas FOR UPDATE
USING (criado_por_id = auth.uid())
WITH CHECK (criado_por_id = auth.uid());

CREATE POLICY "Criador pode deletar suas notas"
ON crm_marcenaria_notas FOR DELETE
USING (criado_por_id = auth.uid());

-- 10. Trigger para updated_at
CREATE TRIGGER update_crm_marcenaria_leads_updated_at
  BEFORE UPDATE ON crm_marcenaria_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_marcenaria_notas_updated_at
  BEFORE UPDATE ON crm_marcenaria_notas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();