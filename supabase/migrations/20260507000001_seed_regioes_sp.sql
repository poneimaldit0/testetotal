-- Seed: regiões estratégicas baseadas no KML reforma100_publicos_v3 + cidades de expansão
-- Fonte: KML São Paulo (bairros mapeados) + JSON nacional (cidades-chave)

INSERT INTO regioes_estrategicas
  (cidade, bairro, estado, classificacao, potencial, zona, status_regiao, descricao, faixa_valor_min, faixa_valor_max)
VALUES

-- ═══════════════════════════════════════════════════════════
-- PREMIUM A+ — Núcleo (São Paulo capital)
-- ═══════════════════════════════════════════════════════════
('São Paulo', 'Jardim Europa',       'SP', 'Premium A+', 'alto', 'capital', 'ativa',
 'Região de altíssimo padrão, com forte presença de imóveis de luxo, alto poder aquisitivo e alta propensão a reformas completas. Ticket médio acima de R$300k.',
 300000, NULL),

('São Paulo', 'Jardins',             'SP', 'Premium A+', 'alto', 'capital', 'ativa',
 'Região de altíssimo padrão, com forte presença de imóveis de luxo, alto poder aquisitivo e alta propensão a reformas completas. Ticket médio acima de R$300k.',
 300000, NULL),

('São Paulo', 'Vila Nova Conceição', 'SP', 'Premium A+', 'alto', 'capital', 'ativa',
 'Altíssimo padrão. Ticket médio R$6M por imóvel. Reformas completas de luxo com alto engajamento de projeto.',
 300000, NULL),

('São Paulo', 'Itaim Bibi',          'SP', 'Premium A+', 'alto', 'capital', 'ativa',
 'Região de altíssimo padrão, com forte presença de imóveis de luxo, alto poder aquisitivo e alta propensão a reformas completas. Ticket médio acima de R$300k.',
 300000, NULL),

('São Paulo', 'Vila Olímpia',        'SP', 'Premium A+', 'alto', 'capital', 'ativa',
 'Região de altíssimo padrão, com forte presença de imóveis de luxo, alto poder aquisitivo e alta propensão a reformas completas. Ticket médio acima de R$300k.',
 300000, NULL),

('São Paulo', 'Moema',               'SP', 'Premium A+', 'alto', 'capital', 'ativa',
 'Região de altíssimo padrão, com forte presença de imóveis de luxo, alto poder aquisitivo e alta propensão a reformas completas. Ticket médio acima de R$300k.',
 300000, NULL),

('São Paulo', 'Cidade Jardim',       'SP', 'Premium A+', 'alto', 'capital', 'ativa',
 'Região de altíssimo padrão, com forte presença de imóveis de luxo, alto poder aquisitivo e alta propensão a reformas completas. Ticket médio acima de R$300k.',
 300000, NULL),

('São Paulo', 'Alto de Pinheiros',   'SP', 'Premium A+', 'alto', 'capital', 'ativa',
 'Região de altíssimo padrão, com forte presença de imóveis de luxo, alto poder aquisitivo e alta propensão a reformas completas. Ticket médio acima de R$300k.',
 300000, NULL),

('São Paulo', 'Higienópolis',        'SP', 'Premium A+', 'alto', 'capital', 'ativa',
 'Região de altíssimo padrão, com forte presença de imóveis de luxo, alto poder aquisitivo e alta propensão a reformas completas. Ticket médio acima de R$300k.',
 300000, NULL),

('São Paulo', 'Vila Madalena',       'SP', 'Premium A+', 'alto', 'capital', 'ativa',
 'Região de altíssimo padrão, com forte presença de imóveis de luxo, alto poder aquisitivo e alta propensão a reformas completas. Ticket médio acima de R$300k.',
 300000, NULL),

-- PREMIUM A+ — Metropolitana
('Barueri',            'Alphaville', 'SP', 'Premium A+', 'alto', 'metropolitana', 'ativa',
 'Condomínio premium consolidado fora da capital. Alta renda, reformas completas e ticket equivalente ao núcleo paulistano.',
 250000, NULL),

('Santana de Parnaíba', 'Tamboré',   'SP', 'Premium A+', 'alto', 'metropolitana', 'ativa',
 'Condomínio premium consolidado fora da capital. Alta renda, reformas completas e ticket equivalente ao núcleo paulistano.',
 250000, NULL),

-- ═══════════════════════════════════════════════════════════
-- PREMIUM A — Alta Renda (São Paulo capital)
-- ═══════════════════════════════════════════════════════════
('São Paulo', 'Pinheiros',       'SP', 'Premium A', 'alto', 'capital', 'ativa',
 'Região de alta renda consolidada com demanda consistente por reformas de alto padrão. Ticket entre R$150k e R$300k.',
 150000, 300000),

('São Paulo', 'Pacaembu',        'SP', 'Premium A', 'alto', 'capital', 'ativa',
 'Região de alta renda consolidada com demanda consistente por reformas de alto padrão. Ticket entre R$150k e R$300k.',
 150000, 300000),

('São Paulo', 'Perdizes',        'SP', 'Premium A', 'alto', 'capital', 'ativa',
 'Região de alta renda consolidada com demanda consistente por reformas de alto padrão. Ticket entre R$150k e R$300k.',
 150000, 300000),

('São Paulo', 'Brooklin',        'SP', 'Premium A', 'alto', 'capital', 'ativa',
 'Região de alta renda consolidada com demanda consistente por reformas de alto padrão. Ticket entre R$150k e R$300k.',
 150000, 300000),

('São Paulo', 'Campo Belo',      'SP', 'Premium A', 'alto', 'capital', 'ativa',
 'Região de alta renda consolidada com demanda consistente por reformas de alto padrão. Ticket entre R$150k e R$300k.',
 150000, 300000),

('São Paulo', 'Chácara Flora',   'SP', 'Premium A', 'alto', 'capital', 'ativa',
 'Região de alta renda consolidada com demanda consistente por reformas de alto padrão. Ticket entre R$150k e R$300k.',
 150000, 300000),

('São Paulo', 'Granja Julieta',  'SP', 'Premium A', 'alto', 'capital', 'ativa',
 'Região de alta renda consolidada com demanda consistente por reformas de alto padrão. Ticket entre R$150k e R$300k.',
 150000, 300000),

('São Paulo', 'Panamby',         'SP', 'Premium A', 'alto', 'capital', 'ativa',
 'Região de alta renda consolidada com demanda consistente por reformas de alto padrão. Ticket entre R$150k e R$300k.',
 150000, 300000),

('São Paulo', 'Vila Leopoldina', 'SP', 'Premium A', 'alto', 'capital', 'ativa',
 'Região de alta renda consolidada com demanda consistente por reformas de alto padrão. Ticket entre R$150k e R$300k.',
 150000, 300000),

('São Paulo', 'Sumaré',          'SP', 'Premium A', 'alto', 'capital', 'ativa',
 'Região de alta renda consolidada com demanda consistente por reformas de alto padrão. Ticket entre R$150k e R$300k.',
 150000, 300000),

-- PREMIUM A — Metropolitana (nível cidade)
('São Caetano do Sul', NULL, 'SP', 'Premium A', 'alto', 'metropolitana', 'ativa',
 'Cidade com alto IDH e renda consolidada. Boa demanda por reformas de alto padrão. Ticket entre R$150k e R$250k.',
 150000, 250000),

-- ═══════════════════════════════════════════════════════════
-- A− — Média-Alta (São Paulo capital)
-- ═══════════════════════════════════════════════════════════
('São Paulo', 'Vila Mariana',        'SP', 'A-', 'médio', 'capital', 'ativa',
 'Região de média-alta renda com boa propensão a reformas de qualidade. Ticket entre R$80k e R$150k.',
 80000, 150000),

('São Paulo', 'Lapa',                'SP', 'A-', 'médio', 'capital', 'ativa',
 'Região de média-alta renda com boa propensão a reformas de qualidade. Ticket entre R$80k e R$150k.',
 80000, 150000),

('São Paulo', 'Pompéia',             'SP', 'A-', 'médio', 'capital', 'ativa',
 'Região de média-alta renda com boa propensão a reformas de qualidade. Ticket entre R$80k e R$150k.',
 80000, 150000),

('São Paulo', 'Butantã',             'SP', 'A-', 'médio', 'capital', 'ativa',
 'Região de média-alta renda com boa propensão a reformas de qualidade. Ticket entre R$80k e R$150k.',
 80000, 150000),

('São Paulo', 'Vila Andrade',        'SP', 'A-', 'médio', 'capital', 'ativa',
 'Região de média-alta renda com boa propensão a reformas de qualidade. Ticket entre R$80k e R$150k.',
 80000, 150000),

('São Paulo', 'Jardim Anália Franco','SP', 'A-', 'médio', 'capital', 'ativa',
 'Região de média-alta renda com boa propensão a reformas de qualidade. Ticket entre R$80k e R$150k.',
 80000, 150000),

('São Paulo', 'Santana',             'SP', 'A-', 'médio', 'capital', 'ativa',
 'Região de média-alta renda com boa propensão a reformas de qualidade. Ticket entre R$80k e R$150k.',
 80000, 150000),

('São Paulo', 'Chácara Klabin',      'SP', 'A-', 'médio', 'capital', 'ativa',
 'Região de média-alta renda com boa propensão a reformas de qualidade. Ticket entre R$80k e R$150k.',
 80000, 150000),

('São Paulo', 'Vila Formosa',        'SP', 'A-', 'médio', 'capital', 'ativa',
 'Região de média-alta renda com boa propensão a reformas de qualidade. Ticket entre R$80k e R$150k.',
 80000, 150000),

('São Paulo', 'Vila Clementino',     'SP', 'A-', 'médio', 'capital', 'ativa',
 'Região de média-alta renda com boa propensão a reformas de qualidade. Ticket entre R$80k e R$150k.',
 80000, 150000),

('São Paulo', 'Santa Cecília',       'SP', 'A-', 'médio', 'capital', 'ativa',
 'Região de média-alta renda com boa propensão a reformas de qualidade. Ticket entre R$80k e R$150k.',
 80000, 150000),

-- A− — Metropolitana
('Cotia',             'Granja Viana', 'SP', 'A-', 'médio', 'metropolitana', 'ativa',
 'Condomínios de médio-alto padrão na Grande São Paulo. Demanda consistente por reformas entre R$80k e R$150k.',
 80000, 150000),

('Santo André',       NULL,           'SP', 'A-', 'médio', 'metropolitana', 'ativa',
 'Grande ABC com boa renda média e demanda crescente por reformas. Ticket entre R$80k e R$150k.',
 80000, 150000),

-- ═══════════════════════════════════════════════════════════
-- B+ — Média Consolidada (São Paulo capital)
-- ═══════════════════════════════════════════════════════════
('São Paulo', 'Aclimação',       'SP', 'B+', 'médio', 'capital', 'ativa',
 'Região de classe média consolidada com demanda crescente por reformas. Ticket entre R$50k e R$80k.',
 50000, 80000),

('São Paulo', 'Saúde',           'SP', 'B+', 'médio', 'capital', 'ativa',
 'Região de classe média consolidada com demanda crescente por reformas. Ticket entre R$50k e R$80k.',
 50000, 80000),

('São Paulo', 'Ipiranga',        'SP', 'B+', 'médio', 'capital', 'ativa',
 'Região de classe média consolidada com demanda crescente por reformas. Ticket entre R$50k e R$80k.',
 50000, 80000),

('São Paulo', 'Tatuapé',         'SP', 'B+', 'médio', 'capital', 'ativa',
 'Região de classe média consolidada com demanda crescente por reformas. Ticket entre R$50k e R$80k.',
 50000, 80000),

('São Paulo', 'Mooca',           'SP', 'B+', 'médio', 'capital', 'ativa',
 'Região de classe média consolidada com demanda crescente por reformas. Ticket entre R$50k e R$80k.',
 50000, 80000),

('São Paulo', 'Barra Funda',     'SP', 'B+', 'médio', 'capital', 'ativa',
 'Região de classe média consolidada com demanda crescente por reformas. Ticket entre R$50k e R$80k.',
 50000, 80000),

('São Paulo', 'Liberdade',       'SP', 'B+', 'médio', 'capital', 'ativa',
 'Região de classe média consolidada com demanda crescente por reformas. Ticket entre R$50k e R$80k.',
 50000, 80000),

('São Paulo', 'Bela Vista',      'SP', 'B+', 'médio', 'capital', 'ativa',
 'Região de classe média consolidada com demanda crescente por reformas. Ticket entre R$50k e R$80k.',
 50000, 80000),

('São Paulo', 'Consolação',      'SP', 'B+', 'médio', 'capital', 'ativa',
 'Região de classe média consolidada com demanda crescente por reformas. Ticket entre R$50k e R$80k.',
 50000, 80000),

('São Paulo', 'Planalto Paulista','SP', 'B+', 'médio', 'capital', 'ativa',
 'Região de classe média consolidada com demanda crescente por reformas. Ticket entre R$50k e R$80k.',
 50000, 80000),

('São Paulo', 'Jardim da Saúde', 'SP', 'B+', 'médio', 'capital', 'ativa',
 'Região de classe média consolidada com demanda crescente por reformas. Ticket entre R$50k e R$80k.',
 50000, 80000),

('São Paulo', 'Morumbi',         'SP', 'B+', 'médio', 'capital', 'ativa',
 'Região de classe média consolidada com demanda crescente por reformas. Ticket entre R$50k e R$80k.',
 50000, 80000),

-- B+ — Metropolitana
('Santana de Parnaíba', NULL,     'SP', 'B+', 'médio', 'metropolitana', 'ativa',
 'Cidade da Grande São Paulo em crescimento. Boa demanda por reformas entre R$50k e R$80k.',
 50000, 80000),

('Osasco',            'Vila Yara', 'SP', 'B+', 'médio', 'metropolitana', 'ativa',
 'Bairro consolidado de Osasco com demanda por reformas de médio padrão. Ticket entre R$50k e R$80k.',
 50000, 80000),

-- ═══════════════════════════════════════════════════════════
-- OPORTUNIDADE — Periférica com potencial (São Paulo capital)
-- ═══════════════════════════════════════════════════════════
('São Paulo', 'Jabaquara',    'SP', 'Oportunidade', 'médio', 'capital', 'ativa',
 'Região com oportunidades pontuais — alta variação de perfil. Priorizar leads com projeto definido e orçamento acima de R$40k.',
 40000, 80000),

('São Paulo', 'Vila Prudente','SP', 'Oportunidade', 'médio', 'capital', 'ativa',
 'Região com oportunidades pontuais — alta variação de perfil. Priorizar leads com projeto definido e orçamento acima de R$40k.',
 40000, 80000),

('São Paulo', 'Pirituba',     'SP', 'Oportunidade', 'médio', 'capital', 'ativa',
 'Região com oportunidades pontuais — alta variação de perfil. Priorizar leads com projeto definido e orçamento acima de R$40k.',
 40000, 80000),

('São Paulo', 'Penha',        'SP', 'Oportunidade', 'médio', 'capital', 'ativa',
 'Região com oportunidades pontuais — alta variação de perfil. Priorizar leads com projeto definido e orçamento acima de R$40k.',
 40000, 80000),

-- Oportunidade — Metropolitana
('Guarulhos',            'Bosque Maia', 'SP', 'Oportunidade', 'médio', 'metropolitana', 'ativa',
 'Região com oportunidades pontuais na Grande São Paulo. Priorizar leads com projeto definido e orçamento acima de R$40k.',
 40000, 80000),

('Santo André',          'Campestre',   'SP', 'Oportunidade', 'médio', 'metropolitana', 'ativa',
 'Região com oportunidades pontuais na Grande São Paulo. Priorizar leads com projeto definido e orçamento acima de R$40k.',
 40000, 80000),

('São Bernardo do Campo', 'Assunção',   'SP', 'Oportunidade', 'médio', 'metropolitana', 'ativa',
 'Região com oportunidades pontuais na Grande São Paulo. Priorizar leads com projeto definido e orçamento acima de R$40k.',
 40000, 80000),

('Barueri',              NULL,          'SP', 'Oportunidade', 'médio', 'metropolitana', 'ativa',
 'Cidade da Grande São Paulo com oportunidades fora do núcleo Alphaville. Qualificação recomendada.',
 40000, 80000),

-- ═══════════════════════════════════════════════════════════
-- B — Monitoramento (São Paulo capital)
-- ═══════════════════════════════════════════════════════════
('São Paulo', 'Casa Verde', 'SP', 'B', 'baixo', 'capital', 'ativa',
 'Região em monitoramento com potencial emergente. Ticket entre R$30k e R$50k. Qualificação cuidadosa recomendada.',
 30000, 50000),

('São Paulo', 'Tucuruvi',   'SP', 'B', 'baixo', 'capital', 'ativa',
 'Região em monitoramento com potencial emergente. Ticket entre R$30k e R$50k. Qualificação cuidadosa recomendada.',
 30000, 50000),

('São Paulo', 'Itaquera',   'SP', 'B', 'baixo', 'capital', 'ativa',
 'Região em monitoramento com potencial emergente. Ticket entre R$30k e R$50k. Qualificação cuidadosa recomendada.',
 30000, 50000),

-- ═══════════════════════════════════════════════════════════
-- CIDADES DE EXPANSÃO — Estrutura preparada para futuro
-- ═══════════════════════════════════════════════════════════
('Curitiba',       NULL, 'PR', 'Premium A', 'alto', 'expansão', 'expansão',
 'Cidade em fase de expansão — Reforma100 ainda sem presença local. Alto potencial confirmado. Registre o lead para análise de viabilidade.',
 NULL, NULL),

('Goiânia',        NULL, 'GO', 'Premium A', 'alto', 'expansão', 'expansão',
 'Cidade em fase de expansão — Reforma100 ainda sem presença local. Alto potencial confirmado. Registre o lead para análise de viabilidade.',
 NULL, NULL),

('Brasília',       NULL, 'DF', 'Premium A', 'alto', 'expansão', 'expansão',
 'Cidade em fase de expansão — Reforma100 ainda sem presença local. Alto potencial confirmado. Registre o lead para análise de viabilidade.',
 NULL, NULL),

('Belo Horizonte', NULL, 'MG', 'Premium A', 'alto', 'expansão', 'expansão',
 'Cidade em fase de expansão — Reforma100 ainda sem presença local. Alto potencial confirmado. Registre o lead para análise de viabilidade.',
 NULL, NULL),

-- Litoral SP (estrutura base para futura expansão)
('Santos',         NULL, 'SP', 'B+', 'médio', 'litoral', 'expansão',
 'Litoral paulista em análise. Demanda sazonal com picos em temporada. Avaliar viabilidade operacional antes de iniciar.',
 NULL, NULL),

('Guarujá',        NULL, 'SP', 'B+', 'médio', 'litoral', 'expansão',
 'Litoral paulista em análise. Demanda sazonal com picos em temporada. Avaliar viabilidade operacional antes de iniciar.',
 NULL, NULL),

('São Sebastião',  NULL, 'SP', 'Premium A', 'alto', 'litoral', 'expansão',
 'Litoral norte SP (Maresias/Juquehy/Camburi). Alta renda, imóveis de veraneio de luxo. Expansão estratégica futura.',
 NULL, NULL),

('Ilhabela',       NULL, 'SP', 'Premium A', 'alto', 'litoral', 'expansão',
 'Litoral norte SP. Alta renda, imóveis de alto padrão. Expansão estratégica futura.',
 NULL, NULL);
