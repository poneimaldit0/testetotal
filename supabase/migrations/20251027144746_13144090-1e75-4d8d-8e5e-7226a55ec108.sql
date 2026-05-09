-- Modificar função para funcionar em INSERT e UPDATE
CREATE OR REPLACE FUNCTION public.inicializar_checklist_orcamento()
RETURNS TRIGGER AS $$
BEGIN
  -- Funciona tanto para INSERT (OLD IS NULL) quanto UPDATE de etapa
  IF OLD IS NULL OR NEW.etapa_crm IS DISTINCT FROM OLD.etapa_crm THEN
    -- Inserir itens do checklist para a nova etapa
    INSERT INTO public.crm_checklist_progresso (
      orcamento_id,
      item_checklist_id,
      concluido,
      created_at
    )
    SELECT 
      NEW.orcamento_id,
      ce.id,
      false,
      now()
    FROM public.crm_checklist_etapas ce
    WHERE ce.etapa_crm = NEW.etapa_crm
      AND ce.ativo = true
    ON CONFLICT (orcamento_id, item_checklist_id) DO NOTHING;
    
    -- Atualizar contadores na tabela de tracking
    UPDATE public.orcamentos_crm_tracking
    SET 
      total_itens_checklist = (
        SELECT COUNT(*)
        FROM public.crm_checklist_progresso
        WHERE orcamento_id = NEW.orcamento_id
      ),
      itens_checklist_concluidos = (
        SELECT COUNT(*)
        FROM public.crm_checklist_progresso
        WHERE orcamento_id = NEW.orcamento_id
          AND concluido = true
      )
    WHERE orcamento_id = NEW.orcamento_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para INSERT (se não existir)
DROP TRIGGER IF EXISTS trigger_inicializar_checklist_insert ON public.orcamentos_crm_tracking;
CREATE TRIGGER trigger_inicializar_checklist_insert
  AFTER INSERT ON public.orcamentos_crm_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.inicializar_checklist_orcamento();

-- Garantir que o trigger de UPDATE também existe
DROP TRIGGER IF EXISTS trigger_inicializar_checklist ON public.orcamentos_crm_tracking;
CREATE TRIGGER trigger_inicializar_checklist
  AFTER UPDATE ON public.orcamentos_crm_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.inicializar_checklist_orcamento();

-- Backfill: Popular checklist de orçamentos sem itens
INSERT INTO public.crm_checklist_progresso (
  orcamento_id,
  item_checklist_id,
  concluido,
  created_at
)
SELECT 
  oct.orcamento_id,
  ce.id,
  false,
  now()
FROM public.orcamentos_crm_tracking oct
CROSS JOIN public.crm_checklist_etapas ce
WHERE ce.etapa_crm = oct.etapa_crm
  AND ce.ativo = true
  AND NOT EXISTS (
    SELECT 1 
    FROM public.crm_checklist_progresso cp
    WHERE cp.orcamento_id = oct.orcamento_id
      AND cp.item_checklist_id = ce.id
  )
ON CONFLICT (orcamento_id, item_checklist_id) DO NOTHING;

-- Atualizar contadores de todos os orçamentos
UPDATE public.orcamentos_crm_tracking oct
SET 
  total_itens_checklist = (
    SELECT COUNT(*)
    FROM public.crm_checklist_progresso cp
    WHERE cp.orcamento_id = oct.orcamento_id
  ),
  itens_checklist_concluidos = (
    SELECT COUNT(*)
    FROM public.crm_checklist_progresso cp
    WHERE cp.orcamento_id = oct.orcamento_id
      AND cp.concluido = true
  )
WHERE oct.total_itens_checklist = 0 
   OR oct.total_itens_checklist IS NULL
   OR oct.total_itens_checklist != (
     SELECT COUNT(*)
     FROM public.crm_checklist_progresso cp
     WHERE cp.orcamento_id = oct.orcamento_id
   );