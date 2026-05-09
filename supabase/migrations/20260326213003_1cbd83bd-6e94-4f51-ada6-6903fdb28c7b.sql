
-- 1. Create horarios_visita_orcamento table
CREATE TABLE public.horarios_visita_orcamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  data_hora timestamptz NOT NULL,
  fornecedor_id uuid REFERENCES public.profiles(id),
  candidatura_id uuid REFERENCES public.candidaturas_fornecedores(id),
  reservado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. RLS
ALTER TABLE public.horarios_visita_orcamento ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user can see horarios
CREATE POLICY "Authenticated users can view horarios" 
  ON public.horarios_visita_orcamento FOR SELECT 
  TO authenticated USING (true);

-- INSERT: admins/masters/gestores/sdrs can create horarios
CREATE POLICY "Managers can insert horarios" 
  ON public.horarios_visita_orcamento FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND tipo_usuario IN ('master', 'admin', 'gestor_conta', 'sdr')
    )
  );

-- UPDATE: fornecedor can reserve an available slot (fornecedor_id IS NULL)
CREATE POLICY "Fornecedor can reserve available horario" 
  ON public.horarios_visita_orcamento FOR UPDATE 
  TO authenticated 
  USING (true)
  WITH CHECK (
    fornecedor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND tipo_usuario IN ('master', 'admin', 'gestor_conta', 'sdr')
    )
  );

-- DELETE: managers can delete horarios
CREATE POLICY "Managers can delete horarios" 
  ON public.horarios_visita_orcamento FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND tipo_usuario IN ('master', 'admin', 'gestor_conta', 'sdr')
    )
  );

-- 3. Update RPC to support horario_visita_id
CREATE OR REPLACE FUNCTION public.processar_candidatura_fornecedor(
  p_orcamento_id uuid, 
  p_nome text, 
  p_email text, 
  p_telefone text, 
  p_empresa text,
  p_horario_visita_id uuid DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_candidaturas_hoje integer;
  v_candidaturas_mes integer;
  v_limite_diario integer;
  v_limite_mensal integer;
  v_fornecedor_id uuid;
  v_inscricao_exists boolean;
  v_horario_disponivel boolean;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Usuário não autenticado'
    );
  END IF;

  -- Se horário foi informado, verificar disponibilidade
  IF p_horario_visita_id IS NOT NULL THEN
    SELECT (fornecedor_id IS NULL) INTO v_horario_disponivel
    FROM horarios_visita_orcamento
    WHERE id = p_horario_visita_id AND orcamento_id = p_orcamento_id
    FOR UPDATE; -- lock the row
    
    IF v_horario_disponivel IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'horario_indisponivel',
        'message', 'Horário de visita não encontrado'
      );
    END IF;
    
    IF NOT v_horario_disponivel THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'horario_indisponivel',
        'message', 'Este horário de visita já foi reservado por outro fornecedor'
      );
    END IF;
  END IF;

  SELECT limite_candidaturas_diarias, limite_candidaturas_mensais
  INTO v_limite_diario, v_limite_mensal
  FROM profiles
  WHERE id = v_user_id;

  v_limite_diario := COALESCE(v_limite_diario, 5);
  v_limite_mensal := COALESCE(v_limite_mensal, 30);

  SELECT COUNT(*) > 0
  INTO v_inscricao_exists
  FROM candidaturas_fornecedores
  WHERE orcamento_id = p_orcamento_id 
    AND fornecedor_id = v_user_id
    AND data_desistencia IS NULL;

  IF v_inscricao_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_applied',
      'message', 'Você já se candidatou a este orçamento'
    );
  END IF;

  SELECT COUNT(*)
  INTO v_candidaturas_hoje
  FROM candidaturas_fornecedores
  WHERE fornecedor_id = v_user_id
    AND (data_candidatura AT TIME ZONE 'America/Sao_Paulo')::date = current_date_sao_paulo()
    AND data_desistencia IS NULL;

  SELECT COUNT(*)
  INTO v_candidaturas_mes
  FROM candidaturas_fornecedores
  WHERE fornecedor_id = v_user_id
    AND EXTRACT(YEAR FROM (data_candidatura AT TIME ZONE 'America/Sao_Paulo')) = EXTRACT(YEAR FROM current_date_sao_paulo())
    AND EXTRACT(MONTH FROM (data_candidatura AT TIME ZONE 'America/Sao_Paulo')) = EXTRACT(MONTH FROM current_date_sao_paulo())
    AND data_desistencia IS NULL;

  IF v_candidaturas_hoje >= v_limite_diario AND v_candidaturas_mes >= v_limite_mensal THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'limit_exceeded',
      'message', 'Limites diário e mensal excedidos',
      'candidaturas_hoje', v_candidaturas_hoje,
      'candidaturas_mes', v_candidaturas_mes,
      'limite_diario', v_limite_diario,
      'limite_mensal', v_limite_mensal
    );
  END IF;

  IF v_candidaturas_hoje >= v_limite_diario THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'daily_limit_exceeded',
      'message', 'Limite diário de candidaturas excedido',
      'candidaturas_hoje', v_candidaturas_hoje,
      'limite_diario', v_limite_diario
    );
  END IF;

  IF v_candidaturas_mes >= v_limite_mensal THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'monthly_limit_exceeded',
      'message', 'Limite mensal de candidaturas excedido',
      'candidaturas_mes', v_candidaturas_mes,
      'limite_mensal', v_limite_mensal
    );
  END IF;

  INSERT INTO candidaturas_fornecedores (
    orcamento_id, fornecedor_id, nome, email, telefone, empresa, data_candidatura
  )
  VALUES (
    p_orcamento_id, v_user_id, p_nome, p_email, p_telefone, p_empresa, NOW()
  )
  RETURNING id INTO v_fornecedor_id;

  INSERT INTO inscricoes_fornecedores (
    orcamento_id, fornecedor_id, nome, email, telefone, empresa, data_inscricao
  )
  VALUES (
    p_orcamento_id, v_user_id, p_nome, p_email, p_telefone, p_empresa, NOW()
  );

  -- Se horário foi informado, reservar
  IF p_horario_visita_id IS NOT NULL THEN
    UPDATE horarios_visita_orcamento
    SET fornecedor_id = v_user_id,
        candidatura_id = v_fornecedor_id,
        reservado_em = NOW()
    WHERE id = p_horario_visita_id
      AND fornecedor_id IS NULL;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Candidatura realizada com sucesso',
    'fornecedor_id', v_fornecedor_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', SQLERRM
    );
END;
$function$;
