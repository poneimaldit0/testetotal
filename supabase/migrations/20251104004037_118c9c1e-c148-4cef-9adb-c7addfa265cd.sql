-- Trigger para auto-criar checklist ao mudar etapa de lead de marcenaria
CREATE OR REPLACE FUNCTION auto_criar_checklist_marcenaria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Quando lead muda de etapa ou é inserido, criar progresso para os itens da nova etapa
  IF (TG_OP = 'UPDATE' AND OLD.etapa_marcenaria IS DISTINCT FROM NEW.etapa_marcenaria)
     OR TG_OP = 'INSERT' THEN
    
    -- Inserir progresso para cada item ativo da etapa
    INSERT INTO crm_marcenaria_checklist_progresso (lead_id, item_checklist_id)
    SELECT NEW.id, ce.id
    FROM crm_marcenaria_checklist_etapas ce
    WHERE ce.etapa_marcenaria = NEW.etapa_marcenaria
      AND ce.ativo = true
    ON CONFLICT (lead_id, item_checklist_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_auto_criar_checklist_marcenaria ON crm_marcenaria_leads;
CREATE TRIGGER trigger_auto_criar_checklist_marcenaria
AFTER INSERT OR UPDATE OF etapa_marcenaria ON crm_marcenaria_leads
FOR EACH ROW
EXECUTE FUNCTION auto_criar_checklist_marcenaria();

-- Criar checklist para leads existentes na etapa atual
INSERT INTO crm_marcenaria_checklist_progresso (lead_id, item_checklist_id)
SELECT 
  cml.id,
  ce.id
FROM crm_marcenaria_leads cml
CROSS JOIN crm_marcenaria_checklist_etapas ce
WHERE ce.etapa_marcenaria = cml.etapa_marcenaria
  AND ce.ativo = true
ON CONFLICT (lead_id, item_checklist_id) DO NOTHING;