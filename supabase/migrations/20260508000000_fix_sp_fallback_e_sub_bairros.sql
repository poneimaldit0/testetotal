-- Fix: fallback city-level São Paulo + sub-bairros de Jabaquara
-- Sem este entry, bairros como "Vila Parque Jabaquara" caíam no JSON nacional
-- e recebiam classificação Premium A+ (ibge 3550308 = prime), o que é incorreto.

-- 1. Fallback city-level São Paulo (B+)
-- Qualquer bairro SP não mapeado explicitamente no banco recebe B+ como padrão seguro,
-- em vez de herdar o tier "prime" do JSON nacional.
INSERT INTO regioes_estrategicas
  (cidade, bairro, estado, classificacao, potencial, zona, status_regiao, descricao, faixa_valor_min, faixa_valor_max)
VALUES
  ('São Paulo', NULL, 'SP', 'B+', 'médio', 'capital', 'ativa',
   'Bairro de São Paulo não mapeado individualmente. Classificação padrão para capital — qualifique o perfil do cliente antes de iniciar cadência.',
   50000, 80000);

-- 2. Sub-bairros de Jabaquara mapeados explicitamente
-- ViaCEP retorna nomes compostos; sem esses entries o match nunca acontece.
INSERT INTO regioes_estrategicas
  (cidade, bairro, estado, classificacao, potencial, zona, status_regiao, descricao, faixa_valor_min, faixa_valor_max)
VALUES
  ('São Paulo', 'Vila Parque Jabaquara', 'SP', 'B+', 'médio', 'capital', 'ativa',
   'Região de classe média consolidada com demanda crescente por reformas. Ticket entre R$50k e R$80k. Volume bom com abordagem adequada ao perfil.',
   50000, 80000),

  ('São Paulo', 'Jardim Jabaquara',      'SP', 'B+', 'médio', 'capital', 'ativa',
   'Região de classe média consolidada com demanda crescente por reformas. Ticket entre R$50k e R$80k. Volume bom com abordagem adequada ao perfil.',
   50000, 80000),

  ('São Paulo', 'Vila Guarani',          'SP', 'B', 'baixo', 'capital', 'ativa',
   'Região em monitoramento com potencial emergente. Ticket entre R$30k e R$50k. Qualificação cuidadosa recomendada.',
   30000, 50000);
