-- Criar view orcamentos_crm simplificada usando apenas campos existentes

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
  
  -- CRM tracking - valores padrão já que campos não existem ainda
  'orcamento_postado'::etapa_crm_enum as etapa_crm,
  'sem_contato'::status_contato_enum as status_contato,
  NULL::text as observacoes_internas,
  NULL::integer as feedback_cliente_nota,
  NULL::text as feedback_cliente_comentario,
  o.updated_at as ultima_atualizacao,
  NULL::numeric as valor_lead_estimado,
  
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
  NULL::timestamp with time zone as data_conclusao,
  NULL::text as motivo_perda_nome,
  NULL::text as motivo_perda_descricao,
  
  -- Data de entrada na etapa atual
  o.created_at as data_entrada_etapa

FROM public.orcamentos o
LEFT JOIN public.profiles pg ON pg.id = o.gestor_conta_id
LEFT JOIN public.candidaturas_fornecedores cf ON cf.orcamento_id = o.id
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
  o.gestor_conta_id,
  pg.nome;