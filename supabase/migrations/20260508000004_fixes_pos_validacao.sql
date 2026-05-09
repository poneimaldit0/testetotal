-- Fixes pos-validacao de CEPs reais no SDR
--
-- 1. Guarulhos: adicionar fallback city-level (bairro IS NULL)
--    Motivo: Guarulhos tem 8 bairros mapeados mas nenhum catch-all.
--    CEPs nao mapeados caem direto no json_nacional sem classificacao local.
--    Conservador: B (maioria dos bairros de Guarulhos e popular/medio).
--
-- 2. "Jardim Maia" renomeado para "Vila Galvão" + "Jardim Tranquilidade"
--    Motivo: ViaCEP retorna "Jardim Tranqüilidade" e "Jardim Vila Galvão"
--    para os CEPs da regiao de Jardim Maia em Guarulhos.
--    O nome "Jardim Maia" nunca foi retornado por ViaCEP nos testes.

-- ── 1. Fallback city-level Guarulhos ─────────────────────────────────────────
INSERT INTO regioes_estrategicas
  (cidade, bairro, estado, classificacao, potencial, zona, status_regiao, descricao, faixa_valor_min, faixa_valor_max)
SELECT 'Guarulhos', NULL, 'SP', 'B', 'baixo', 'metropolitana', 'ativa',
       'Bairro de Guarulhos não mapeado individualmente. Classificação conservadora — maioria dos bairros é popular/médio. Qualifique orçamento antes de cadência.',
       25000, 50000
WHERE NOT EXISTS (
  SELECT 1 FROM regioes_estrategicas
  WHERE cidade = 'Guarulhos' AND bairro IS NULL AND estado = 'SP'
);

-- ── 2. Adicionar nomes reais retornados pelo ViaCEP para a area de Jardim Maia
--    Mantemos "Jardim Maia" no banco (pode bater via rua/logradouro em alguns CEPs)
--    e adicionamos os nomes que o ViaCEP realmente retorna na regiao.
INSERT INTO regioes_estrategicas
  (cidade, bairro, estado, classificacao, potencial, zona, status_regiao, descricao, faixa_valor_min, faixa_valor_max)
VALUES
  ('Guarulhos', 'Jardim Tranqüilidade', 'SP', 'B+', 'médio', 'metropolitana', 'ativa',
   'Bairro residencial de médio padrão em Guarulhos. B+ é o teto realista para Grande SP periférica. Qualificação de orçamento obrigatória.',
   50000, 80000),

  ('Guarulhos', 'Jardim Vila Galvão', 'SP', 'B+', 'médio', 'metropolitana', 'ativa',
   'Bairro residencial de médio padrão em Guarulhos. B+ é o teto realista para Grande SP periférica. Qualificação de orçamento obrigatória.',
   50000, 80000)
ON CONFLICT DO NOTHING;
