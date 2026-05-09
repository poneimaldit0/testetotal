-- Apropriar todos os leads existentes de marcenaria ao Hicham
UPDATE crm_marcenaria_leads
SET 
  consultor_responsavel_id = 'fe9df2fb-594b-4869-a117-be4658674afe',
  consultor_nome = 'Hicham',
  updated_at = NOW()
WHERE consultor_responsavel_id IS NULL;

-- Log da operação
DO $$
DECLARE
  v_total_apropriados INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_apropriados
  FROM crm_marcenaria_leads
  WHERE consultor_responsavel_id = 'fe9df2fb-594b-4869-a117-be4658674afe';
  
  RAISE NOTICE 'Total de leads apropriados ao Hicham: %', v_total_apropriados;
END $$;