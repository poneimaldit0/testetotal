-- ================================================
-- MIGRAÇÃO: Sistema de Congelamento de Leads CRM
-- ================================================

-- 1. Adicionar colunas de congelamento na tabela de tracking
ALTER TABLE orcamentos_crm_tracking
ADD COLUMN IF NOT EXISTS congelado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS data_congelamento TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS data_reativacao_prevista DATE,
ADD COLUMN IF NOT EXISTS motivo_congelamento TEXT;

-- 2. Adicionar novo tipo de notificação
ALTER TABLE notificacoes_sistema 
DROP CONSTRAINT IF EXISTS notificacoes_sistema_tipo_check;

ALTER TABLE notificacoes_sistema 
ADD CONSTRAINT notificacoes_sistema_tipo_check 
CHECK (tipo IN (
  'proposta_aceita', 'revisao_solicitada', 'revisao_concluida', 
  'contrato_enviado', 'medicao_solicitada', 'cronograma_atualizado',
  'cronograma_aprovado', 'crm_movimentacao_automatica', 
  'crm_atividade_orcamento_arquivado',
  'crm_reativacao_orcamento'
));

-- 3. Recriar a view com suporte a congelamento
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
    oct.etapa_crm,
    oct.data_entrada_etapa,
    EXTRACT(day FROM now() - oct.data_entrada_etapa)::integer AS tempo_na_etapa_dias,
    oct.concierge_responsavel_id,
    oct.status_contato,
    oct.valor_lead_estimado,
    oct.motivo_perda_id,
    oct.data_conclusao,
    oct.justificativa_perda,
    -- Campos de congelamento
    COALESCE(oct.congelado, FALSE) AS congelado,
    oct.data_congelamento,
    oct.data_reativacao_prevista,
    oct.motivo_congelamento,
    -- Última nota
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
    -- Se congelado, não mostra alertas
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
    -- Campos de tarefas
    COALESCE(count(DISTINCT t.id), 0::bigint)::integer AS total_tarefas,
    COALESCE(count(DISTINCT t.id) FILTER (WHERE t.concluida = true), 0::bigint)::integer AS tarefas_concluidas,
    -- Se congelado, não conta tarefas atrasadas
    CASE 
      WHEN COALESCE(oct.congelado, FALSE) = TRUE THEN 0
      ELSE COALESCE(count(DISTINCT t.id) FILTER (WHERE t.concluida = false AND t.data_vencimento < CURRENT_DATE), 0::bigint)::integer
    END AS tarefas_atrasadas,
    -- Se congelado, não conta tarefas para hoje
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
    -- Calcular percentual de checklist concluído
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

-- 4. Criar função para reativar orçamentos congelados
CREATE OR REPLACE FUNCTION reativar_orcamentos_congelados()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN 
    SELECT oct.orcamento_id, oct.concierge_responsavel_id, o.codigo_orcamento, o.dados_contato
    FROM orcamentos_crm_tracking oct
    JOIN orcamentos o ON o.id = oct.orcamento_id
    WHERE oct.congelado = TRUE 
      AND oct.data_reativacao_prevista <= CURRENT_DATE
  LOOP
    -- Descongelar o orçamento
    UPDATE orcamentos_crm_tracking
    SET congelado = FALSE,
        data_congelamento = NULL,
        data_reativacao_prevista = NULL,
        motivo_congelamento = NULL,
        updated_at = NOW()
    WHERE orcamento_id = rec.orcamento_id;
    
    -- Notificar o concierge responsável
    IF rec.concierge_responsavel_id IS NOT NULL THEN
      INSERT INTO notificacoes_sistema (
        destinatario_id,
        tipo,
        titulo,
        mensagem,
        referencia_id,
        referencia_tipo,
        lida,
        created_at
      ) VALUES (
        rec.concierge_responsavel_id,
        'crm_reativacao_orcamento',
        '🔔 Lead Reativado',
        FORMAT('O orçamento #%s de %s foi reativado automaticamente e está pronto para retomar o atendimento.', 
               COALESCE(rec.codigo_orcamento, LEFT(rec.orcamento_id::text, 8)),
               COALESCE((rec.dados_contato->>'nome')::text, 'Cliente')),
        rec.orcamento_id,
        'orcamento_crm',
        FALSE,
        NOW()
      );
    END IF;
  END LOOP;
END;
$$;

-- 5. Criar índice para otimizar busca de congelados
CREATE INDEX IF NOT EXISTS idx_orcamentos_tracking_congelado 
ON orcamentos_crm_tracking(congelado, data_reativacao_prevista) 
WHERE congelado = TRUE;