-- PARTE 1: Inserir retroativamente os 6 leads faltantes de 04/11
INSERT INTO public.crm_marcenaria_leads (
  orcamento_id,
  codigo_orcamento,
  cliente_nome,
  cliente_email,
  cliente_telefone,
  data_desbloqueio,
  bloqueado,
  consultor_responsavel_id,
  consultor_nome,
  etapa_marcenaria
)
SELECT 
  o.id,
  o.codigo_orcamento,
  o.dados_contato->>'nome',
  o.dados_contato->>'email',
  o.dados_contato->>'telefone',
  o.created_at + INTERVAL '7 days',
  TRUE,
  'fe9df2fb-594b-4869-a117-be4658674afe', -- Hicham
  'Hicham',
  'identificacao_automatica'
FROM public.orcamentos o
WHERE o.id IN (
  '18e4e39b-f68d-4ca3-845f-9c46095d41a2', -- Anne Souza
  '9f8e33bb-90b2-4c67-8c61-946d095e62e8', -- Eliana Amaral
  'e46560e2-0d03-4456-a533-291d6616a276', -- Luiz Felipe
  '0d08f218-491b-45c5-ba54-fd3cb098ef76', -- Gabriela Antunes
  'df4c9c8f-efba-4a61-8ca0-f33c939f2ee2', -- Paulo Henrique
  '1827fab2-2daa-4e06-b81a-348c7b8ff85e'  -- Adione Borin
)
AND NOT EXISTS (
  SELECT 1 FROM public.crm_marcenaria_leads cml
  WHERE cml.orcamento_id = o.id
);

-- PARTE 2: Ajustar trigger para criar leads de TODOS os orçamentos (independente do status)
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

  -- CRIAR LEAD SEMPRE (independente do status)
  -- Apenas verificar se já não existe
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
    NEW.ambiente_reformar,
    (NEW.tem_planta IS NOT NULL),
    (NEW.tem_medidas IS NOT NULL),
    false,
    NEW.estilo_decoracao,
    NEW.created_at + INTERVAL '7 days',
    TRUE,
    v_consultor_padrao_id,
    v_consultor_nome,
    'identificacao_automatica'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.crm_marcenaria_leads 
    WHERE orcamento_id = NEW.id
  );
  
  -- Log da criação
  IF FOUND THEN
    RAISE NOTICE 'Lead de marcenaria criado automaticamente: % (Consultor: %)', 
      NEW.codigo_orcamento, v_consultor_nome;
  END IF;

  RETURN NEW;
END;
$$;

-- Atualizar comentário para refletir mudança
COMMENT ON FUNCTION public.criar_lead_marcenaria_automatico() IS 
  'Cria automaticamente um lead no CRM de marcenaria quando um novo orçamento é cadastrado (qualquer status)';