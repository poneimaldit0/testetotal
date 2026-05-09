-- Dropar view existente e criar nova com contadores de tarefas
DROP VIEW IF EXISTS public.view_crm_marcenaria_leads;

CREATE VIEW public.view_crm_marcenaria_leads AS
SELECT 
  l.*,
  -- Contadores de checklist existentes
  COALESCE(COUNT(DISTINCT pc.id) FILTER (WHERE pc.concluido = false), 0)::integer as checklist_pendentes,
  COALESCE(COUNT(DISTINCT pc.id), 0)::integer as checklist_total,
  COALESCE(COUNT(DISTINCT pc.id) FILTER (WHERE pc.concluido = true), 0)::integer as checklist_concluidos,
  -- Verificar se tem alerta de checklist (itens não concluídos há mais de X dias)
  EXISTS (
    SELECT 1 
    FROM public.crm_marcenaria_checklist_progresso pc2
    JOIN public.crm_marcenaria_checklist_etapas ce ON ce.id = pc2.item_checklist_id
    WHERE pc2.lead_id = l.id 
      AND pc2.concluido = false
      AND ce.dias_para_alerta > 0
      AND l.created_at < NOW() - (ce.dias_para_alerta || ' days')::INTERVAL
  ) as tem_alerta_checklist,
  -- Dias na etapa atual
  EXTRACT(DAY FROM (NOW() - l.updated_at))::integer as dias_na_etapa_atual,
  
  -- NOVO: Contadores de tarefas
  COALESCE(COUNT(DISTINCT t.id) FILTER (WHERE t.concluida = false), 0)::integer as total_tarefas,
  COALESCE(COUNT(DISTINCT t.id) FILTER (WHERE t.data_vencimento = CURRENT_DATE AND t.concluida = false), 0)::integer as tarefas_hoje,
  COALESCE(COUNT(DISTINCT t.id) FILTER (WHERE t.data_vencimento < CURRENT_DATE AND t.concluida = false), 0)::integer as tarefas_atrasadas,
  COALESCE(COUNT(DISTINCT t.id) FILTER (WHERE t.concluida = true), 0)::integer as tarefas_concluidas

FROM public.crm_marcenaria_leads l
LEFT JOIN public.crm_marcenaria_checklist_progresso pc ON pc.lead_id = l.id
LEFT JOIN public.crm_marcenaria_tarefas t ON t.lead_id = l.id
GROUP BY l.id;