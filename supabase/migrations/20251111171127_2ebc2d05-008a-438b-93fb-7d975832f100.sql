-- ============================================================================
-- CONFIGURAR DESBLOQUEIO AUTOMÁTICO DE LEADS DE MARCENARIA
-- ============================================================================

-- Criar função SQL para desbloquear leads que atingiram data_desbloqueio
CREATE OR REPLACE FUNCTION public.desbloquear_leads_marcenaria_automatico()
RETURNS TABLE(leads_desbloqueados INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Desbloquear leads que atingiram data_desbloqueio
  UPDATE public.crm_marcenaria_leads
  SET 
    bloqueado = false,
    etapa_marcenaria = 'abordagem_inicial',
    updated_at = NOW()
  WHERE 
    bloqueado = true 
    AND data_desbloqueio <= NOW()
    AND etapa_marcenaria = 'identificacao_automatica';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Log de execução
  RAISE NOTICE '🔓 Desbloqueados % leads de marcenaria', v_count;
  
  RETURN QUERY SELECT v_count;
END;
$$;

-- Comentário na função
COMMENT ON FUNCTION public.desbloquear_leads_marcenaria_automatico() IS 
'Desbloqueia automaticamente leads de marcenaria que atingiram a data_desbloqueio (D+7)';

-- Configurar cron job para executar a cada hora
SELECT cron.schedule(
  'desbloquear-leads-marcenaria-automatico',
  '0 * * * *', -- A cada hora no minuto 0
  $$SELECT public.desbloquear_leads_marcenaria_automatico()$$
);

-- Executar imediatamente para desbloquear leads pendentes
SELECT public.desbloquear_leads_marcenaria_automatico();