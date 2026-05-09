-- Remover etapa 'fornecedores_inscritos' do enum etapa_crm_enum
-- Data: 2025-10-22
-- Justificativa: Simplificação do funil CRM - etapa redundante

-- Passo 1: Remover a view temporariamente
DROP VIEW IF EXISTS view_orcamentos_crm;

-- Passo 2: Migrar dados existentes no histórico
-- Mudar etapa_anterior de 'fornecedores_inscritos' para 'orcamento_postado'
UPDATE public.orcamentos_crm_historico
SET etapa_anterior = 'orcamento_postado'::etapa_crm_enum
WHERE etapa_anterior = 'fornecedores_inscritos'::etapa_crm_enum;

-- Mudar etapa_nova de 'fornecedores_inscritos' para 'contato_agendamento'
UPDATE public.orcamentos_crm_historico
SET etapa_nova = 'contato_agendamento'::etapa_crm_enum
WHERE etapa_nova = 'fornecedores_inscritos'::etapa_crm_enum;

-- Passo 3: Remover defaults temporariamente
ALTER TABLE public.orcamentos_crm_tracking 
  ALTER COLUMN etapa_crm DROP DEFAULT;

-- Passo 4: Renomear enum existente
ALTER TYPE etapa_crm_enum RENAME TO etapa_crm_enum_old;

-- Passo 5: Criar novo enum sem 'fornecedores_inscritos'
CREATE TYPE etapa_crm_enum AS ENUM (
  'orcamento_postado',
  'contato_agendamento',
  'em_orcamento',
  'propostas_enviadas',
  'compatibilizacao',
  'fechamento_contrato',
  'pos_venda_feedback'
);

-- Passo 6: Atualizar coluna na tabela orcamentos_crm_tracking
ALTER TABLE public.orcamentos_crm_tracking 
  ALTER COLUMN etapa_crm TYPE etapa_crm_enum 
  USING etapa_crm::text::etapa_crm_enum;

-- Passo 7: Atualizar colunas na tabela orcamentos_crm_historico
ALTER TABLE public.orcamentos_crm_historico 
  ALTER COLUMN etapa_anterior TYPE etapa_crm_enum 
  USING etapa_anterior::text::etapa_crm_enum;

ALTER TABLE public.orcamentos_crm_historico 
  ALTER COLUMN etapa_nova TYPE etapa_crm_enum 
  USING etapa_nova::text::etapa_crm_enum;

-- Passo 8: Restaurar default
ALTER TABLE public.orcamentos_crm_tracking 
  ALTER COLUMN etapa_crm SET DEFAULT 'orcamento_postado'::etapa_crm_enum;

-- Passo 9: Remover enum antigo
DROP TYPE etapa_crm_enum_old;

-- Passo 10: Recriar a view
CREATE OR REPLACE VIEW view_orcamentos_crm AS
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
  crm.etapa_crm::text AS etapa_crm,
  crm.status_contato::text AS status_contato,
  crm.observacoes_internas,
  crm.feedback_cliente_nota,
  crm.feedback_cliente_comentario,
  crm.updated_at AS ultima_atualizacao,
  crm.concierge_responsavel_id,
  p_concierge.nome AS concierge_nome,
  p_concierge.email AS concierge_email,
  o.gestor_conta_id,
  p_gestor.nome AS gestor_nome,
  (SELECT COUNT(*)::integer 
   FROM candidaturas_fornecedores cf
   WHERE cf.orcamento_id = o.id AND cf.data_desistencia IS NULL) AS fornecedores_inscritos_count,
  (SELECT COUNT(*)::integer 
   FROM checklist_propostas cp
   JOIN candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
   WHERE cf.orcamento_id = o.id AND cp.status IN ('enviado', 'em_revisao', 'aprovado', 'finalizada')) AS propostas_enviadas_count
FROM orcamentos o
LEFT JOIN orcamentos_crm_tracking crm ON o.id = crm.orcamento_id
LEFT JOIN profiles p_concierge ON crm.concierge_responsavel_id = p_concierge.id
LEFT JOIN profiles p_gestor ON o.gestor_conta_id = p_gestor.id
WHERE can_manage_orcamentos();

-- Adicionar comentário explicativo
COMMENT ON TYPE etapa_crm_enum IS 'Etapas do funil de vendas CRM - Removida etapa fornecedores_inscritos em 2025-10-22 para simplificar o processo';