-- Adicionar campos para revisões na tabela checklist_propostas
ALTER TABLE public.checklist_propostas 
ADD COLUMN IF NOT EXISTS data_envio timestamp with time zone,
ADD COLUMN IF NOT EXISTS versao integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS comentarios_revisao text,
ADD COLUMN IF NOT EXISTS data_ultima_revisao timestamp with time zone;

-- Criar tabela para histórico de revisões
CREATE TABLE IF NOT EXISTS public.revisoes_propostas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_proposta_id uuid NOT NULL REFERENCES public.checklist_propostas(id) ON DELETE CASCADE,
  versao_anterior integer NOT NULL,
  versao_nova integer NOT NULL,
  comentarios text,
  solicitado_por uuid,
  data_solicitacao timestamp with time zone NOT NULL DEFAULT now(),
  data_conclusao timestamp with time zone,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida', 'cancelada'))
);

-- Habilitar RLS na tabela de revisões
ALTER TABLE public.revisoes_propostas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para revisões
CREATE POLICY "Admins podem gerenciar revisões" ON public.revisoes_propostas
FOR ALL USING (is_admin());

CREATE POLICY "Fornecedores podem ver suas revisões" ON public.revisoes_propostas
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.checklist_propostas cp
    JOIN public.candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
    WHERE cp.id = revisoes_propostas.checklist_proposta_id 
    AND cf.fornecedor_id = auth.uid()
  )
);

-- Função para registrar envio de proposta
CREATE OR REPLACE FUNCTION public.enviar_proposta(p_checklist_proposta_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  proposta_record RECORD;
  candidatura_record RECORD;
BEGIN
  -- Verificar se a proposta existe e pertence ao fornecedor
  SELECT cp.*, cf.fornecedor_id INTO proposta_record
  FROM public.checklist_propostas cp
  JOIN public.candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
  WHERE cp.id = p_checklist_proposta_id;
  
  IF proposta_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Proposta não encontrada'
    );
  END IF;
  
  -- Verificar se é o dono da proposta
  IF proposta_record.fornecedor_id != auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Você não tem permissão para enviar esta proposta'
    );
  END IF;
  
  -- Verificar se não está já finalizada
  IF proposta_record.status IN ('finalizada', 'aceita', 'rejeitada') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_sent',
      'message', 'Esta proposta já foi enviada'
    );
  END IF;
  
  -- Verificar se tem itens incluídos
  IF NOT EXISTS (
    SELECT 1 FROM public.respostas_checklist 
    WHERE checklist_proposta_id = p_checklist_proposta_id 
    AND incluido = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_items',
      'message', 'Adicione ao menos um item à proposta antes de enviar'
    );
  END IF;
  
  -- Atualizar status para finalizada
  UPDATE public.checklist_propostas
  SET 
    status = 'finalizada',
    data_envio = now(),
    updated_at = now()
  WHERE id = p_checklist_proposta_id;
  
  -- Registrar log
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (auth.uid(), 'envio_proposta: ' || p_checklist_proposta_id::text);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Proposta enviada com sucesso!'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Erro interno: ' || SQLERRM
    );
END;
$$;

-- Função para solicitar revisão de proposta
CREATE OR REPLACE FUNCTION public.solicitar_revisao_proposta(p_checklist_proposta_id uuid, p_comentarios text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  proposta_record RECORD;
BEGIN
  -- Verificar se é admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Apenas administradores podem solicitar revisões'
    );
  END IF;
  
  -- Buscar proposta
  SELECT * INTO proposta_record
  FROM public.checklist_propostas
  WHERE id = p_checklist_proposta_id;
  
  IF proposta_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Proposta não encontrada'
    );
  END IF;
  
  -- Verificar se está finalizada
  IF proposta_record.status != 'finalizada' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_status',
      'message', 'Só é possível solicitar revisão de propostas finalizadas'
    );
  END IF;
  
  -- Atualizar proposta para em revisão
  UPDATE public.checklist_propostas
  SET 
    status = 'em_revisao',
    comentarios_revisao = p_comentarios,
    data_ultima_revisao = now(),
    updated_at = now()
  WHERE id = p_checklist_proposta_id;
  
  -- Registrar revisão
  INSERT INTO public.revisoes_propostas (
    checklist_proposta_id,
    versao_anterior,
    versao_nova,
    comentarios,
    solicitado_por
  ) VALUES (
    p_checklist_proposta_id,
    proposta_record.versao,
    proposta_record.versao + 1,
    p_comentarios,
    auth.uid()
  );
  
  -- Registrar log
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (auth.uid(), 'solicitar_revisao: ' || p_checklist_proposta_id::text);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Revisão solicitada com sucesso!'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Erro interno: ' || SQLERRM
    );
END;
$$;