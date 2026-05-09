-- Alterar constraint para incluir 'transferencia'
ALTER TABLE orcamentos_crm_historico DROP CONSTRAINT orcamentos_crm_historico_tipo_check;
ALTER TABLE orcamentos_crm_historico ADD CONSTRAINT orcamentos_crm_historico_tipo_check 
  CHECK (tipo_movimentacao = ANY (ARRAY['manual'::text, 'automatica'::text, 'transferencia'::text]));

-- Transferência Cristine → Joeberte
INSERT INTO orcamentos_crm_historico (orcamento_id, etapa_anterior, etapa_nova, movido_por_id, movido_por_nome, observacao, tipo_movimentacao, data_movimentacao)
SELECT oct.orcamento_id, oct.etapa_crm, oct.etapa_crm, 
  '3c19d4fb-0e1c-4aef-ace9-656a6dadc71e', 'Sistema',
  'Transferência de gestor: Cristine Carvalho → Joeberte Vitor',
  'transferencia', '2026-03-17 13:43:49+00'
FROM orcamentos_crm_tracking oct
JOIN orcamentos o ON o.id = oct.orcamento_id
WHERE o.gestor_conta_id = '3c19d4fb-0e1c-4aef-ace9-656a6dadc71e'
AND o.updated_at < '2026-03-23 00:00:00+00';

-- Transferência Fabiana → Joeberte
INSERT INTO orcamentos_crm_historico (orcamento_id, etapa_anterior, etapa_nova, movido_por_id, movido_por_nome, observacao, tipo_movimentacao, data_movimentacao)
SELECT oct.orcamento_id, oct.etapa_crm, oct.etapa_crm, 
  '3c19d4fb-0e1c-4aef-ace9-656a6dadc71e', 'Sistema',
  'Transferência de gestor: Fabiana Nunes → Joeberte Vitor',
  'transferencia', '2026-03-23 12:32:23+00'
FROM orcamentos_crm_tracking oct
JOIN orcamentos o ON o.id = oct.orcamento_id
WHERE o.gestor_conta_id = '3c19d4fb-0e1c-4aef-ace9-656a6dadc71e'
AND o.updated_at >= '2026-03-23 00:00:00+00';