-- Criar uma variável para armazenar o ID do primeiro admin como fallback
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Buscar o primeiro admin disponível
  SELECT id INTO v_admin_id
  FROM public.profiles
  WHERE tipo_usuario = 'admin'
  LIMIT 1;

  -- Inserir tracking CRM para todos os orçamentos existentes que ainda não estão no CRM
  INSERT INTO public.orcamentos_crm_tracking (
    orcamento_id,
    etapa_crm,
    status_contato,
    concierge_responsavel_id
  )
  SELECT 
    o.id,
    'orcamento_postado'::etapa_crm_enum,
    'sem_contato'::status_contato_enum,
    o.gestor_conta_id
  FROM public.orcamentos o
  WHERE o.id NOT IN (
    SELECT orcamento_id FROM public.orcamentos_crm_tracking
  );

  -- Registrar no histórico a inicialização de cada orçamento
  INSERT INTO public.orcamentos_crm_historico (
    orcamento_id,
    etapa_anterior,
    etapa_nova,
    movido_por_id,
    movido_por_nome,
    observacao
  )
  SELECT 
    o.id,
    NULL,
    'orcamento_postado'::etapa_crm_enum,
    COALESCE(o.gestor_conta_id, v_admin_id),
    COALESCE(p.nome, 'Sistema'),
    'Orçamento inicializado no CRM automaticamente'
  FROM public.orcamentos o
  LEFT JOIN public.profiles p ON p.id = o.gestor_conta_id
  WHERE o.id NOT IN (
    SELECT orcamento_id FROM public.orcamentos_crm_historico
  );
END $$;