-- =====================================================
-- SOLUÇÃO 2: TRIGGER AUTOMÁTICO PARA INICIALIZAÇÃO CRM
-- =====================================================
-- Previne que novos orçamentos fiquem sem tracking no CRM

-- 1. Criar função de trigger
CREATE OR REPLACE FUNCTION trigger_inicializar_orcamento_crm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_concierge_id uuid;
  v_resultado jsonb;
BEGIN
  -- Determinar concierge responsável
  v_concierge_id := NEW.gestor_conta_id;
  
  -- Se não tem gestor, buscar um admin ativo como fallback
  IF v_concierge_id IS NULL THEN
    SELECT id INTO v_concierge_id
    FROM profiles
    WHERE tipo_usuario IN ('admin', 'master')
      AND status = 'ativo'
    LIMIT 1;
  END IF;
  
  -- Se ainda não tem, usar o user que criou (se disponível)
  IF v_concierge_id IS NULL THEN
    v_concierge_id := auth.uid();
  END IF;
  
  -- Inicializar no CRM
  BEGIN
    SELECT inicializar_orcamento_crm(
      NEW.id,
      v_concierge_id
    ) INTO v_resultado;
    
    -- Log de sucesso
    RAISE NOTICE 'Orçamento % inicializado no CRM via trigger', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log de erro mas não bloqueia a inserção do orçamento
      RAISE WARNING 'Falha ao inicializar orçamento % no CRM: %', NEW.id, SQLERRM;
      
      -- Inserir log de erro para debugging
      INSERT INTO logs_acesso (user_id, acao)
      VALUES (
        auth.uid(),
        'ERRO_TRIGGER_CRM: ' || NEW.id::text || ' - ' || SQLERRM
      );
  END;
  
  RETURN NEW;
END;
$$;

-- 2. Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_after_insert_orcamento_crm ON orcamentos;

-- 3. Criar novo trigger
CREATE TRIGGER trigger_after_insert_orcamento_crm
  AFTER INSERT ON orcamentos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_inicializar_orcamento_crm();