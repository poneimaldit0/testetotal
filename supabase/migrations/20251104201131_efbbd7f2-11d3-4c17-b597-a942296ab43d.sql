
-- Função para criar lead de marcenaria automaticamente ao cadastrar orçamento
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

  -- Criar lead apenas se:
  -- 1. Status é 'aberto'
  -- 2. Não tem candidaturas
  -- 3. Não existe lead já criado
  IF NEW.status = 'aberto' THEN
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
      necessidade,
      local,
      categorias,
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
      NEW.ambiente_reformar,
      (NEW.tem_planta IS NOT NULL),
      (NEW.tem_medidas IS NOT NULL),
      false,
      NEW.estilo_decoracao,
      NEW.necessidade,
      NEW.cidade || ', ' || NEW.estado,
      NEW.categorias,
      NEW.created_at + INTERVAL '7 days',
      TRUE,
      v_consultor_padrao_id,
      v_consultor_nome,
      'identificacao_automatica'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.crm_marcenaria_leads 
      WHERE orcamento_id = NEW.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.candidaturas_fornecedores
      WHERE orcamento_id = NEW.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.orcamentos_crm_tracking
      WHERE orcamento_id = NEW.id
      AND etapa_crm IN ('perdido', 'ganho')
    );
    
    -- Log da criação
    IF FOUND THEN
      RAISE NOTICE 'Lead de marcenaria criado automaticamente: % (Consultor: %)', 
        NEW.codigo_orcamento, v_consultor_nome;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger para executar após INSERT em orcamentos
DROP TRIGGER IF EXISTS trigger_criar_lead_marcenaria_automatico ON public.orcamentos;

CREATE TRIGGER trigger_criar_lead_marcenaria_automatico
  AFTER INSERT ON public.orcamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_lead_marcenaria_automatico();

-- Comentário para documentação
COMMENT ON FUNCTION public.criar_lead_marcenaria_automatico() IS 
  'Cria automaticamente um lead no CRM de marcenaria quando um novo orçamento é cadastrado (status = aberto)';

COMMENT ON TRIGGER trigger_criar_lead_marcenaria_automatico ON public.orcamentos IS 
  'Trigger que cria leads de marcenaria imediatamente após inserir novo orçamento';
