-- Inicializar TODOS os orçamentos órfãos desde 22/10/2025
DO $$
DECLARE
  orcamento_record RECORD;
  resultado JSONB;
  orfaos_processados INTEGER := 0;
  concierge_default UUID := '78075d18-0ad5-4df8-843e-27f2f247381d'; -- Pedro Carnevalli
BEGIN
  -- Lista de IDs específicos para inicializar
  FOR orcamento_record IN 
    SELECT 
      o.id,
      o.codigo_orcamento,
      o.gestor_conta_id,
      LEFT(o.necessidade, 80) as necessidade_resumo
    FROM orcamentos o
    LEFT JOIN orcamentos_crm_tracking oct ON oct.orcamento_id = o.id
    WHERE o.created_at >= '2025-10-22 00:00:00'
      AND oct.id IS NULL
    ORDER BY o.created_at DESC
  LOOP
    BEGIN
      -- Inicializar com gestor_conta_id se existir, senão usar admin default
      SELECT inicializar_orcamento_crm(
        orcamento_record.id,
        COALESCE(orcamento_record.gestor_conta_id, concierge_default)
      ) INTO resultado;
      
      orfaos_processados := orfaos_processados + 1;
      
      RAISE NOTICE 'Orçamento % (%) inicializado no CRM', 
        orcamento_record.codigo_orcamento,
        orcamento_record.necessidade_resumo;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Erro ao inicializar orçamento %: %', 
          orcamento_record.codigo_orcamento, 
          SQLERRM;
    END;
  END LOOP;
  
  -- Log final
  RAISE NOTICE 'Correção concluída: % orçamentos órfãos inicializados desde 22/10', orfaos_processados;
  
  -- Log de auditoria
  INSERT INTO logs_acesso (user_id, acao)
  VALUES (
    auth.uid(),
    'CORRECAO_ORFAOS_CRM_22_10: ' || orfaos_processados || ' orçamentos inicializados'
  );
END $$;