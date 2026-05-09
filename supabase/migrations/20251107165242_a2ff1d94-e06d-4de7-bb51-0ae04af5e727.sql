-- Atualizar view orcamentos_crm para identificar ganhos e perdidos corretamente

DROP VIEW IF EXISTS public.orcamentos_crm;

CREATE OR REPLACE VIEW public.orcamentos_crm AS
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
  
  -- CRM tracking - determinar etapa baseado no status e contratos
  CASE 
    -- Se tem contrato, é ganho
    WHEN COUNT(DISTINCT c.id) > 0 THEN 'ganho'::etapa_crm_enum
    -- Se está fechado mas não tem contrato, é perdido
    WHEN o.status = 'fechado' AND COUNT(DISTINCT c.id) = 0 THEN 'perdido'::etapa_crm_enum
    -- Se tem propostas enviadas, está em propostas_enviadas
    WHEN COUNT(DISTINCT cf.id) FILTER (WHERE cf.proposta_enviada = true) > 0 THEN 'propostas_enviadas'::etapa_crm_enum
    -- Se tem inscrições mas sem propostas, está em em_orcamento
    WHEN COUNT(DISTINCT cf.id) > 0 THEN 'em_orcamento'::etapa_crm_enum
    -- Caso padrão: orcamento_postado
    ELSE 'orcamento_postado'::etapa_crm_enum
  END as etapa_crm,
  
  'sem_contato'::status_contato_enum as status_contato,
  NULL::text as observacoes_internas,
  NULL::integer as feedback_cliente_nota,
  NULL::text as feedback_cliente_comentario,
  o.updated_at as ultima_atualizacao,
  
  -- Estimar valor do lead baseado em contratos
  COALESCE(MAX(c.valor_contrato), 0) as valor_lead_estimado,
  
  -- Responsáveis
  NULL::uuid as concierge_responsavel_id,
  NULL::text as concierge_nome,
  NULL::text as concierge_email,
  o.gestor_conta_id,
  pg.nome as gestor_nome,
  
  -- Contadores
  COUNT(DISTINCT cf.id) FILTER (WHERE cf.data_desistencia IS NULL) as fornecedores_inscritos_count,
  COUNT(DISTINCT cf.id) FILTER (WHERE cf.proposta_enviada = true) as propostas_enviadas_count,
  
  -- Campos de conclusão
  NULL::uuid as motivo_perda_id,
  NULL::text as justificativa_perda,
  CASE 
    WHEN o.status = 'fechado' OR COUNT(DISTINCT c.id) > 0 THEN o.updated_at
    ELSE NULL
  END as data_conclusao,
  NULL::text as motivo_perda_nome,
  NULL::text as motivo_perda_descricao,
  
  -- Data de entrada na etapa atual
  o.created_at as data_entrada_etapa

FROM public.orcamentos o
LEFT JOIN public.profiles pg ON pg.id = o.gestor_conta_id
LEFT JOIN public.candidaturas_fornecedores cf ON cf.orcamento_id = o.id
LEFT JOIN public.contratos c ON c.orcamento_id = o.id
GROUP BY 
  o.id,
  o.codigo_orcamento,
  o.necessidade,
  o.local,
  o.categorias,
  o.tamanho_imovel,
  o.dados_contato,
  o.data_publicacao,
  o.created_at,
  o.updated_at,
  o.status,
  o.gestor_conta_id,
  pg.nome;