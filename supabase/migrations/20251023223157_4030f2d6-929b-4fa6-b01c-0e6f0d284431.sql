-- Função para sincronizar gestor_conta_id da tabela orcamentos quando concierge_responsavel_id mudar no CRM
CREATE OR REPLACE FUNCTION public.sync_gestor_conta_from_crm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Atualizar orcamentos.gestor_conta_id quando concierge_responsavel_id mudar
  UPDATE public.orcamentos
  SET gestor_conta_id = NEW.concierge_responsavel_id,
      updated_at = NOW()
  WHERE id = NEW.orcamento_id;
  
  RETURN NEW;
END;
$$;

-- Trigger que executa após UPDATE em orcamentos_crm_tracking
DROP TRIGGER IF EXISTS trigger_sync_gestor_conta ON public.orcamentos_crm_tracking;
CREATE TRIGGER trigger_sync_gestor_conta
AFTER UPDATE OF concierge_responsavel_id ON public.orcamentos_crm_tracking
FOR EACH ROW
WHEN (OLD.concierge_responsavel_id IS DISTINCT FROM NEW.concierge_responsavel_id)
EXECUTE FUNCTION public.sync_gestor_conta_from_crm();

-- Comentários para documentação
COMMENT ON FUNCTION public.sync_gestor_conta_from_crm() IS 
'Sincroniza automaticamente orcamentos.gestor_conta_id quando orcamentos_crm_tracking.concierge_responsavel_id é alterado';

COMMENT ON TRIGGER trigger_sync_gestor_conta ON public.orcamentos_crm_tracking IS 
'Mantém sincronização entre CRM tracking e tabela orcamentos para o gestor responsável';

-- Sincronizar dados históricos dessincronizados
UPDATE public.orcamentos o
SET gestor_conta_id = oct.concierge_responsavel_id,
    updated_at = NOW()
FROM public.orcamentos_crm_tracking oct
WHERE o.id = oct.orcamento_id
  AND (o.gestor_conta_id IS DISTINCT FROM oct.concierge_responsavel_id);