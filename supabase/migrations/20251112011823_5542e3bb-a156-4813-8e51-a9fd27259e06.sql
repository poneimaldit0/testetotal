-- Dropar a view atual com CASCADE
DROP VIEW IF EXISTS view_orcamentos_crm_com_checklist CASCADE;

-- Recriar a view com a regra de desconsiderar alertas em etapas arquivadas (ganho/perdido)
CREATE OR REPLACE VIEW view_orcamentos_crm_com_checklist AS
SELECT 
    o.id,
    o.usuario_id,
    o.necessidade,
    o.categorias,
    o.local,
    o.tamanho_imovel,
    o.data_inicio,
    o.data_publicacao,
    o.status,
    o.quantidade_empresas,
    o.dados_contato,
    o.created_at,
    o.updated_at,
    o.codigo_orcamento,
    o.prazo_inicio_texto,
    o.gestor_conta_id,
    o.prazo_envio_proposta_dias,
    o.prazo_explicitamente_definido,
    o.budget_informado,
    oct.etapa_crm,
    oct.status_contato,
    oct.observacoes_internas,
    oct.feedback_cliente_nota,
    oct.feedback_cliente_comentario,
    oct.concierge_responsavel_id,
    oct.valor_lead_estimado,
    oct.motivo_perda_id,
    oct.justificativa_perda,
    oct.data_conclusao,
    mp.nome AS motivo_perda_nome,
    p.nome AS concierge_nome,
    p.email AS concierge_email,
    ultima_nota.id AS ultima_nota_id,
    ultima_nota.conteudo AS ultima_nota_conteudo,
    ultima_nota.criado_por_nome AS ultima_nota_autor,
    ultima_nota.created_at AS ultima_nota_data,
    COALESCE(tags_agg.tags, '[]'::jsonb) as tags,
    COALESCE(count(DISTINCT cf.id) FILTER (WHERE cf.data_desistencia IS NULL), 0::bigint)::integer AS fornecedores_inscritos_count,
    COALESCE(count(DISTINCT cp.id) FILTER (WHERE cp.status = 'aprovado'::text), 0::bigint)::integer AS propostas_enviadas_count,
    COALESCE(count(DISTINCT ccc.id), 0::bigint)::integer AS total_itens_checklist,
    COALESCE(count(DISTINCT ccc.id) FILTER (WHERE ccc.concluido = true), 0::bigint)::integer AS itens_checklist_concluidos,
    COALESCE(count(DISTINCT ccc.id) FILTER (WHERE ccc.concluido = false), 0::bigint)::integer AS checklist_pendentes,
    -- CORREÇÃO: Desconsiderar alertas quando etapa_crm é 'ganho' ou 'perdido'
    (EXISTS ( SELECT 1
           FROM crm_checklist_progresso ccp
             JOIN crm_checklist_etapas cce ON cce.id = ccp.item_checklist_id
          WHERE ccp.orcamento_id = o.id 
            AND ccp.concluido = false 
            AND cce.etapa_crm = oct.etapa_crm 
            AND oct.etapa_crm NOT IN ('ganho', 'perdido')
            AND (now() - ccp.created_at) >= (cce.dias_para_alerta::double precision * '1 day'::interval))) AS tem_alertas,
    COALESCE(EXTRACT(day FROM now() - oct.updated_at)::integer, 0) AS tempo_na_etapa_dias,
    COALESCE(count(DISTINCT t.id), 0::bigint)::integer AS total_tarefas,
    COALESCE(count(DISTINCT t.id) FILTER (WHERE t.concluida = true), 0::bigint)::integer AS tarefas_concluidas,
    COALESCE(count(DISTINCT t.id) FILTER (WHERE t.concluida = false AND t.data_vencimento < CURRENT_DATE), 0::bigint)::integer AS tarefas_atrasadas,
    COALESCE(count(DISTINCT t.id) FILTER (WHERE t.concluida = false AND t.data_vencimento = CURRENT_DATE), 0::bigint)::integer AS tarefas_hoje,
    COALESCE(count(DISTINCT n.id), 0::bigint)::integer AS total_notas
FROM orcamentos o
LEFT JOIN orcamentos_crm_tracking oct ON oct.orcamento_id = o.id
LEFT JOIN candidaturas_fornecedores cf ON cf.orcamento_id = o.id
LEFT JOIN checklist_propostas cp ON cp.candidatura_id = cf.id
LEFT JOIN profiles p ON p.id = oct.concierge_responsavel_id
LEFT JOIN motivos_perda_crm mp ON mp.id = oct.motivo_perda_id
LEFT JOIN crm_checklist_progresso ccc ON ccc.orcamento_id = o.id
LEFT JOIN crm_orcamentos_tarefas t ON t.orcamento_id = o.id
LEFT JOIN crm_notas_orcamentos n ON n.orcamento_id = o.id
LEFT JOIN LATERAL (
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', tags.id,
            'nome', tags.nome,
            'cor', tags.cor
        ) ORDER BY tags.nome
    ) as tags
    FROM crm_orcamentos_tags ot
    INNER JOIN crm_tags tags ON tags.id = ot.tag_id
    WHERE ot.orcamento_id = o.id AND tags.ativo = true
) tags_agg ON true
LEFT JOIN LATERAL ( 
    SELECT crm_notas_orcamentos.id,
        crm_notas_orcamentos.conteudo,
        crm_notas_orcamentos.criado_por_nome,
        crm_notas_orcamentos.created_at
    FROM crm_notas_orcamentos
    WHERE crm_notas_orcamentos.orcamento_id = o.id
    ORDER BY crm_notas_orcamentos.created_at DESC
    LIMIT 1
) ultima_nota ON true
WHERE oct.id IS NOT NULL
GROUP BY 
    o.id, 
    oct.etapa_crm, 
    oct.status_contato, 
    oct.observacoes_internas, 
    oct.feedback_cliente_nota, 
    oct.feedback_cliente_comentario, 
    oct.concierge_responsavel_id, 
    oct.valor_lead_estimado, 
    oct.motivo_perda_id, 
    oct.justificativa_perda, 
    oct.data_conclusao, 
    oct.updated_at, 
    mp.nome, 
    p.nome, 
    p.email, 
    ultima_nota.id, 
    ultima_nota.conteudo, 
    ultima_nota.criado_por_nome, 
    ultima_nota.created_at,
    tags_agg.tags;

-- Garantir permissões
GRANT SELECT ON view_orcamentos_crm_com_checklist TO authenticated;
GRANT SELECT ON view_orcamentos_crm_com_checklist TO anon;