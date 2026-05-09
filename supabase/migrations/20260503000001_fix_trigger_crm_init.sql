-- ================================================
-- FIX: Trigger de inicialização CRM
-- Problema: trigger usava SELECT VOID INTO JSONB (erro silencioso)
-- Fix: usar PERFORM para funções VOID
-- ================================================

CREATE OR REPLACE FUNCTION trigger_inicializar_orcamento_crm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_concierge_id uuid;
BEGIN
  v_concierge_id := NEW.gestor_conta_id;

  IF v_concierge_id IS NULL THEN
    SELECT id INTO v_concierge_id
    FROM profiles
    WHERE tipo_usuario IN ('admin', 'master')
      AND status = 'ativo'
    LIMIT 1;
  END IF;

  IF v_concierge_id IS NULL THEN
    v_concierge_id := auth.uid();
  END IF;

  BEGIN
    -- PERFORM é o modo correto para chamar funções VOID em PL/pgSQL
    PERFORM inicializar_orcamento_crm(NEW.id, v_concierge_id);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Falha ao inicializar orcamento % no CRM: %', NEW.id, SQLERRM;
      INSERT INTO logs_acesso (user_id, acao)
      VALUES (auth.uid(), 'ERRO_TRIGGER_CRM: ' || NEW.id::text || ' - ' || SQLERRM);
  END;

  RETURN NEW;
END;
$$;

-- ================================================
-- FIX: view_orcamentos_crm_com_checklist
-- COALESCE em etapa_crm para tratar leads órfãos
-- (sem linha em orcamentos_crm_tracking) como 'orcamento_postado'
-- ================================================

DROP VIEW IF EXISTS view_orcamentos_crm_com_checklist CASCADE;

CREATE VIEW view_orcamentos_crm_com_checklist AS
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
    -- Tratar leads sem tracking como 'orcamento_postado'
    COALESCE(oct.etapa_crm::text, 'orcamento_postado') AS etapa_crm,
    oct.data_entrada_etapa,
    EXTRACT(day FROM now() - oct.data_entrada_etapa)::integer AS tempo_na_etapa_dias,
    oct.concierge_responsavel_id,
    oct.status_contato,
    oct.valor_lead_estimado,
    oct.motivo_perda_id,
    oct.data_conclusao,
    oct.justificativa_perda,
    COALESCE(oct.congelado, FALSE) AS congelado,
    oct.data_congelamento,
    oct.data_reativacao_prevista,
    oct.motivo_congelamento,
    (SELECT n.id FROM crm_notas_orcamentos n WHERE n.orcamento_id = o.id ORDER BY n.created_at DESC LIMIT 1) AS ultima_nota_id,
    (SELECT n.conteudo FROM crm_notas_orcamentos n WHERE n.orcamento_id = o.id ORDER BY n.created_at DESC LIMIT 1) AS ultima_nota_conteudo,
    (SELECT n.criado_por_nome FROM crm_notas_orcamentos n WHERE n.orcamento_id = o.id ORDER BY n.created_at DESC LIMIT 1) AS ultima_nota_autor,
    (SELECT n.created_at FROM crm_notas_orcamentos n WHERE n.orcamento_id = o.id ORDER BY n.created_at DESC LIMIT 1) AS ultima_nota_data,
    p.nome AS concierge_nome,
    p.email AS concierge_email,
    mp.nome AS motivo_perda_nome,
    mp.descricao AS motivo_perda_descricao,
    COALESCE(count(DISTINCT ccp.id), 0::bigint)::integer AS total_itens_checklist,
    COALESCE(count(DISTINCT ccp.id) FILTER (WHERE ccp.concluido = true), 0::bigint)::integer AS itens_checklist_concluidos,
    COALESCE(count(DISTINCT ccp.id) FILTER (WHERE ccp.concluido = false), 0::bigint)::integer AS checklist_pendentes,
    CASE
      WHEN COALESCE(oct.congelado, FALSE) = TRUE THEN FALSE
      ELSE (EXISTS (
        SELECT 1
        FROM crm_checklist_progresso ccp2
        JOIN crm_checklist_etapas cce ON cce.id = ccp2.item_checklist_id
        WHERE ccp2.orcamento_id = o.id
          AND ccp2.concluido = false
          AND cce.etapa_crm = oct.etapa_crm
          AND oct.etapa_crm NOT IN ('ganho', 'perdido')
          AND (now() - ccp2.created_at) >= (cce.dias_para_alerta::double precision * '1 day'::interval)
      ))
    END AS tem_alertas,
    COALESCE(count(DISTINCT t.id), 0::bigint)::integer AS total_tarefas,
    COALESCE(count(DISTINCT t.id) FILTER (WHERE t.concluida = true), 0::bigint)::integer AS tarefas_concluidas,
    CASE
      WHEN COALESCE(oct.congelado, FALSE) = TRUE THEN 0
      ELSE COALESCE(count(DISTINCT t.id) FILTER (WHERE t.concluida = false AND t.data_vencimento < CURRENT_DATE), 0::bigint)::integer
    END AS tarefas_atrasadas,
    CASE
      WHEN COALESCE(oct.congelado, FALSE) = TRUE THEN 0
      ELSE COALESCE(count(DISTINCT t.id) FILTER (WHERE t.concluida = false AND t.data_vencimento = CURRENT_DATE), 0::bigint)::integer
    END AS tarefas_hoje,
    COALESCE(count(DISTINCT cf.id) FILTER (WHERE cf.data_desistencia IS NULL), 0::bigint)::integer AS fornecedores_inscritos_count,
    COALESCE(count(DISTINCT cf.id) FILTER (WHERE cf.proposta_enviada = true AND cf.data_desistencia IS NULL), 0::bigint)::integer AS propostas_enviadas_count,
    COALESCE(
      jsonb_agg(DISTINCT jsonb_build_object('id', ot.tag_id, 'nome', ct.nome, 'cor', ct.cor))
      FILTER (WHERE ot.tag_id IS NOT NULL),
      '[]'::jsonb
    ) AS tags,
    CASE
      WHEN count(DISTINCT ccp.id) = 0 THEN 0
      ELSE ROUND((count(DISTINCT ccp.id) FILTER (WHERE ccp.concluido = true)::numeric / count(DISTINCT ccp.id)::numeric) * 100)::integer
    END AS percentual_checklist_concluido
FROM orcamentos o
LEFT JOIN orcamentos_crm_tracking oct ON oct.orcamento_id = o.id
LEFT JOIN profiles p ON p.id = oct.concierge_responsavel_id
LEFT JOIN motivos_perda_crm mp ON mp.id = oct.motivo_perda_id
LEFT JOIN crm_checklist_progresso ccp ON ccp.orcamento_id = o.id
LEFT JOIN crm_orcamentos_tarefas t ON t.orcamento_id = o.id
LEFT JOIN candidaturas_fornecedores cf ON cf.orcamento_id = o.id
LEFT JOIN crm_orcamentos_tags ot ON ot.orcamento_id = o.id
LEFT JOIN crm_tags ct ON ct.id = ot.tag_id
GROUP BY
    o.id,
    oct.etapa_crm,
    oct.data_entrada_etapa,
    oct.concierge_responsavel_id,
    oct.status_contato,
    oct.valor_lead_estimado,
    oct.motivo_perda_id,
    oct.data_conclusao,
    oct.justificativa_perda,
    oct.congelado,
    oct.data_congelamento,
    oct.data_reativacao_prevista,
    oct.motivo_congelamento,
    p.nome,
    p.email,
    mp.nome,
    mp.descricao;
