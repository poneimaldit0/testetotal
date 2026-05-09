-- Corrigir o trigger para usar status válido
CREATE OR REPLACE FUNCTION public.inicializar_checklist_colaborativo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  checklist_existente INTEGER;
BEGIN
  -- Verificar se já existe checklist colaborativo para este orçamento
  SELECT COUNT(*) INTO checklist_existente
  FROM public.checklist_colaborativo
  WHERE orcamento_id = NEW.orcamento_id;
  
  -- Se não existe, criar um novo
  IF checklist_existente = 0 THEN
    INSERT INTO public.checklist_colaborativo (
      orcamento_id,
      status,
      total_fornecedores,
      contribuicoes_recebidas
    ) VALUES (
      NEW.orcamento_id,
      'fase_colaborativa',  -- Usar status válido
      1,
      0
    );
    
    -- Log da criação
    INSERT INTO public.logs_acesso (user_id, acao)
    VALUES (
      NEW.fornecedor_id,
      'checklist_colaborativo_criado_automaticamente: ' || NEW.orcamento_id::text
    );
  ELSE
    -- Se já existe, atualizar o total de fornecedores
    UPDATE public.checklist_colaborativo
    SET total_fornecedores = (
      SELECT COUNT(DISTINCT fornecedor_id)
      FROM public.candidaturas_fornecedores
      WHERE orcamento_id = NEW.orcamento_id
        AND data_desistencia IS NULL
    ),
    updated_at = NOW()
    WHERE orcamento_id = NEW.orcamento_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Atualizar função retroativa também
CREATE OR REPLACE FUNCTION public.criar_checklists_colaborativos_retroativo()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  orcamento_record RECORD;
  checklists_criados INTEGER := 0;
BEGIN
  -- Verificar se é admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Apenas administradores podem executar esta função'
    );
  END IF;

  -- Buscar orçamentos que têm candidatos mas não têm checklist colaborativo
  FOR orcamento_record IN 
    SELECT 
      o.id as orcamento_id,
      COUNT(cf.id) as total_candidatos
    FROM public.orcamentos o
    JOIN public.candidaturas_fornecedores cf ON cf.orcamento_id = o.id
    LEFT JOIN public.checklist_colaborativo cc ON cc.orcamento_id = o.id
    WHERE cc.id IS NULL
      AND cf.data_desistencia IS NULL
    GROUP BY o.id
    HAVING COUNT(cf.id) >= 1
  LOOP
    -- Criar checklist colaborativo
    INSERT INTO public.checklist_colaborativo (
      orcamento_id,
      status,
      total_fornecedores,
      contribuicoes_recebidas
    ) VALUES (
      orcamento_record.orcamento_id,
      'fase_colaborativa',  -- Usar status válido
      orcamento_record.total_candidatos,
      0
    );
    
    checklists_criados := checklists_criados + 1;
  END LOOP;

  -- Log da operação
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (
    auth.uid(),
    'criacao_retroativa_checklists_colaborativos: ' || checklists_criados || ' criados'
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Checklists colaborativos criados retroativamente',
    'checklists_criados', checklists_criados
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Erro na criação retroativa: ' || SQLERRM
    );
END;
$$;