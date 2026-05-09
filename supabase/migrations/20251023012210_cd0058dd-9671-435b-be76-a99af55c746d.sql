-- =====================================================
-- SOLUÇÃO 1: CORREÇÃO IMEDIATA - INICIALIZAR ÓRFÃOS
-- =====================================================
-- Inicializa os 7 orçamentos que não têm tracking no CRM

DO $$
DECLARE
  orcamento_record RECORD;
  resultado JSONB;
  orfaos_processados INTEGER := 0;
BEGIN
  -- Buscar orçamentos sem tracking CRM
  FOR orcamento_record IN 
    SELECT 
      o.id,
      o.codigo_orcamento,
      o.gestor_conta_id,
      o.necessidade
    FROM orcamentos o
    LEFT JOIN orcamentos_crm_tracking oct ON oct.orcamento_id = o.id
    WHERE oct.id IS NULL
    ORDER BY o.created_at DESC
  LOOP
    -- Inicializar cada orçamento órfão
    BEGIN
      SELECT inicializar_orcamento_crm(
        orcamento_record.id,
        COALESCE(
          orcamento_record.gestor_conta_id,
          '78075d18-0ad5-4df8-843e-27f2f247381d'::uuid -- Admin default (Pedro Carnevalli)
        )
      ) INTO resultado;
      
      orfaos_processados := orfaos_processados + 1;
      
      RAISE NOTICE 'Orçamento % (%) inicializado no CRM', 
        orcamento_record.codigo_orcamento,
        orcamento_record.necessidade;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Erro ao inicializar orçamento %: %', 
          orcamento_record.codigo_orcamento, 
          SQLERRM;
    END;
  END LOOP;
  
  -- Log final
  RAISE NOTICE 'Correção concluída: % orçamentos órfãos inicializados no CRM', orfaos_processados;
  
  -- Inserir log de auditoria
  INSERT INTO logs_acesso (user_id, acao)
  VALUES (
    auth.uid(),
    'CORRECAO_ORFAOS_CRM: ' || orfaos_processados || ' orçamentos inicializados'
  );
END $$;