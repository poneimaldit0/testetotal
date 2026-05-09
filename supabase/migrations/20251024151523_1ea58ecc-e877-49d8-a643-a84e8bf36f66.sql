-- Corrigir função obter_proximo_gestor_fila
-- Adicionar WHERE clause no UPDATE para resolver erro de segurança

CREATE OR REPLACE FUNCTION obter_proximo_gestor_fila()
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
  FROM profiles
  WHERE tipo_usuario = 'gestor_conta' 
    AND status = 'ativo';
  
  -- Se não há gestores, retornar null
  IF v_gestores IS NULL OR array_length(v_gestores, 1) = 0 THEN
    RETURN NULL;
  END IF;
  
  v_total_gestores := array_length(v_gestores, 1);
  
  -- Buscar último gestor usado
  SELECT ultimo_gestor_id INTO v_ultimo_gestor_id
  FROM gestor_fila_controle
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
  
  -- CORREÇÃO: Adicionar WHERE clause no UPDATE
  UPDATE gestor_fila_controle
  SET ultimo_gestor_id = v_proximo_gestor_id,
      updated_at = now()
  WHERE id = (SELECT id FROM gestor_fila_controle LIMIT 1);
  
  RETURN v_proximo_gestor_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário explicativo
COMMENT ON FUNCTION obter_proximo_gestor_fila() IS 
'Retorna o próximo gestor de conta da fila circular (ordem alfabética). Atualiza automaticamente o controle da fila.';