-- Fix trigger marcenaria para usar apenas campos existentes
CREATE OR REPLACE FUNCTION public.criar_lead_marcenaria_automatico()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consultor_padrao_id UUID;
  v_consultor_nome TEXT;
BEGIN
  -- Buscar consultor padrão
  v_consultor_padrao_id := public.get_consultor_marcenaria_padrao();
  
  -- Buscar nome do consultor
  IF v_consultor_padrao_id IS NOT NULL THEN
    SELECT nome INTO v_consultor_nome 
    FROM public.profiles 
    WHERE id = v_consultor_padrao_id 
      AND tipo_usuario = 'gestor_marcenaria'
      AND status = 'ativo';
  END IF;

  -- Criar lead para TODOS os orçamentos novos
  INSERT INTO public.crm_marcenaria_leads (
    orcamento_id,
    codigo_orcamento,
    cliente_nome,
    cliente_email,
    cliente_telefone,
    ambientes_mobiliar,
    tem_planta,
    tem_medidas,
    tem_fotos,
    estilo_preferido,
    data_desbloqueio,
    bloqueado,
    consultor_responsavel_id,
    consultor_nome,
    etapa_marcenaria
  )
  SELECT 
    NEW.id,
    NEW.codigo_orcamento,
    NEW.dados_contato->>'nome',
    NEW.dados_contato->>'email',
    NEW.dados_contato->>'telefone',
    NULL,  -- ambientes_mobiliar: campo não existe em orcamentos
    NULL,  -- tem_planta: campo não existe
    NULL,  -- tem_medidas: campo não existe
    NULL,  -- tem_fotos: campo não existe
    NULL,  -- estilo_preferido: campo não existe
    NEW.created_at + INTERVAL '7 days',
    TRUE,
    v_consultor_padrao_id,
    v_consultor_nome,
    'identificacao_automatica'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.crm_marcenaria_leads 
    WHERE orcamento_id = NEW.id
  );
  
  RETURN NEW;
END;
$$;