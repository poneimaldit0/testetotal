-- Create table for collaborative checklist management
CREATE TABLE public.checklist_colaborativo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'aguardando_primeiro_preenchimento',
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_primeiro_preenchimento TIMESTAMP WITH TIME ZONE,
  primeiro_contribuidor_id UUID,
  data_limite TIMESTAMP WITH TIME ZONE,
  data_consolidacao TIMESTAMP WITH TIME ZONE,
  total_fornecedores INTEGER NOT NULL DEFAULT 0,
  contribuicoes_recebidas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for individual checklist contributions
CREATE TABLE public.contribuicoes_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_colaborativo_id UUID NOT NULL,
  fornecedor_id UUID NOT NULL,
  item_id UUID NOT NULL,
  selecionado BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT,
  data_contribuicao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checklist_colaborativo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribuicoes_checklist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checklist_colaborativo
CREATE POLICY "Admins podem gerenciar checklist colaborativo"
ON public.checklist_colaborativo
FOR ALL
USING (is_admin());

CREATE POLICY "Fornecedores podem ver checklist colaborativo de orçamentos onde se candidataram"
ON public.checklist_colaborativo
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.candidaturas_fornecedores cf
    WHERE cf.orcamento_id = checklist_colaborativo.orcamento_id
    AND cf.fornecedor_id = auth.uid()
    AND cf.data_desistencia IS NULL
  )
);

-- RLS Policies for contribuicoes_checklist
CREATE POLICY "Admins podem gerenciar contribuições do checklist"
ON public.contribuicoes_checklist
FOR ALL
USING (is_admin());

CREATE POLICY "Fornecedores podem criar suas contribuições"
ON public.contribuicoes_checklist
FOR INSERT
WITH CHECK (fornecedor_id = auth.uid());

CREATE POLICY "Fornecedores podem editar suas contribuições"
ON public.contribuicoes_checklist
FOR UPDATE
USING (fornecedor_id = auth.uid());

CREATE POLICY "Fornecedores podem ver suas contribuições"
ON public.contribuicoes_checklist
FOR SELECT
USING (fornecedor_id = auth.uid());

-- Create trigger to update contribuicoes count
CREATE OR REPLACE FUNCTION public.update_contribuicoes_count()
RETURNS TRIGGER AS $$
DECLARE
  total_contribuicoes INTEGER;
BEGIN
  -- Contar contribuições únicas por fornecedor
  SELECT COUNT(DISTINCT fornecedor_id) INTO total_contribuicoes
  FROM public.contribuicoes_checklist cc
  WHERE cc.checklist_colaborativo_id = COALESCE(NEW.checklist_colaborativo_id, OLD.checklist_colaborativo_id);
  
  -- Atualizar contador
  UPDATE public.checklist_colaborativo
  SET contribuicoes_recebidas = total_contribuicoes,
      updated_at = now()
  WHERE id = COALESCE(NEW.checklist_colaborativo_id, OLD.checklist_colaborativo_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contribuicoes_count
  AFTER INSERT OR UPDATE OR DELETE ON public.contribuicoes_checklist
  FOR EACH ROW EXECUTE FUNCTION public.update_contribuicoes_count();

-- Function to activate timer when first contribution is made
CREATE OR REPLACE FUNCTION public.ativar_timer_colaborativo(p_colaborativo_id UUID, p_fornecedor_id UUID)
RETURNS JSONB AS $$
DECLARE
  colaborativo_record RECORD;
BEGIN
  -- Buscar dados do checklist colaborativo
  SELECT * INTO colaborativo_record
  FROM public.checklist_colaborativo
  WHERE id = p_colaborativo_id;
  
  IF colaborativo_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'colaborativo_nao_encontrado',
      'message', 'Checklist colaborativo não encontrado'
    );
  END IF;
  
  -- Se já foi ativado, retornar dados existentes
  IF colaborativo_record.data_primeiro_preenchimento IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'timer_ja_ativo', true,
      'data_limite', colaborativo_record.data_limite,
      'primeiro_contribuidor_id', colaborativo_record.primeiro_contribuidor_id
    );
  END IF;
  
  -- Ativar timer (24 horas a partir de agora)
  UPDATE public.checklist_colaborativo
  SET data_primeiro_preenchimento = now(),
      primeiro_contribuidor_id = p_fornecedor_id,
      data_limite = now() + INTERVAL '24 hours',
      status = 'fase_colaborativa_ativa',
      updated_at = now()
  WHERE id = p_colaborativo_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'timer_ativado', true,
    'data_limite', now() + INTERVAL '24 hours',
    'primeiro_contribuidor_id', p_fornecedor_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to consolidate checklist after collaborative phase
CREATE OR REPLACE FUNCTION public.consolidar_checklist_colaborativo(p_colaborativo_id UUID)
RETURNS JSONB AS $$
DECLARE
  colaborativo_record RECORD;
  orcamento_id_var UUID;
  item_record RECORD;
  total_consolidados INTEGER := 0;
BEGIN
  -- Buscar dados do checklist colaborativo
  SELECT * INTO colaborativo_record
  FROM public.checklist_colaborativo
  WHERE id = p_colaborativo_id;
  
  IF colaborativo_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'colaborativo_nao_encontrado'
    );
  END IF;
  
  orcamento_id_var := colaborativo_record.orcamento_id;
  
  -- Verificar se já foi consolidado
  IF colaborativo_record.status = 'consolidado' THEN
    RETURN jsonb_build_object(
      'success', true,
      'ja_consolidado', true
    );
  END IF;
  
  -- Limpar checklist existente do orçamento
  DELETE FROM public.orcamentos_checklist_itens
  WHERE orcamento_id = orcamento_id_var AND origem = 'colaborativo';
  
  -- Consolidar: união de todos os itens selecionados por qualquer fornecedor
  FOR item_record IN
    SELECT DISTINCT item_id
    FROM public.contribuicoes_checklist cc
    WHERE cc.checklist_colaborativo_id = p_colaborativo_id
    AND cc.selecionado = true
  LOOP
    INSERT INTO public.orcamentos_checklist_itens (
      orcamento_id,
      item_id,
      obrigatorio,
      origem
    ) VALUES (
      orcamento_id_var,
      item_record.item_id,
      false,
      'colaborativo'
    );
    
    total_consolidados := total_consolidados + 1;
  END LOOP;
  
  -- Atualizar status do checklist colaborativo
  UPDATE public.checklist_colaborativo
  SET status = 'consolidado',
      data_consolidacao = now(),
      updated_at = now()
  WHERE id = p_colaborativo_id;
  
  -- Liberar propostas em rascunho colaborativo
  UPDATE public.checklist_propostas
  SET status = 'enviado',
      data_envio = now(),
      updated_at = now()
  WHERE candidatura_id IN (
    SELECT cf.id FROM public.candidaturas_fornecedores cf
    WHERE cf.orcamento_id = orcamento_id_var
  ) AND status = 'rascunho_colaborativo';
  
  RETURN jsonb_build_object(
    'success', true,
    'itens_consolidados', total_consolidados,
    'propostas_liberadas', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add new status to checklist_propostas
ALTER TABLE public.checklist_propostas 
ALTER COLUMN status SET DEFAULT 'rascunho';

-- Update trigger for automatic updates
CREATE TRIGGER update_checklist_colaborativo_updated_at
  BEFORE UPDATE ON public.checklist_colaborativo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();