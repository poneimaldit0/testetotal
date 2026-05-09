-- Adicionar coluna data_entrada_etapa na tabela orcamentos_crm_tracking
ALTER TABLE orcamentos_crm_tracking 
ADD COLUMN IF NOT EXISTS data_entrada_etapa TIMESTAMPTZ;

-- Preencher retroativamente usando o histórico de movimentações
UPDATE orcamentos_crm_tracking t
SET data_entrada_etapa = (
  SELECT h.data_movimentacao
  FROM orcamentos_crm_historico h
  WHERE h.orcamento_id = t.orcamento_id
    AND h.etapa_nova = t.etapa_crm
  ORDER BY h.data_movimentacao DESC
  LIMIT 1
)
WHERE data_entrada_etapa IS NULL;

-- Para orçamentos sem histórico, usar created_at do orçamento
UPDATE orcamentos_crm_tracking t
SET data_entrada_etapa = o.created_at
FROM orcamentos o
WHERE t.orcamento_id = o.id
  AND t.data_entrada_etapa IS NULL;

-- DROP da função existente antes de recriar
DROP FUNCTION IF EXISTS public.mover_orcamento_etapa(uuid, text, uuid, text);

-- Recriar RPC mover_orcamento_etapa para setar data_entrada_etapa
CREATE OR REPLACE FUNCTION public.mover_orcamento_etapa(
  p_orcamento_id uuid,
  p_nova_etapa text,
  p_usuario_id uuid,
  p_observacao text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_etapa_atual text;
  v_usuario_nome text;
BEGIN
  -- Buscar etapa atual
  SELECT etapa_crm::text INTO v_etapa_atual
  FROM public.orcamentos_crm_tracking
  WHERE orcamento_id = p_orcamento_id;

  IF v_etapa_atual IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Orçamento não encontrado no CRM'
    );
  END IF;

  -- Buscar nome do usuário
  SELECT nome INTO v_usuario_nome
  FROM public.profiles
  WHERE id = p_usuario_id;

  -- Atualizar etapa E data_entrada_etapa
  UPDATE public.orcamentos_crm_tracking
  SET 
    etapa_crm = p_nova_etapa::etapa_crm_enum,
    updated_at = NOW(),
    data_entrada_etapa = NOW()  -- SETAR DATA DE ENTRADA NA NOVA ETAPA
  WHERE orcamento_id = p_orcamento_id;

  -- Registrar no histórico
  INSERT INTO public.orcamentos_crm_historico (
    orcamento_id,
    etapa_anterior,
    etapa_nova,
    movido_por_id,
    movido_por_nome,
    observacao
  ) VALUES (
    p_orcamento_id,
    v_etapa_atual::etapa_crm_enum,
    p_nova_etapa::etapa_crm_enum,
    p_usuario_id,
    v_usuario_nome,
    p_observacao
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Orçamento movido com sucesso',
    'etapa_anterior', v_etapa_atual,
    'etapa_nova', p_nova_etapa
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Erro ao mover orçamento: ' || SQLERRM
    );
END;
$function$;

-- Atualizar a view para usar data_entrada_etapa ao invés de updated_at
DROP VIEW IF EXISTS public.view_orcamentos_crm_com_checklist;

CREATE VIEW public.view_orcamentos_crm_com_checklist AS
SELECT 
  o.id,
  o.codigo_orcamento,
  o.necessidade,
  o.local,
  o.categorias,
  o.tamanho_imovel,
  o.dados_contato,
  o.data_publicacao,
  o.created_at,
  o.gestor_conta_id,
  
  -- CRM tracking
  t.etapa_crm,
  t.status_contato,
  t.observacoes_internas,
  t.feedback_cliente_nota,
  t.feedback_cliente_comentario,
  t.updated_at as ultima_atualizacao,
  t.valor_lead_estimado,
  t.concierge_responsavel_id,
  t.motivo_perda_id,
  t.justificativa_perda,
  t.data_conclusao,
  
  -- Responsáveis
  p_concierge.nome as concierge_nome,
  p_concierge.email as concierge_email,
  p_gestor.nome as gestor_nome,
  
  -- Motivo perda
  mp.nome as motivo_perda_nome,
  mp.descricao as motivo_perda_descricao,
  
  -- Contadores de fornecedores e propostas
  COUNT(DISTINCT cf.id) FILTER (WHERE cf.data_desistencia IS NULL) as fornecedores_inscritos_count,
  COUNT(DISTINCT cf.id) FILTER (WHERE cf.proposta_enviada = true AND cf.data_desistencia IS NULL) as propostas_enviadas_count,
  
  -- Tempo na etapa usando data_entrada_etapa ao invés de updated_at
  EXTRACT(DAY FROM (NOW() - t.data_entrada_etapa))::INTEGER as tempo_na_etapa_dias,
  
  -- Checklist
  CASE 
    WHEN COUNT(pc.id) > 0 THEN 
      ROUND((COUNT(pc.id) FILTER (WHERE pc.concluido = true)::NUMERIC / COUNT(pc.id)::NUMERIC) * 100)::INTEGER
    ELSE 0 
  END as percentual_checklist_concluido,
  
  -- Alertas usando data_entrada_etapa
  EXISTS (
    SELECT 1 
    FROM public.crm_checklist_progresso pc2
    JOIN public.crm_checklist_etapas ce ON ce.id = pc2.item_checklist_id
    WHERE pc2.orcamento_id = o.id 
      AND pc2.concluido = false
      AND ce.dias_para_alerta > 0
      AND t.data_entrada_etapa < NOW() - (ce.dias_para_alerta || ' days')::INTERVAL
  ) as tem_alertas,
  
  COUNT(DISTINCT pc.id)::INTEGER as total_itens_checklist,
  COUNT(DISTINCT pc.id) FILTER (WHERE pc.concluido = true)::INTEGER as itens_checklist_concluidos,
  
  -- Contador de checklist pendentes usando data_entrada_etapa
  COALESCE((
    SELECT COUNT(DISTINCT pc2.id)
    FROM public.crm_checklist_progresso pc2
    JOIN public.crm_checklist_etapas ce ON ce.id = pc2.item_checklist_id
    WHERE pc2.orcamento_id = o.id 
      AND pc2.concluido = false
      AND ce.dias_para_alerta > 0
      AND t.data_entrada_etapa < NOW() - (ce.dias_para_alerta || ' days')::INTERVAL
  ), 0)::integer as checklist_pendentes,
  
  -- Contadores de tarefas
  COALESCE(COUNT(DISTINCT tar.id) FILTER (WHERE tar.concluida = false), 0)::integer as total_tarefas,
  COALESCE(COUNT(DISTINCT tar.id) FILTER (WHERE tar.data_vencimento = CURRENT_DATE AND tar.concluida = false), 0)::integer as tarefas_hoje,
  COALESCE(COUNT(DISTINCT tar.id) FILTER (WHERE tar.data_vencimento < CURRENT_DATE AND tar.concluida = false), 0)::integer as tarefas_atrasadas,
  COALESCE(COUNT(DISTINCT tar.id) FILTER (WHERE tar.concluida = true), 0)::integer as tarefas_concluidas

FROM public.orcamentos o
JOIN public.orcamentos_crm_tracking t ON t.orcamento_id = o.id
LEFT JOIN public.profiles p_concierge ON p_concierge.id = t.concierge_responsavel_id
LEFT JOIN public.profiles p_gestor ON p_gestor.id = o.gestor_conta_id
LEFT JOIN public.motivos_perda_crm mp ON mp.id = t.motivo_perda_id
LEFT JOIN public.candidaturas_fornecedores cf ON cf.orcamento_id = o.id
LEFT JOIN public.crm_checklist_progresso pc ON pc.orcamento_id = o.id
LEFT JOIN public.crm_orcamentos_tarefas tar ON tar.orcamento_id = o.id
GROUP BY 
  o.id, o.gestor_conta_id, t.etapa_crm, t.status_contato, t.observacoes_internas,
  t.feedback_cliente_nota, t.feedback_cliente_comentario, t.updated_at,
  t.valor_lead_estimado, t.concierge_responsavel_id, t.motivo_perda_id,
  t.justificativa_perda, t.data_conclusao, t.data_entrada_etapa,
  p_concierge.nome, p_concierge.email, p_gestor.nome,
  mp.nome, mp.descricao;

COMMENT ON VIEW public.view_orcamentos_crm_com_checklist IS 
  'View consolidada de orçamentos CRM com checklist e tarefas usando data_entrada_etapa para cálculo correto de alertas';