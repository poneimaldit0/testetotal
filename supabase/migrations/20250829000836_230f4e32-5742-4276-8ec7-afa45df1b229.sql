-- Adicionar campos específicos para limites de candidaturas
ALTER TABLE public.profiles 
ADD COLUMN limite_candidaturas_diarias integer DEFAULT 10,
ADD COLUMN limite_candidaturas_mensais integer DEFAULT 100;

-- Correção temporária para o usuário específico
UPDATE public.profiles 
SET limite_acessos_diarios = 10 
WHERE email = 'raphaelnardioficial@gmail.com' AND limite_acessos_diarios = 0;

-- Dropar função existente e recriar com nova lógica
DROP FUNCTION IF EXISTS public.verificar_limite_candidatura(uuid);

CREATE OR REPLACE FUNCTION public.verificar_limite_candidatura(p_fornecedor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  profile_record RECORD;
  candidaturas_hoje integer;
  candidaturas_mes integer;
  penalidades JSONB;
BEGIN
  -- Buscar dados do fornecedor
  SELECT 
    p.limite_candidaturas_diarias,
    p.limite_candidaturas_mensais,
    p.candidaturas_diarias,
    p.candidaturas_mensais,
    p.ultimo_acesso_candidatura_diario,
    p.ultimo_acesso_candidatura_mensal,
    p.nome,
    p.status
  INTO profile_record
  FROM public.profiles p
  WHERE p.id = p_fornecedor_id;
  
  -- Se não encontrou o fornecedor
  IF profile_record IS NULL THEN
    RETURN jsonb_build_object(
      'pode_candidatar', false,
      'motivo', 'Fornecedor não encontrado'
    );
  END IF;
  
  -- Se fornecedor não está ativo
  IF profile_record.status != 'ativo' THEN
    RETURN jsonb_build_object(
      'pode_candidatar', false,
      'motivo', 'Fornecedor não está ativo'
    );
  END IF;
  
  -- Verificar penalidades ativas
  SELECT public.verificar_penalidades_ativas(p_fornecedor_id) INTO penalidades;
  
  IF (penalidades->>'tem_penalidades')::boolean = true THEN
    RETURN jsonb_build_object(
      'pode_candidatar', false,
      'motivo', 'Fornecedor possui penalidades ativas',
      'penalidades', penalidades
    );
  END IF;
  
  -- Reset contadores se necessário (diário)
  IF profile_record.ultimo_acesso_candidatura_diario < CURRENT_DATE THEN
    UPDATE public.profiles 
    SET candidaturas_diarias = 0,
        ultimo_acesso_candidatura_diario = CURRENT_DATE
    WHERE id = p_fornecedor_id;
    candidaturas_hoje := 0;
  ELSE
    candidaturas_hoje := COALESCE(profile_record.candidaturas_diarias, 0);
  END IF;
  
  -- Reset contadores se necessário (mensal)
  IF profile_record.ultimo_acesso_candidatura_mensal < DATE_TRUNC('month', CURRENT_DATE) THEN
    UPDATE public.profiles 
    SET candidaturas_mensais = 0,
        ultimo_acesso_candidatura_mensal = CURRENT_DATE
    WHERE id = p_fornecedor_id;
    candidaturas_mes := 0;
  ELSE
    candidaturas_mes := COALESCE(profile_record.candidaturas_mensais, 0);
  END IF;
  
  -- Verificar limite diário de candidaturas (se definido)
  IF profile_record.limite_candidaturas_diarias IS NOT NULL 
     AND candidaturas_hoje >= profile_record.limite_candidaturas_diarias THEN
    RETURN jsonb_build_object(
      'pode_candidatar', false,
      'motivo', 'Limite diário de candidaturas atingido',
      'limite_diario', profile_record.limite_candidaturas_diarias,
      'candidaturas_hoje', candidaturas_hoje
    );
  END IF;
  
  -- Verificar limite mensal de candidaturas (se definido)
  IF profile_record.limite_candidaturas_mensais IS NOT NULL 
     AND candidaturas_mes >= profile_record.limite_candidaturas_mensais THEN
    RETURN jsonb_build_object(
      'pode_candidatar', false,
      'motivo', 'Limite mensal de candidaturas atingido',
      'limite_mensal', profile_record.limite_candidaturas_mensais,
      'candidaturas_mes', candidaturas_mes
    );
  END IF;
  
  RETURN jsonb_build_object(
    'pode_candidatar', true,
    'limite_diario', profile_record.limite_candidaturas_diarias,
    'limite_mensal', profile_record.limite_candidaturas_mensais,
    'candidaturas_hoje', candidaturas_hoje,
    'candidaturas_mes', candidaturas_mes,
    'motivo', 'Dentro dos limites de candidatura'
  );
END;
$function$;