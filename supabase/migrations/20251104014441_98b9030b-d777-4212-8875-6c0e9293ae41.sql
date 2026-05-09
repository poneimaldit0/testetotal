-- Corrigir função do trigger para não incluir colunas inexistentes
CREATE OR REPLACE FUNCTION criar_lead_marcenaria_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o orçamento existe no CRM Kanban e ainda não tem lead de marcenaria
  IF EXISTS (
    SELECT 1 FROM public.orcamentos_crm_tracking 
    WHERE orcamento_id = NEW.id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.crm_marcenaria_leads 
    WHERE orcamento_id = NEW.id
  ) THEN
    INSERT INTO public.crm_marcenaria_leads (
      orcamento_id,
      codigo_orcamento,
      cliente_nome,
      cliente_email,
      cliente_telefone,
      etapa_marcenaria,
      bloqueado,
      data_desbloqueio
    )
    SELECT 
      NEW.id,
      NEW.codigo_orcamento,
      NEW.dados_contato->>'nome',
      NEW.dados_contato->>'email',
      NEW.dados_contato->>'telefone',
      'identificacao_automatica',
      TRUE,
      NEW.created_at + INTERVAL '7 days';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '';