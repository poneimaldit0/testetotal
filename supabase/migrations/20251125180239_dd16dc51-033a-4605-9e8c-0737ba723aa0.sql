-- Recriar a view de produtividade incluindo tarefas concluídas
DROP VIEW IF EXISTS vw_produtividade_checklist_diaria;

CREATE VIEW vw_produtividade_checklist_diaria AS
-- Checklist de Orçamentos
SELECT 
  date(data_conclusao) AS data,
  concluido_por_id AS usuario_id,
  concluido_por_nome AS nome,
  'orcamentos'::text AS tipo_crm,
  count(*) AS itens_concluidos
FROM crm_checklist_progresso
WHERE concluido = true 
  AND concluido_por_id IS NOT NULL 
  AND data_conclusao IS NOT NULL
GROUP BY date(data_conclusao), concluido_por_id, concluido_por_nome

UNION ALL

-- Checklist de Marcenaria
SELECT 
  date(data_conclusao) AS data,
  concluido_por_id AS usuario_id,
  concluido_por_nome AS nome,
  'marcenaria'::text AS tipo_crm,
  count(*) AS itens_concluidos
FROM crm_marcenaria_checklist_progresso
WHERE concluido = true 
  AND concluido_por_id IS NOT NULL 
  AND data_conclusao IS NOT NULL
GROUP BY date(data_conclusao), concluido_por_id, concluido_por_nome

UNION ALL

-- Tarefas de Orçamentos
SELECT 
  date(data_conclusao) AS data,
  concluida_por_id AS usuario_id,
  concluida_por_nome AS nome,
  'orcamentos'::text AS tipo_crm,
  count(*) AS itens_concluidos
FROM crm_orcamentos_tarefas
WHERE concluida = true 
  AND concluida_por_id IS NOT NULL 
  AND data_conclusao IS NOT NULL
GROUP BY date(data_conclusao), concluida_por_id, concluida_por_nome

UNION ALL

-- Tarefas de Marcenaria
SELECT 
  date(data_conclusao) AS data,
  concluida_por_id AS usuario_id,
  concluida_por_nome AS nome,
  'marcenaria'::text AS tipo_crm,
  count(*) AS itens_concluidos
FROM crm_marcenaria_tarefas
WHERE concluida = true 
  AND concluida_por_id IS NOT NULL 
  AND data_conclusao IS NOT NULL
GROUP BY date(data_conclusao), concluida_por_id, concluida_por_nome;