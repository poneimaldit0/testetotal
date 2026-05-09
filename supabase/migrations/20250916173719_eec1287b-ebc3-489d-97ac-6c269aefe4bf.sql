-- Criar tabela de notificações do sistema
CREATE TABLE public.notificacoes_sistema (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('proposta_aceita', 'revisao_solicitada', 'revisao_concluida', 'contrato_enviado', 'medicao_solicitada', 'cronograma_atualizado')),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  referencia_id UUID, -- ID da proposta/candidatura/contrato relacionado
  tipo_referencia TEXT, -- 'candidatura', 'proposta', 'contrato', etc.
  dados_extras JSONB, -- dados adicionais específicos do tipo
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notificacoes_sistema ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para notificações
CREATE POLICY "Usuários podem ver suas notificações" 
ON public.notificacoes_sistema 
FOR SELECT 
USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem marcar suas notificações como lidas" 
ON public.notificacoes_sistema 
FOR UPDATE 
USING (usuario_id = auth.uid());

CREATE POLICY "Admins podem gerenciar todas as notificações" 
ON public.notificacoes_sistema 
FOR ALL 
USING (is_admin());

-- Função para criar notificação automaticamente
CREATE OR REPLACE FUNCTION public.criar_notificacao(
  p_usuario_id UUID,
  p_tipo TEXT,
  p_titulo TEXT,
  p_mensagem TEXT,
  p_referencia_id UUID DEFAULT NULL,
  p_tipo_referencia TEXT DEFAULT NULL,
  p_dados_extras JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notificacao_id UUID;
BEGIN
  INSERT INTO public.notificacoes_sistema (
    usuario_id,
    tipo,
    titulo,
    mensagem,
    referencia_id,
    tipo_referencia,
    dados_extras
  ) VALUES (
    p_usuario_id,
    p_tipo,
    p_titulo,
    p_mensagem,
    p_referencia_id,
    p_tipo_referencia,
    p_dados_extras
  ) RETURNING id INTO notificacao_id;
  
  RETURN notificacao_id;
END;
$$;

-- Trigger para notificar fornecedor quando proposta é aceita
CREATE OR REPLACE FUNCTION public.notificar_proposta_aceita()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fornecedor_record RECORD;
  orcamento_record RECORD;
BEGIN
  -- Só executar se o status mudou para aceita/finalizada
  IF OLD.status != 'aceita' AND NEW.status = 'aceita' THEN
    
    -- Buscar dados do fornecedor e orçamento
    SELECT cf.fornecedor_id, cf.id as candidatura_id, p.nome, p.email
    INTO fornecedor_record
    FROM candidaturas_fornecedores cf
    JOIN profiles p ON p.id = cf.fornecedor_id
    WHERE cf.id = NEW.candidatura_id;
    
    SELECT o.necessidade, o.local
    INTO orcamento_record
    FROM candidaturas_fornecedores cf
    JOIN orcamentos o ON o.id = cf.orcamento_id
    WHERE cf.id = NEW.candidatura_id;
    
    -- Criar notificação para o fornecedor
    PERFORM public.criar_notificacao(
      fornecedor_record.fornecedor_id,
      'proposta_aceita',
      'Proposta Aceita! 🎉',
      'Parabéns! Sua proposta para "' || orcamento_record.necessidade || '" em ' || orcamento_record.local || ' foi aceita pelo cliente.',
      NEW.candidatura_id,
      'candidatura',
      jsonb_build_object('orcamento_id', (SELECT orcamento_id FROM candidaturas_fornecedores WHERE id = NEW.candidatura_id))
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para propostas aceitas
DROP TRIGGER IF EXISTS trigger_notificar_proposta_aceita ON public.checklist_propostas;
CREATE TRIGGER trigger_notificar_proposta_aceita
  AFTER UPDATE ON public.checklist_propostas
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_proposta_aceita();

-- Trigger para notificar fornecedor quando revisão é solicitada
CREATE OR REPLACE FUNCTION public.notificar_revisao_solicitada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fornecedor_record RECORD;
  proposta_record RECORD;
BEGIN
  -- Buscar dados do fornecedor e proposta
  SELECT 
    cf.fornecedor_id, 
    p.nome, 
    p.email,
    o.necessidade,
    o.local
  INTO fornecedor_record
  FROM revisoes_propostas_clientes rpc
  JOIN checklist_propostas cp ON cp.id = rpc.checklist_proposta_id
  JOIN candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
  JOIN profiles p ON p.id = cf.fornecedor_id
  JOIN orcamentos o ON o.id = cf.orcamento_id
  WHERE rpc.id = NEW.id;
  
  -- Criar notificação para o fornecedor
  PERFORM public.criar_notificacao(
    fornecedor_record.fornecedor_id,
    'revisao_solicitada',
    'Revisão Solicitada',
    'O cliente solicitou uma revisão na sua proposta para "' || fornecedor_record.necessidade || '" em ' || fornecedor_record.local || '. Motivo: ' || NEW.motivo_revisao,
    NEW.checklist_proposta_id,
    'proposta',
    jsonb_build_object(
      'motivo_revisao', NEW.motivo_revisao,
      'cliente_email', NEW.cliente_temp_email
    )
  );
  
  RETURN NEW;
END;
$$;

-- Criar trigger para revisões solicitadas
DROP TRIGGER IF EXISTS trigger_notificar_revisao_solicitada ON public.revisoes_propostas_clientes;
CREATE TRIGGER trigger_notificar_revisao_solicitada
  AFTER INSERT ON public.revisoes_propostas_clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_revisao_solicitada();