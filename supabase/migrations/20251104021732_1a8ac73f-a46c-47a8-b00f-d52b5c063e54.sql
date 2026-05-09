-- Criar tabela de configuração para marcenaria
CREATE TABLE IF NOT EXISTS public.configuracoes_marcenaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT UNIQUE NOT NULL,
  valor JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configuração padrão com ID do Hicham
INSERT INTO public.configuracoes_marcenaria (chave, valor)
VALUES ('consultor_padrao_id', '"fe9df2fb-594b-4869-a117-be4658674afe"'::jsonb)
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;

-- Função auxiliar para pegar o consultor padrão de marcenaria
CREATE OR REPLACE FUNCTION public.get_consultor_marcenaria_padrao()
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consultor_id UUID;
BEGIN
  SELECT (valor #>> '{}')::uuid INTO v_consultor_id
  FROM public.configuracoes_marcenaria
  WHERE chave = 'consultor_padrao_id';
  
  RETURN v_consultor_id;
END;
$$;

-- Atualizar função de criação de leads para incluir consultor padrão
CREATE OR REPLACE FUNCTION public.criar_lead_marcenaria_apos_7_dias()
RETURNS void
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

  -- Inserir leads de marcenaria para orçamentos com mais de 7 dias sem interação
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
    o.id,
    o.codigo_orcamento,
    o.dados_contato->>'nome',
    o.dados_contato->>'email',
    o.dados_contato->>'telefone',
    o.ambiente_reformar,
    (o.tem_planta IS NOT NULL),
    (o.tem_medidas IS NOT NULL),
    false,
    o.estilo_decoracao,
    o.necessidade,
    o.cidade || ', ' || o.estado,
    o.categorias,
    o.created_at + INTERVAL '7 days',
    TRUE,
    v_consultor_padrao_id,
    v_consultor_nome,
    'identificacao_automatica'
  FROM public.orcamentos o
  LEFT JOIN public.orcamentos_crm_tracking oct ON oct.orcamento_id = o.id
  WHERE 
    o.created_at <= NOW() - INTERVAL '7 days'
    AND o.status = 'aberto'
    AND NOT EXISTS (
      SELECT 1 FROM public.crm_marcenaria_leads 
      WHERE orcamento_id = o.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.candidaturas_fornecedores
      WHERE orcamento_id = o.id
    )
    AND (oct.id IS NULL OR oct.etapa_crm NOT IN ('perdido', 'ganho'));

  RAISE NOTICE 'Leads de marcenaria criados com consultor padrão: %', v_consultor_nome;
END;
$$;

-- Comentários para documentação
COMMENT ON TABLE public.configuracoes_marcenaria IS 'Configurações gerais do CRM de marcenaria';
COMMENT ON FUNCTION public.get_consultor_marcenaria_padrao() IS 'Retorna o UUID do consultor padrão para novos leads de marcenaria';
COMMENT ON FUNCTION public.criar_lead_marcenaria_apos_7_dias() IS 'Cria leads de marcenaria automaticamente para orçamentos com mais de 7 dias, já apropriados ao consultor padrão';