-- Criar view otimizada para fornecedores únicos do CRM
-- Esta view melhora significativamente a performance ao calcular no servidor
CREATE OR REPLACE VIEW view_fornecedores_unicos_crm AS
SELECT DISTINCT ON (fornecedor_id)
  fornecedor_id,
  nome,
  empresa,
  email
FROM candidaturas_fornecedores
WHERE data_desistencia IS NULL
ORDER BY fornecedor_id, nome;

-- Adicionar comentário explicativo
COMMENT ON VIEW view_fornecedores_unicos_crm IS 'View otimizada que retorna fornecedores únicos ativos no CRM, evitando processamento client-side';