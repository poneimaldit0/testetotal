-- =====================================================
-- GATILHOS AUTOMÁTICOS CRM COM NOTIFICAÇÕES
-- =====================================================

-- 1. Atualizar constraint de tipos de notificação para incluir tipos CRM
ALTER TABLE public.notificacoes_sistema 
DROP CONSTRAINT IF EXISTS notificacoes_sistema_tipo_check;

ALTER TABLE public.notificacoes_sistema 
ADD CONSTRAINT notificacoes_sistema_tipo_check 
CHECK (tipo IN (
  'proposta_aceita', 'revisao_solicitada', 'revisao_concluida', 
  'contrato_enviado', 'medicao_solicitada', 'cronograma_atualizado',
  'cronograma_aprovado',
  'crm_movimentacao_automatica',
  'crm_atividade_orcamento_arquivado'
));

-- 2. Criar tabela de mapeamento Status Fornecedor → Etapa CRM
CREATE TABLE IF NOT EXISTS public.mapeamento_status_etapa_crm (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status_fornecedor TEXT NOT NULL UNIQUE,
  etapa_crm_destino TEXT NOT NULL,
  ordem_prioridade INTEGER NOT NULL,
  ativo BOOLEAN DEFAULT true,
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir mapeamentos padrão
INSERT INTO mapeamento_status_etapa_crm (status_fornecedor, etapa_crm_destino, ordem_prioridade, descricao) VALUES
  ('1_contato_realizado', 'contato_agendamento', 1, 'Primeiro contato com cliente'),
  ('2_contato_realizado', 'contato_agendamento', 2, 'Segundo contato'),
  ('3_contato_realizado', 'contato_agendamento', 3, 'Terceiro contato'),
  ('4_contato_realizado', 'contato_agendamento', 4, 'Quarto contato'),
  ('5_contato_realizado', 'contato_agendamento', 5, 'Quinto contato'),
  ('cliente_respondeu_nao_agendou', 'contato_agendamento', 6, 'Cliente respondeu mas não agendou'),
  ('visita_agendada', 'contato_agendamento', 7, 'Visita agendada com cliente'),
  ('visita_realizada', 'em_orcamento', 8, 'Visita já foi realizada'),
  ('orcamento_enviado', 'propostas_enviadas', 9, 'Orçamento foi enviado ao cliente'),
  ('negocio_fechado', 'fechamento_contrato', 10, 'Negócio fechado com sucesso')
ON CONFLICT (status_fornecedor) DO NOTHING;

-- 3. Adicionar campo tipo_movimentacao no histórico CRM
ALTER TABLE public.orcamentos_crm_historico 
ADD COLUMN IF NOT EXISTS tipo_movimentacao TEXT DEFAULT 'manual';

-- Atualizar valores existentes
UPDATE public.orcamentos_crm_historico 
SET tipo_movimentacao = 'manual' 
WHERE tipo_movimentacao IS NULL;

-- Adicionar constraint
ALTER TABLE public.orcamentos_crm_historico 
DROP CONSTRAINT IF EXISTS orcamentos_crm_historico_tipo_check;

ALTER TABLE public.orcamentos_crm_historico 
ADD CONSTRAINT orcamentos_crm_historico_tipo_check 
CHECK (tipo_movimentacao IN ('manual', 'automatica'));

-- 4. Criar função de movimentação automática com notificações
CREATE OR REPLACE FUNCTION public.atualizar_etapa_crm_automatico()
RETURNS TRIGGER AS $$
DECLARE
  v_orcamento_id UUID;
  v_etapa_atual TEXT;
  v_etapa_destino TEXT;
  v_ordem_atual INTEGER;
  v_ordem_destino INTEGER;
  v_max_ordem_fornecedores INTEGER;
  v_concierge_id UUID;
  v_fornecedor_nome TEXT;
  v_codigo_orcamento TEXT;
  v_etapa_titulo_atual TEXT;
  v_etapa_titulo_nova TEXT;
BEGIN
  -- Só processa se houve mudança de status
  IF OLD.status_acompanhamento IS NOT DISTINCT FROM NEW.status_acompanhamento THEN
    RETURN NEW;
  END IF;
  
  v_orcamento_id := NEW.orcamento_id;
  
  -- Buscar dados do tracking CRM
  SELECT t.etapa_crm, t.concierge_responsavel_id, o.codigo
  INTO v_etapa_atual, v_concierge_id, v_codigo_orcamento
  FROM orcamentos_crm_tracking t
  JOIN orcamentos o ON o.id = t.orcamento_id
  WHERE t.orcamento_id = v_orcamento_id;
  
  -- Se não existe tracking, não faz nada
  IF v_etapa_atual IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar nome do fornecedor
  SELECT COALESCE(p.nome_empresa, p.nome) INTO v_fornecedor_nome
  FROM profiles p WHERE p.id = NEW.fornecedor_id;
  
  -- *** CASO 1: ORÇAMENTO ARQUIVADO - Notificação Especial ***
  IF v_etapa_atual IN ('ganho', 'perdido') THEN
    IF v_concierge_id IS NOT NULL THEN
      INSERT INTO notificacoes_sistema (
        usuario_id, tipo, titulo, mensagem,
        referencia_id, tipo_referencia, dados_extras
      ) VALUES (
        v_concierge_id,
        'crm_atividade_orcamento_arquivado',
        '⚠️ Atividade em Orçamento ' || INITCAP(v_etapa_atual),
        'Atenção: O fornecedor "' || COALESCE(v_fornecedor_nome, 'Desconhecido') || 
        '" atualizou seu status para "' || NEW.status_acompanhamento || 
        '" no orçamento #' || COALESCE(v_codigo_orcamento, 'N/A') || 
        ' que já está marcado como ' || UPPER(v_etapa_atual) || '. Verifique se é necessária alguma ação.',
        v_orcamento_id, 'orcamento_crm',
        jsonb_build_object(
          'etapa_atual', v_etapa_atual,
          'novo_status_fornecedor', NEW.status_acompanhamento,
          'fornecedor_id', NEW.fornecedor_id,
          'fornecedor_nome', v_fornecedor_nome,
          'codigo_orcamento', v_codigo_orcamento,
          'urgente', true
        )
      );
    END IF;
    
    -- Registrar no histórico como bloqueado (sem movido_por pois é automático)
    INSERT INTO orcamentos_crm_historico (
      orcamento_id, etapa_anterior, etapa_nova, 
      movido_por_id, movido_por_nome,
      tipo_movimentacao, observacao
    ) VALUES (
      v_orcamento_id, v_etapa_atual::etapa_crm_enum, v_etapa_atual::etapa_crm_enum,
      NEW.fornecedor_id, COALESCE(v_fornecedor_nome, 'Sistema'),
      'automatica',
      'Movimentação bloqueada (arquivado). Fornecedor ' || 
      COALESCE(v_fornecedor_nome, 'Desconhecido') || ' → ' || NEW.status_acompanhamento
    );
    
    RETURN NEW;
  END IF;
  
  -- *** CASO 2: ORÇAMENTO ATIVO - Verificar movimentação ***
  
  -- Buscar maior ordem entre todos fornecedores do orçamento
  SELECT MAX(m.ordem_prioridade) INTO v_max_ordem_fornecedores
  FROM candidaturas_fornecedores cf
  JOIN mapeamento_status_etapa_crm m 
    ON m.status_fornecedor = cf.status_acompanhamento AND m.ativo = true
  WHERE cf.orcamento_id = v_orcamento_id;
  
  IF v_max_ordem_fornecedores IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar etapa destino
  SELECT etapa_crm_destino INTO v_etapa_destino
  FROM mapeamento_status_etapa_crm
  WHERE ordem_prioridade = v_max_ordem_fornecedores AND ativo = true
  LIMIT 1;
  
  -- Buscar ordens para comparação usando crm_etapas_config
  SELECT ordem INTO v_ordem_atual FROM crm_etapas_config WHERE valor = v_etapa_atual AND ativo = true;
  SELECT ordem INTO v_ordem_destino FROM crm_etapas_config WHERE valor = v_etapa_destino AND ativo = true;
  
  -- Só move se destino é MAIOR que atual
  IF v_ordem_destino IS NOT NULL AND v_ordem_atual IS NOT NULL 
     AND v_ordem_destino > v_ordem_atual THEN
    
    -- Buscar títulos para notificação
    SELECT titulo INTO v_etapa_titulo_atual FROM crm_etapas_config WHERE valor = v_etapa_atual;
    SELECT titulo INTO v_etapa_titulo_nova FROM crm_etapas_config WHERE valor = v_etapa_destino;
    
    -- Atualizar tracking
    UPDATE orcamentos_crm_tracking
    SET 
      etapa_crm = v_etapa_destino::etapa_crm_enum,
      data_entrada_etapa = NOW(),
      data_entrada_etapa_atual = NOW(),
      updated_at = NOW()
    WHERE orcamento_id = v_orcamento_id;
    
    -- Registrar no histórico
    INSERT INTO orcamentos_crm_historico (
      orcamento_id, etapa_anterior, etapa_nova, 
      movido_por_id, movido_por_nome,
      tipo_movimentacao, observacao
    ) VALUES (
      v_orcamento_id, v_etapa_atual::etapa_crm_enum, v_etapa_destino::etapa_crm_enum,
      NEW.fornecedor_id, COALESCE(v_fornecedor_nome, 'Sistema'),
      'automatica',
      'Automático: ' || COALESCE(v_fornecedor_nome, 'Fornecedor') || ' → ' || NEW.status_acompanhamento
    );
    
    -- *** NOTIFICAÇÃO PADRÃO: Movimentação realizada ***
    IF v_concierge_id IS NOT NULL THEN
      INSERT INTO notificacoes_sistema (
        usuario_id, tipo, titulo, mensagem,
        referencia_id, tipo_referencia, dados_extras
      ) VALUES (
        v_concierge_id,
        'crm_movimentacao_automatica',
        '🔄 Card Movido: #' || COALESCE(v_codigo_orcamento, 'N/A'),
        'O orçamento #' || COALESCE(v_codigo_orcamento, 'N/A') || 
        ' foi movido automaticamente de "' || COALESCE(v_etapa_titulo_atual, v_etapa_atual) ||
        '" para "' || COALESCE(v_etapa_titulo_nova, v_etapa_destino) || 
        '" porque ' || COALESCE(v_fornecedor_nome, 'um fornecedor') || 
        ' atualizou status para "' || NEW.status_acompanhamento || '".',
        v_orcamento_id, 'orcamento_crm',
        jsonb_build_object(
          'etapa_anterior', v_etapa_atual,
          'etapa_nova', v_etapa_destino,
          'fornecedor_id', NEW.fornecedor_id,
          'fornecedor_nome', v_fornecedor_nome,
          'status_fornecedor', NEW.status_acompanhamento,
          'codigo_orcamento', v_codigo_orcamento
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar trigger na tabela de candidaturas
DROP TRIGGER IF EXISTS trg_atualizar_etapa_crm_automatico ON candidaturas_fornecedores;

CREATE TRIGGER trg_atualizar_etapa_crm_automatico
  AFTER UPDATE OF status_acompanhamento
  ON candidaturas_fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_etapa_crm_automatico();

-- 6. Habilitar RLS na nova tabela
ALTER TABLE public.mapeamento_status_etapa_crm ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados podem ver mapeamento" 
  ON mapeamento_status_etapa_crm FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem gerenciar mapeamento" 
  ON mapeamento_status_etapa_crm FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND tipo_usuario IN ('admin', 'master')
    )
  );