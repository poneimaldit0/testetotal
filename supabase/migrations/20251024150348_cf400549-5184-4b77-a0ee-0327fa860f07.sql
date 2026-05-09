
-- Criar tabela de controle da fila circular de gestores
CREATE TABLE IF NOT EXISTS public.gestor_fila_controle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ultimo_gestor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir registro inicial
INSERT INTO public.gestor_fila_controle (ultimo_gestor_id) 
VALUES (NULL)
ON CONFLICT DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.gestor_fila_controle ENABLE ROW LEVEL SECURITY;

-- Política: apenas admins e gestores podem acessar
CREATE POLICY "Admins e gestores podem acessar fila" 
  ON public.gestor_fila_controle
  FOR ALL 
  USING (public.can_manage_orcamentos());

-- Criar função para obter próximo gestor na fila circular
CREATE OR REPLACE FUNCTION public.obter_proximo_gestor_fila()
RETURNS UUID AS $$
DECLARE
  v_gestores UUID[];
  v_ultimo_gestor_id UUID;
  v_posicao_atual INT;
  v_proximo_gestor_id UUID;
  v_total_gestores INT;
BEGIN
  -- Buscar todos os gestores ativos em ordem alfabética
  SELECT ARRAY_AGG(id ORDER BY nome) INTO v_gestores
  FROM public.profiles
  WHERE tipo_usuario = 'gestor_conta' 
    AND status = 'ativo';
  
  -- Se não há gestores, retornar null
  IF v_gestores IS NULL OR array_length(v_gestores, 1) = 0 THEN
    RETURN NULL;
  END IF;
  
  v_total_gestores := array_length(v_gestores, 1);
  
  -- Buscar último gestor usado
  SELECT ultimo_gestor_id INTO v_ultimo_gestor_id
  FROM public.gestor_fila_controle
  LIMIT 1;
  
  -- Se nunca foi usado ou último gestor não existe mais, começar do início
  IF v_ultimo_gestor_id IS NULL OR NOT (v_ultimo_gestor_id = ANY(v_gestores)) THEN
    v_proximo_gestor_id := v_gestores[1];
  ELSE
    -- Encontrar posição do último gestor
    SELECT idx INTO v_posicao_atual
    FROM unnest(v_gestores) WITH ORDINALITY AS t(id, idx)
    WHERE id = v_ultimo_gestor_id;
    
    -- Calcular próxima posição (circular)
    IF v_posicao_atual >= v_total_gestores THEN
      v_proximo_gestor_id := v_gestores[1]; -- Volta ao início
    ELSE
      v_proximo_gestor_id := v_gestores[v_posicao_atual + 1]; -- Próximo
    END IF;
  END IF;
  
  -- Atualizar controle com o próximo gestor
  UPDATE public.gestor_fila_controle
  SET ultimo_gestor_id = v_proximo_gestor_id,
      updated_at = now();
  
  RETURN v_proximo_gestor_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant para usuários autenticados
GRANT EXECUTE ON FUNCTION public.obter_proximo_gestor_fila() TO authenticated;

-- Comentários para documentação
COMMENT ON TABLE public.gestor_fila_controle IS 'Controla a fila circular de distribuição de orçamentos entre gestores';
COMMENT ON FUNCTION public.obter_proximo_gestor_fila() IS 'Retorna o próximo gestor na fila circular, em ordem alfabética';
