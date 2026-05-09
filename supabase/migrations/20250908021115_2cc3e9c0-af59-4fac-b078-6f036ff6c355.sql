-- Função para verificar e executar consolidação automática
CREATE OR REPLACE FUNCTION public.verificar_e_consolidar_checklist()
RETURNS TRIGGER AS $$
DECLARE
  checklist_record RECORD;
  total_contribuidores INTEGER;
  todos_contribuiram BOOLEAN := FALSE;
  prazo_expirado BOOLEAN := FALSE;
BEGIN
  -- Buscar dados do checklist colaborativo
  SELECT * INTO checklist_record
  FROM public.checklist_colaborativo
  WHERE id = COALESCE(NEW.checklist_colaborativo_id, OLD.checklist_colaborativo_id);
  
  -- Se checklist não existe ou já está consolidado, não fazer nada
  IF checklist_record IS NULL OR checklist_record.status = 'checklist_definido' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Contar quantos fornecedores únicos já contribuíram
  SELECT COUNT(DISTINCT fornecedor_id) INTO total_contribuidores
  FROM public.contribuicoes_checklist cc
  WHERE cc.checklist_colaborativo_id = checklist_record.id;
  
  -- Verificar se todos os fornecedores contribuíram
  todos_contribuiram := total_contribuidores >= checklist_record.total_fornecedores;
  
  -- Verificar se o prazo expirou
  prazo_expirado := checklist_record.prazo_contribuicao <= NOW();
  
  -- Atualizar contador de contribuições
  UPDATE public.checklist_colaborativo
  SET contribuicoes_recebidas = total_contribuidores,
      updated_at = NOW()
  WHERE id = checklist_record.id;
  
  -- Se todos contribuíram OU prazo expirou, consolidar automaticamente
  IF todos_contribuiram OR prazo_expirado THEN
    UPDATE public.checklist_colaborativo
    SET status = 'checklist_definido',
        data_consolidacao = NOW(),
        contribuicoes_recebidas = total_contribuidores,
        updated_at = NOW()
    WHERE id = checklist_record.id;
    
    -- Log da consolidação automática
    INSERT INTO public.logs_acesso (user_id, acao)
    VALUES (
      NULL,
      'consolidacao_automatica_checklist: ' || checklist_record.id::text || 
      ' - motivo: ' || CASE 
        WHEN todos_contribuiram THEN 'todos_contribuiram (' || total_contribuidores || '/' || checklist_record.total_fornecedores || ')'
        ELSE 'prazo_expirado'
      END
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Atualizar a função existente de update_contribuicoes_count para usar a nova lógica
DROP FUNCTION IF EXISTS public.update_contribuicoes_count() CASCADE;

-- Criar trigger para consolidação automática após inserção/atualização de contribuições
DROP TRIGGER IF EXISTS trigger_verificar_consolidacao_automatica ON public.contribuicoes_checklist;

CREATE TRIGGER trigger_verificar_consolidacao_automatica
  AFTER INSERT OR UPDATE OR DELETE ON public.contribuicoes_checklist
  FOR EACH ROW
  EXECUTE FUNCTION public.verificar_e_consolidar_checklist();

-- Função para executar verificação periódica de prazos expirados (pode ser chamada por cron)
CREATE OR REPLACE FUNCTION public.verificar_checklists_expirados()
RETURNS INTEGER AS $$
DECLARE
  checklist_record RECORD;
  consolidados INTEGER := 0;
BEGIN
  -- Buscar checklists com prazo expirado que ainda não foram consolidados
  FOR checklist_record IN 
    SELECT * FROM public.checklist_colaborativo
    WHERE status != 'checklist_definido'
      AND prazo_contribuicao <= NOW()
  LOOP
    -- Consolidar checklist expirado
    UPDATE public.checklist_colaborativo
    SET status = 'checklist_definido',
        data_consolidacao = NOW(),
        updated_at = NOW()
    WHERE id = checklist_record.id;
    
    -- Log da consolidação por timeout
    INSERT INTO public.logs_acesso (user_id, acao)
    VALUES (
      NULL,
      'consolidacao_timeout_checklist: ' || checklist_record.id::text || 
      ' - contribuicoes: ' || checklist_record.contribuicoes_recebidas || 
      '/' || checklist_record.total_fornecedores
    );
    
    consolidados := consolidados + 1;
  END LOOP;
  
  RETURN consolidados;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar função para forçar atualização de um checklist específico (útil para admin)
CREATE OR REPLACE FUNCTION public.atualizar_status_checklist_colaborativo(p_checklist_id uuid)
RETURNS JSONB AS $$
DECLARE
  checklist_record RECORD;
  total_contribuidores INTEGER;
  resultado JSONB;
BEGIN
  -- Verificar se é admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Apenas administradores podem atualizar status do checklist'
    );
  END IF;
  
  -- Buscar checklist
  SELECT * INTO checklist_record
  FROM public.checklist_colaborativo
  WHERE id = p_checklist_id;
  
  IF checklist_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Checklist colaborativo não encontrado'
    );
  END IF;
  
  -- Contar contribuições únicas
  SELECT COUNT(DISTINCT fornecedor_id) INTO total_contribuidores
  FROM public.contribuicoes_checklist
  WHERE checklist_colaborativo_id = p_checklist_id;
  
  -- Atualizar contador
  UPDATE public.checklist_colaborativo
  SET contribuicoes_recebidas = total_contribuidores,
      updated_at = NOW()
  WHERE id = p_checklist_id;
  
  -- Verificar se deve consolidar
  IF total_contribuidores >= checklist_record.total_fornecedores OR 
     checklist_record.prazo_contribuicao <= NOW() THEN
    
    UPDATE public.checklist_colaborativo
    SET status = 'checklist_definido',
        data_consolidacao = NOW(),
        contribuicoes_recebidas = total_contribuidores,
        updated_at = NOW()
    WHERE id = p_checklist_id;
    
    resultado := jsonb_build_object(
      'success', true,
      'action', 'consolidado',
      'contribuicoes', total_contribuidores,
      'total_fornecedores', checklist_record.total_fornecedores,
      'message', 'Checklist consolidado automaticamente'
    );
  ELSE
    resultado := jsonb_build_object(
      'success', true,
      'action', 'atualizado',
      'contribuicoes', total_contribuidores,
      'total_fornecedores', checklist_record.total_fornecedores,
      'message', 'Contador de contribuições atualizado'
    );
  END IF;
  
  -- Log da ação
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (
    auth.uid(),
    'atualizar_status_checklist: ' || p_checklist_id::text || 
    ' - ' || (resultado->>'action')::text
  );
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;