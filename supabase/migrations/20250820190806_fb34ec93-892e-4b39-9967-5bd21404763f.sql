-- Criar tabela de penalidades para fornecedores
CREATE TABLE public.penalidades_fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  desistencia_id UUID REFERENCES public.desistencias_propostas(id) ON DELETE SET NULL,
  tipo_penalidade TEXT NOT NULL CHECK (tipo_penalidade IN ('bloqueio_temporario', 'reducao_propostas', 'impacto_avaliacao', 'suspensao_completa')),
  duracao_dias INTEGER NOT NULL DEFAULT 7,
  data_aplicacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_expiracao TIMESTAMP WITH TIME ZONE NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  limite_original INTEGER NULL, -- Para salvar limite original em caso de redução
  observacoes TEXT,
  aplicada_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar campos de controle de penalidade no profiles
ALTER TABLE public.profiles 
ADD COLUMN bloqueado_ate TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN penalidades_ativas INTEGER DEFAULT 0;

-- Índices para performance
CREATE INDEX idx_penalidades_fornecedor_id ON public.penalidades_fornecedores(fornecedor_id);
CREATE INDEX idx_penalidades_ativo ON public.penalidades_fornecedores(ativo) WHERE ativo = true;
CREATE INDEX idx_penalidades_expiracao ON public.penalidades_fornecedores(data_expiracao) WHERE ativo = true;

-- Enable RLS
ALTER TABLE public.penalidades_fornecedores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins podem gerenciar todas as penalidades"
ON public.penalidades_fornecedores
FOR ALL
USING (is_admin());

CREATE POLICY "Fornecedores podem ver suas penalidades"
ON public.penalidades_fornecedores
FOR SELECT
USING (fornecedor_id = auth.uid());

-- Função para verificar penalidades ativas de um fornecedor
CREATE OR REPLACE FUNCTION public.verificar_penalidades_ativas(p_fornecedor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  penalidades_record RECORD;
  resultado JSONB := '{"tem_penalidades": false, "tipos": [], "detalhes": []}'::JSONB;
  tipos_array TEXT[] := '{}';
  detalhes_array JSONB[] := '{}';
BEGIN
  -- Buscar penalidades ativas não expiradas
  FOR penalidades_record IN 
    SELECT 
      tipo_penalidade,
      data_expiracao,
      observacoes,
      duracao_dias
    FROM public.penalidades_fornecedores
    WHERE fornecedor_id = p_fornecedor_id
      AND ativo = true
      AND data_expiracao > now()
    ORDER BY data_aplicacao DESC
  LOOP
    tipos_array := array_append(tipos_array, penalidades_record.tipo_penalidade);
    detalhes_array := array_append(detalhes_array, jsonb_build_object(
      'tipo', penalidades_record.tipo_penalidade,
      'expira_em', penalidades_record.data_expiracao,
      'observacoes', penalidades_record.observacoes,
      'duracao_dias', penalidades_record.duracao_dias
    ));
  END LOOP;
  
  IF array_length(tipos_array, 1) > 0 THEN
    resultado := jsonb_build_object(
      'tem_penalidades', true,
      'tipos', tipos_array,
      'detalhes', detalhes_array
    );
  END IF;
  
  RETURN resultado;
END;
$function$;

-- Função para aplicar penalidade
CREATE OR REPLACE FUNCTION public.aplicar_penalidade_fornecedor(
  p_fornecedor_id UUID,
  p_desistencia_id UUID,
  p_tipo_penalidade TEXT,
  p_duracao_dias INTEGER,
  p_observacoes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  fornecedor_record RECORD;
  penalidade_id UUID;
  data_expiracao TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Verificar se é admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Apenas administradores podem aplicar penalidades'
    );
  END IF;
  
  -- Buscar dados do fornecedor
  SELECT * INTO fornecedor_record
  FROM public.profiles
  WHERE id = p_fornecedor_id;
  
  IF fornecedor_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Fornecedor não encontrado'
    );
  END IF;
  
  -- Calcular data de expiração
  data_expiracao := now() + (p_duracao_dias || ' days')::INTERVAL;
  
  -- Inserir penalidade
  INSERT INTO public.penalidades_fornecedores (
    fornecedor_id,
    desistencia_id,
    tipo_penalidade,
    duracao_dias,
    data_expiracao,
    observacoes,
    aplicada_por,
    limite_original
  ) VALUES (
    p_fornecedor_id,
    p_desistencia_id,
    p_tipo_penalidade,
    p_duracao_dias,
    data_expiracao,
    p_observacoes,
    auth.uid(),
    CASE WHEN p_tipo_penalidade = 'reducao_propostas' 
         THEN fornecedor_record.limite_propostas_abertas 
         ELSE NULL END
  ) RETURNING id INTO penalidade_id;
  
  -- Aplicar penalidade no perfil conforme o tipo
  CASE p_tipo_penalidade
    WHEN 'bloqueio_temporario' THEN
      UPDATE public.profiles
      SET bloqueado_ate = data_expiracao,
          penalidades_ativas = penalidades_ativas + 1
      WHERE id = p_fornecedor_id;
      
    WHEN 'reducao_propostas' THEN
      UPDATE public.profiles
      SET limite_propostas_abertas = GREATEST(1, COALESCE(limite_propostas_abertas, 5) - 2),
          penalidades_ativas = penalidades_ativas + 1
      WHERE id = p_fornecedor_id;
      
    WHEN 'suspensao_completa' THEN
      UPDATE public.profiles
      SET status = 'suspenso',
          bloqueado_ate = data_expiracao,
          penalidades_ativas = penalidades_ativas + 1
      WHERE id = p_fornecedor_id;
      
    WHEN 'impacto_avaliacao' THEN
      UPDATE public.profiles
      SET penalidades_ativas = penalidades_ativas + 1
      WHERE id = p_fornecedor_id;
  END CASE;
  
  -- Log da aplicação
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (
    auth.uid(),
    'aplicar_penalidade: ' || p_tipo_penalidade || ' para ' || fornecedor_record.email || ' por ' || p_duracao_dias || ' dias'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'penalidade_id', penalidade_id,
    'message', 'Penalidade aplicada com sucesso',
    'expira_em', data_expiracao
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Erro interno: ' || SQLERRM
    );
END;
$function$;

-- Função para remover penalidades expiradas (para automação)
CREATE OR REPLACE FUNCTION public.remover_penalidades_expiradas()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  penalidades_removidas INTEGER := 0;
  fornecedor_record RECORD;
BEGIN
  -- Para cada penalidade expirada, reverter alterações no perfil
  FOR fornecedor_record IN
    SELECT DISTINCT 
      pf.fornecedor_id, 
      pf.tipo_penalidade,
      pf.limite_original,
      p.status
    FROM public.penalidades_fornecedores pf
    JOIN public.profiles p ON p.id = pf.fornecedor_id
    WHERE pf.ativo = true
      AND pf.data_expiracao <= now()
  LOOP
    -- Reverter alterações específicas por tipo
    CASE fornecedor_record.tipo_penalidade
      WHEN 'bloqueio_temporario' THEN
        UPDATE public.profiles
        SET bloqueado_ate = NULL
        WHERE id = fornecedor_record.fornecedor_id;
        
      WHEN 'reducao_propostas' THEN
        UPDATE public.profiles
        SET limite_propostas_abertas = COALESCE(fornecedor_record.limite_original, 5)
        WHERE id = fornecedor_record.fornecedor_id;
        
      WHEN 'suspensao_completa' THEN
        UPDATE public.profiles
        SET status = 'ativo',
            bloqueado_ate = NULL
        WHERE id = fornecedor_record.fornecedor_id;
    END CASE;
    
    -- Decrementar contador de penalidades ativas
    UPDATE public.profiles
    SET penalidades_ativas = GREATEST(0, penalidades_ativas - 1)
    WHERE id = fornecedor_record.fornecedor_id;
  END LOOP;
  
  -- Marcar penalidades como inativas
  UPDATE public.penalidades_fornecedores
  SET ativo = false,
      updated_at = now()
  WHERE ativo = true
    AND data_expiracao <= now();
    
  GET DIAGNOSTICS penalidades_removidas = ROW_COUNT;
  
  -- Log da limpeza
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (NULL, 'limpeza_penalidades_expiradas: ' || penalidades_removidas || ' removidas');
  
  RETURN jsonb_build_object(
    'success', true,
    'penalidades_removidas', penalidades_removidas,
    'message', 'Limpeza de penalidades concluída'
  );
END;
$function$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_penalidades_fornecedores_updated_at
BEFORE UPDATE ON public.penalidades_fornecedores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();