-- ============================================================
-- Cobertura abrangente: SP capital + Grande SP + Litoral Sul SP
--                       + Curitiba + Grande Curitiba
--                       + Goiânia + Grande Goiânia
-- ============================================================
-- Fonte: IBGE Censo 2022 + FipeZap 2024/2025 + perfil imobiliário verificado.
-- Todos os INSERTs usam WHERE NOT EXISTS para evitar duplicatas.
-- Valores de classificacao restritos ao CHECK constraint da tabela.
-- "B-" do mercado → mapeado como 'B'; "B-/Oportunidade" → 'Oportunidade'.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. SÃO PAULO capital — distritos não mapeados anteriormente
-- ────────────────────────────────────────────────────────────
INSERT INTO regioes_estrategicas
  (cidade, bairro, estado, classificacao, potencial, zona, status_regiao, descricao, faixa_valor_min, faixa_valor_max)
SELECT v.cidade, v.bairro, v.estado,
       v.classificacao::TEXT, v.potencial::TEXT, v.zona::TEXT,
       v.status_regiao::TEXT, v.descricao,
       v.fmin::INTEGER, v.fmax::INTEGER
FROM (VALUES
  -- CENTRO
  ('São Paulo','Consolação',         'SP','A-',               'médio','capital','ativa','Eixo Paulista. Renda acima de R$6k. Ticket R$80k–R$150k.',        80000,150000),
  ('São Paulo','Bela Vista',         'SP','B+',               'médio','capital','ativa','Bixiga. Mix de perfis. Classe média consolidada.',                50000, 80000),
  ('São Paulo','Santa Cecília',      'SP','B+',               'médio','capital','ativa','Baixo Augusta. Classe média em valorização.',                     50000, 80000),
  ('São Paulo','Liberdade',          'SP','B',                'baixo','capital','ativa','Perfil étnico diverso. Renda média. Imóveis envelhecidos.',        30000, 50000),
  ('São Paulo','República',          'SP','B',                'baixo','capital','ativa','Centro comercial. Residencial antigo.',                           30000, 50000),
  ('São Paulo','Sé',                 'SP','B',                'baixo','capital','ativa','Centro histórico. Residencial limitado.',                         30000, 50000),
  ('São Paulo','Cambuci',            'SP','B',                'baixo','capital','ativa','Tradicional. Renda média-baixa.',                                 30000, 50000),
  ('São Paulo','Bom Retiro',         'SP','B',                'baixo','capital','ativa','Polo têxtil/atacado. Residencial antigo.',                        30000, 50000),
  -- OESTE
  ('São Paulo','Barra Funda',        'SP','B+',               'médio','capital','ativa','Misto residencial/corporativo. Valorização crescente.',           50000, 80000),
  ('São Paulo','Butantã',            'SP','B+',               'médio','capital','ativa','Próximo à USP. Classe média. Potencial de renovação.',            50000, 80000),
  ('São Paulo','Morumbi',            'SP','A-',               'médio','capital','ativa','Alta variação interna: mansões no alto, comunidades na baixada. Qualificação obrigatória.',80000,150000),
  ('São Paulo','Vila Andrade',       'SP','A-',               'médio','capital','ativa','Brooklin/Panamby. Condomínios fechados. Classe média-alta.',      80000,150000),
  ('São Paulo','Vila Leopoldina',    'SP','B+',               'médio','capital','ativa','Revitalização recente. Empresas e residencial em ascensão.',      50000, 80000),
  ('São Paulo','Jaguaré',            'SP','B',                'baixo','capital','ativa','Popular. Industrial no entorno.',                                 30000, 50000),
  ('São Paulo','Jaguara',            'SP','B',                'baixo','capital','ativa','Popular. Renda mediana.',                                         30000, 50000),
  ('São Paulo','Rio Pequeno',        'SP','B',                'baixo','capital','ativa','Populoso. Classe média-baixa.',                                   30000, 50000),
  ('São Paulo','Vila Sônia',         'SP','B',                'baixo','capital','ativa','Metrô próximo. Classe média. Potencial moderado.',                30000, 50000),
  ('São Paulo','Raposo Tavares',     'SP','Oportunidade',     'baixo','capital','ativa','Periferia oeste. Renda mais baixa. Qualificação necessária.',     25000, 50000),
  -- NORTE
  ('São Paulo','Tucuruvi',           'SP','B+',               'médio','capital','ativa','Metrô. Classe média. Imóveis anos 70–90 com potencial de reforma.',50000,80000),
  ('São Paulo','Mandaqui',           'SP','B+',               'médio','capital','ativa','Próximo a Santana. Classe média consolidada.',                    50000, 80000),
  ('São Paulo','Casa Verde',         'SP','B+',               'médio','capital','ativa','Tradicional. Classe média. Bom potencial de remodelação.',        50000, 80000),
  ('São Paulo','Cachoeirinha',       'SP','B',                'baixo','capital','ativa','Popular. Renda mediana.',                                         30000, 50000),
  ('São Paulo','Limão',              'SP','B',                'baixo','capital','ativa','Classe média-baixa. Grande oferta de casas antigas.',             30000, 50000),
  ('São Paulo','Vila Maria',         'SP','B',                'baixo','capital','ativa','Popular. Boa densidade. Renda limitada.',                         30000, 50000),
  ('São Paulo','Vila Guilherme',     'SP','B',                'baixo','capital','ativa','Misto. Industrial. Residencial antigo.',                          30000, 50000),
  ('São Paulo','Vila Medeiros',      'SP','B',                'baixo','capital','ativa','Popular. Pouca renovação imobiliária.',                           30000, 50000),
  ('São Paulo','Freguesia do Ó',     'SP','B',                'baixo','capital','ativa','Urbano denso. Classe média-baixa.',                               30000, 50000),
  ('São Paulo','Pirituba',           'SP','B',                'baixo','capital','ativa','Classe média-baixa. Eixo Bandeirantes.',                          30000, 50000),
  ('São Paulo','São Domingos',       'SP','B',                'baixo','capital','ativa','Classe média-baixa. Norte próximo a Pirituba.',                   30000, 50000),
  ('São Paulo','Jardim São Paulo',   'SP','B',                'baixo','capital','ativa','Popular. Norte da cidade.',                                       30000, 50000),
  ('São Paulo','Jaçanã',             'SP','Oportunidade',     'baixo','capital','ativa','Periferia norte. Perfil popular. Qualificação necessária.',       25000, 50000),
  ('São Paulo','Tremembé',           'SP','Oportunidade',     'baixo','capital','ativa','Periférico norte. Renda mais baixa. Qualificação necessária.',    25000, 45000),
  ('São Paulo','Jaraguá',            'SP','Oportunidade',     'médio','capital','ativa','Condomínios fechados no entorno. Mix popular e médio.',            40000, 80000),
  ('São Paulo','Brasilândia',        'SP','Periférico com potencial','baixo','capital','ativa','Grande população. Renda baixa.',15000,35000),
  ('São Paulo','Perus',              'SP','Periférico com potencial','baixo','capital','ativa','Extremo norte. Renda baixa.',  15000,35000),
  ('São Paulo','Anhanguera',         'SP','Periférico com potencial','baixo','capital','ativa','Extremo norte. Perfil popular/rural.',15000,30000),
  -- LESTE
  ('São Paulo','Mooca',              'SP','B+',               'médio','capital','ativa','Valorização crescente. Classe média consolidada. Imóveis históricos.',50000,80000),
  ('São Paulo','Água Rasa',          'SP','B+',               'médio','capital','ativa','Próximo ao Tatuapé. Classe média. Residencial denso.',            50000, 80000),
  ('São Paulo','Belém',              'SP','B+',               'médio','capital','ativa','Tradicional. Classe média. Boa infraestrutura.',                  50000, 80000),
  ('São Paulo','Carrão',             'SP','B+',               'médio','capital','ativa','Ao lado do Tatuapé. Classe média em ascensão.',                   50000, 80000),
  ('São Paulo','Vila Formosa',       'SP','B+',               'médio','capital','ativa','Ao lado do Tatuapé. Bom perfil familiar.',                        50000, 80000),
  ('São Paulo','Aricanduva',         'SP','B',                'baixo','capital','ativa','Classe média. Shopping no entorno.',                              30000, 50000),
  ('São Paulo','Brás',               'SP','B',                'baixo','capital','ativa','Comercial/atacado. Residencial antigo.',                          30000, 50000),
  ('São Paulo','Penha',              'SP','B',                'baixo','capital','ativa','Classe média-baixa. Norte da Zona Leste.',                        30000, 50000),
  ('São Paulo','Vila Matilde',       'SP','B',                'baixo','capital','ativa','Próximo à Penha. Perfil semelhante.',                             30000, 50000),
  ('São Paulo','Cangaíba',           'SP','B',                'baixo','capital','ativa','Popular. Classe média-baixa.',                                    30000, 50000),
  ('São Paulo','Vila Prudente',      'SP','B',                'baixo','capital','ativa','Popular. Alguma renovação no entorno do metrô.',                  30000, 50000),
  ('São Paulo','Pari',               'SP','Oportunidade',     'baixo','capital','ativa','Popular. Perfil variado. Qualificação necessária.',               25000, 50000),
  ('São Paulo','Artur Alvim',        'SP','Oportunidade',     'baixo','capital','ativa','Periférico leste. Renda mais baixa.',                             25000, 45000),
  ('São Paulo','Ermelino Matarazzo', 'SP','Oportunidade',     'baixo','capital','ativa','Misto. Algum potencial se qualificado.',                          25000, 45000),
  ('São Paulo','Ponte Rasa',         'SP','Oportunidade',     'baixo','capital','ativa','Periférico. Renda baixa.',                                        20000, 40000),
  ('São Paulo','Itaquera',           'SP','Oportunidade',     'baixo','capital','ativa','Popular. Melhorou com Copa. Renda modesta.',                      25000, 50000),
  ('São Paulo','Cidade Líder',       'SP','Oportunidade',     'baixo','capital','ativa','Renda baixa. Periferia leste.',                                   20000, 40000),
  ('São Paulo','Parque do Carmo',    'SP','Oportunidade',     'médio','capital','ativa','Condomínios fechados. Mix de perfis.',                             30000, 60000),
  ('São Paulo','São Mateus',         'SP','Oportunidade',     'médio','capital','ativa','Mix de condomínios e popular.',                                    30000, 60000),
  ('São Paulo','São Lucas',          'SP','Oportunidade',     'baixo','capital','ativa','Classe média-baixa.',                                             25000, 45000),
  ('São Paulo','Guaianases',         'SP','Periférico com potencial','baixo','capital','ativa','Extremo leste. Renda baixa.',15000,35000),
  ('São Paulo','São Rafael',         'SP','Periférico com potencial','baixo','capital','ativa','Periferia profunda leste.',  15000,30000),
  ('São Paulo','Sapopemba',          'SP','Periférico com potencial','baixo','capital','ativa','Periferia leste sul.',        15000,35000),
  ('São Paulo','Vila Curuçá',        'SP','Periférico com potencial','baixo','capital','ativa','Extremo leste. Popular.',    15000,35000),
  ('São Paulo','Vila Jacuí',         'SP','Periférico com potencial','baixo','capital','ativa','Periferia leste.',            15000,30000),
  -- SUL
  ('São Paulo','Saúde',              'SP','A-',               'médio','capital','ativa','Ao lado de Vila Mariana. Classe média-alta. Residencial tranquilo.',80000,150000),
  ('São Paulo','Ipiranga',           'SP','B+',               'médio','capital','ativa','Histórico. Classe média. Heterogêneo.',                           50000, 80000),
  ('São Paulo','Cursino',            'SP','B',                'baixo','capital','ativa','Classe média. Próximo ao Ipiranga.',                              30000, 50000),
  ('São Paulo','Sacomã',             'SP','B',                'baixo','capital','ativa','Popular. Alguns condomínios. Renda mediana.',                     30000, 50000),
  ('São Paulo','Santo Amaro',        'SP','A-',               'médio','capital','ativa','Mix de perfis. Parte nobre. Acesso facilitado.',                  80000,150000),
  ('São Paulo','Campo Limpo',        'SP','Oportunidade',     'baixo','capital','ativa','Popular. Renda baixa.',                                           25000, 50000),
  ('São Paulo','Cidade Ademar',      'SP','Oportunidade',     'baixo','capital','ativa','Mix. Alguns condomínios. Qualificação necessária.',               20000, 50000),
  ('São Paulo','Cidade Dutra',       'SP','Oportunidade',     'baixo','capital','ativa','Periferia sul com núcleos de classe média.',                      20000, 50000),
  ('São Paulo','Pedreira',           'SP','Oportunidade',     'baixo','capital','ativa','Popular. Algum potencial com qualificação.',                      20000, 50000),
  ('São Paulo','Capão Redondo',      'SP','Periférico com potencial','baixo','capital','ativa','Periferia sul. Renda baixa.',15000,35000),
  ('São Paulo','Jardim Ângela',      'SP','Periférico com potencial','baixo','capital','ativa','Periferia. Renda baixa.',    15000,35000),
  ('São Paulo','Jardim São Luís',    'SP','Periférico com potencial','baixo','capital','ativa','Periferia sul. Renda baixa.',15000,35000),
  ('São Paulo','Grajaú',             'SP','Periférico com potencial','baixo','capital','ativa','Mais populoso da cidade. Renda baixa.',15000,35000),
  ('São Paulo','Socorro',            'SP','Periférico com potencial','baixo','capital','ativa','Extremo sul. Billings. Renda baixa.',15000,35000),
  ('São Paulo','Parelheiros',        'SP','Periférico com potencial','baixo','capital','ativa','Rural/periférico. Mananciais.',15000,30000),
  ('São Paulo','Marsilac',           'SP','Periférico com potencial','baixo','capital','ativa','Extremo sul. Quase rural. Menor renda da cidade.',10000,25000)
) AS v(cidade, bairro, estado, classificacao, potencial, zona, status_regiao, descricao, fmin, fmax)
WHERE NOT EXISTS (
  SELECT 1 FROM regioes_estrategicas r
  WHERE r.cidade = v.cidade AND lower(r.bairro) = lower(v.bairro)
);

-- ────────────────────────────────────────────────────────────
-- 2. GRANDE SÃO PAULO — municípios e bairros não mapeados
-- ────────────────────────────────────────────────────────────
INSERT INTO regioes_estrategicas
  (cidade, bairro, estado, classificacao, potencial, zona, status_regiao, descricao, faixa_valor_min, faixa_valor_max)
SELECT v.cidade, v.bairro, v.estado,
       v.classificacao::TEXT, v.potencial::TEXT, v.zona::TEXT,
       v.status_regiao::TEXT, v.descricao,
       v.fmin::INTEGER, v.fmax::INTEGER
FROM (VALUES
  -- São Caetano do Sul (bairros específicos — city-level já no seed)
  ('São Caetano do Sul','Jardim São Caetano','SP','Premium A','alto','metropolitana','ativa','Bairro mais nobre. Casas grandes. Alto padrão.',150000,300000),
  ('São Caetano do Sul','Cerâmica',          'SP','A-',       'médio','metropolitana','ativa','Moderno. Apartamentos. Classe média-alta.',      80000,150000),
  ('São Caetano do Sul','Santa Paula',       'SP','A-',       'médio','metropolitana','ativa','Residencial tranquilo. Classe média-alta.',      80000,150000),
  ('São Caetano do Sul','Centro',            'SP','A-',       'médio','metropolitana','ativa','Urbano denso. IDH 0,862. Bom perfil.',           80000,150000),
  -- Santo André (city-level já no seed)
  ('Santo André','Campestre',           'SP','A-',  'médio','metropolitana','ativa','Melhor bairro de Santo André. Casas de alto padrão.',80000,150000),
  ('Santo André','Parque das Nações',   'SP','A-',  'médio','metropolitana','ativa','Classe média-alta. Residencial consolidado.',       80000,150000),
  ('Santo André','Vila Bastos',         'SP','B+',  'médio','metropolitana','ativa','Classe média. Centro expandido.',                   50000, 80000),
  ('Santo André','Centro',              'SP','B+',  'médio','metropolitana','ativa','Urbano. Serviços. Classe média.',                   50000, 80000),
  ('Santo André','Jardim Brasil',       'SP','B+',  'médio','metropolitana','ativa','Bom perfil familiar. Imóveis anos 70–90.',          50000, 80000),
  -- São Bernardo do Campo (city-level já no seed)
  ('São Bernardo do Campo','Nova Petrópolis','SP','A-','médio','metropolitana','ativa','Bairro mais nobre. Casas grandes. Alto padrão.',80000,150000),
  ('São Bernardo do Campo','Anchieta',       'SP','A-','médio','metropolitana','ativa','Bom padrão. Casas e condomínios.',              80000,150000),
  ('São Bernardo do Campo','Assunção',       'SP','B+','médio','metropolitana','ativa','Classe média alta. Bom perfil.',                50000, 80000),
  ('São Bernardo do Campo','Baeta Neves',    'SP','B+','médio','metropolitana','ativa','Consolidado. Bom potencial.',                   50000, 80000),
  ('São Bernardo do Campo','Centro',         'SP','B+','médio','metropolitana','ativa','Urbano. Classe média.',                         50000, 80000),
  -- ABC periférico
  ('Diadema',NULL,                'SP','Oportunidade','baixo','metropolitana','ativa','Industrial. Renda mais baixa. Qualificação necessária.',25000,50000),
  ('Diadema','Conceição',         'SP','B',           'baixo','metropolitana','ativa','Melhor área de Diadema. Algum potencial.',           30000,50000),
  ('Mauá',NULL,                   'SP','Oportunidade','baixo','metropolitana','ativa','Renda abaixo do ABC. Industrial.',                   25000,45000),
  ('Ribeirão Pires',NULL,         'SP','B+',          'médio','metropolitana','ativa','Cidade dormitório de qualidade. Classe média. Casas grandes.',50000,80000),
  ('Rio Grande da Serra',NULL,    'SP','B',            'baixo','metropolitana','ativa','Menor. Classe média-baixa.',                         30000,50000),
  -- Guarulhos (bairros específicos — city-level já no seed)
  ('Guarulhos','Jardim Maia',    'SP','A-', 'médio','metropolitana','ativa','Bairro mais nobre. Condomínios fechados.',       80000,150000),
  ('Guarulhos','Parque Cecap',   'SP','B+', 'médio','metropolitana','ativa','Planejado. Boa infraestrutura. Classe média.',   50000, 80000),
  ('Guarulhos','Centro',         'SP','B+', 'médio','metropolitana','ativa','Urbano. Comércio. Classe média.',               50000, 80000),
  ('Guarulhos','Vila Augusta',   'SP','B+', 'médio','metropolitana','ativa','Residencial. Classe média. Boa localização.',   50000, 80000),
  ('Guarulhos','Cumbica',        'SP','B',  'baixo','metropolitana','ativa','Logístico. Residencial. Perfil operário/médio.',30000, 50000),
  ('Guarulhos','Pimentas',       'SP','B',  'baixo','metropolitana','ativa','Popular. Periférico.',                          25000, 45000),
  ('Guarulhos','Bonsucesso',     'SP','B',  'baixo','metropolitana','ativa','Popular. Periférico.',                          25000, 45000),
  -- Osasco (city-level já no seed)
  ('Osasco','Centro',        'SP','B+',          'médio','metropolitana','ativa','Comercial. Verticais. Classe média.',        50000,80000),
  ('Osasco','Jardim Veloso', 'SP','B+',          'médio','metropolitana','ativa','Classe média. Residencial consolidado.',     50000,80000),
  ('Osasco','Continental',   'SP','B',            'baixo','metropolitana','ativa','Popular. Renda mais baixa.',                30000,50000),
  -- Barueri (Alphaville já no seed)
  ('Barueri','Centro Barueri','SP','B+','médio','metropolitana','ativa','Comercial. Classe média.',50000,80000),
  -- Santana de Parnaíba (city-level e Tamboré já no seed)
  ('Santana de Parnaíba','Centro Histórico','SP','B+','médio','metropolitana','ativa','Turístico. Classe média.',50000,80000),
  -- Cotia (Granja Viana já no seed)
  ('Cotia','Chácara das Pedras','SP','A-','médio','metropolitana','ativa','Classe média-alta. Condomínios.',80000,150000),
  ('Cotia','Centro',            'SP','B', 'baixo','metropolitana','ativa','Urbano simples. Renda mediana.',30000,50000),
  -- Eixo oeste periférico
  ('Carapicuíba',NULL,'SP','Oportunidade','baixo','metropolitana','ativa','Popular. Renda baixa. Proximidade ao Alphaville cria oportunidades pontuais.',25000,50000),
  ('Jandira',NULL,    'SP','B',           'baixo','metropolitana','ativa','Classe média-baixa. Cidade dormitório.',30000,50000),
  ('Itapevi',NULL,    'SP','B',           'baixo','metropolitana','ativa','Classe média-baixa. Cidade dormitório.',30000,50000),
  -- Sul e entorno
  ('Embu das Artes',NULL,       'SP','Oportunidade','baixo','metropolitana','ativa','Popular. Artesanato turístico. Renda modesta.',25000,50000),
  ('Embu-Guaçu',NULL,           'SP','Periférico com potencial','baixo','metropolitana','ativa','Pequeno. Renda baixa.',15000,35000),
  ('Taboão da Serra',NULL,       'SP','Oportunidade','baixo','metropolitana','ativa','Conurbado com SP. Renda mediana. Reformas simples.',30000,50000),
  ('Itapecerica da Serra',NULL,  'SP','Oportunidade','baixo','metropolitana','ativa','Popular. Algum condomínio fechado.',25000,45000),
  ('Mairiporã',NULL,             'SP','Oportunidade','médio','metropolitana','ativa','Chácaras e condomínios de renda média. Qualificação necessária.',40000,80000),
  -- Norte da RMSP
  ('Franco da Rocha',NULL,  'SP','Periférico com potencial','baixo','metropolitana','ativa','Popular. Renda baixa.',15000,35000),
  ('Francisco Morato',NULL, 'SP','Periférico com potencial','baixo','metropolitana','ativa','Popular. Renda baixa.',15000,30000),
  ('Caieiras',NULL,         'SP','B',           'baixo','metropolitana','ativa','Industrial. Classe média-baixa.',30000,50000),
  ('Cajamar',NULL,          'SP','B',           'baixo','metropolitana','ativa','Industrial. Logística. Renda mediana.',30000,50000)
) AS v(cidade, bairro, estado, classificacao, potencial, zona, status_regiao, descricao, fmin, fmax)
WHERE NOT EXISTS (
  SELECT 1 FROM regioes_estrategicas r
  WHERE r.cidade = v.cidade
    AND (
      (v.bairro IS NULL AND r.bairro IS NULL)
      OR (v.bairro IS NOT NULL AND r.bairro IS NOT NULL AND lower(r.bairro) = lower(v.bairro))
    )
);

-- ────────────────────────────────────────────────────────────
-- 3. LITORAL SUL SP — bairros específicos
-- ────────────────────────────────────────────────────────────
INSERT INTO regioes_estrategicas
  (cidade, bairro, estado, classificacao, potencial, zona, status_regiao, descricao, faixa_valor_min, faixa_valor_max)
SELECT v.cidade, v.bairro, v.estado,
       v.classificacao::TEXT, v.potencial::TEXT, v.zona::TEXT,
       v.status_regiao::TEXT, v.descricao,
       v.fmin::INTEGER, v.fmax::INTEGER
FROM (VALUES
  -- Santos (city-level já no seed)
  ('Santos','Gonzaga',                        'SP','Premium A','alto','litoral','expansão','Melhor orla. Apartamentos grandes. Alta renda.',150000,300000),
  ('Santos','José Menino',                    'SP','A-',       'médio','litoral','expansão','Orla nobre. Valorizado. Classe média-alta.',    80000,150000),
  ('Santos','Boqueirão',                      'SP','A-',       'médio','litoral','expansão','Orla. Apartamentos grandes. Classe média-alta.',80000,150000),
  ('Santos','Ponta da Praia',                 'SP','A-',       'médio','litoral','expansão','Orla sul. Valorizado. Segunda residência.',     80000,150000),
  ('Santos','Aparecida',                      'SP','B+',       'médio','litoral','expansão','Boa orla. Classe média.',                       50000, 80000),
  ('Santos','Embaré',                         'SP','B+',       'médio','litoral','expansão','Orla. Classe média. Imóveis antigos.',          50000, 80000),
  ('Santos','Vila Mathias',                   'SP','B+',       'médio','litoral','expansão','Próximo ao centro. Classe média.',              50000, 80000),
  ('Santos','Centro',                         'SP','B',        'baixo','litoral','expansão','Comercial. Apartamentos antigos.',              30000, 50000),
  ('Santos','Macuco',                         'SP','B',        'baixo','litoral','expansão','Zona noroeste. Popular/médio.',                 30000, 50000),
  ('Santos','Vila Belmiro',                   'SP','B',        'baixo','litoral','expansão','Popular/médio. Renda inferior à orla.',         30000, 50000),
  ('Santos','Marapé',                         'SP','B',        'baixo','litoral','expansão','Popular. Renda modesta.',                       30000, 50000),
  ('Santos','Monte Serrat',                   'SP','Periférico com potencial','baixo','litoral','expansão','Comunidade nos morros. Renda baixa.',15000,35000),
  -- São Vicente
  ('São Vicente',NULL,       'SP','Oportunidade','baixo','litoral','expansão','Renda inferior a Santos. Popular. Alguma orla.',25000,50000),
  ('São Vicente','Itararé',  'SP','B',           'baixo','litoral','expansão','Orla. Melhor área da cidade.',                 30000,50000),
  -- Praia Grande
  ('Praia Grande',NULL,           'SP','B',  'baixo','litoral','expansão','Popular/médio. Segunda residência econômica.',30000,50000),
  ('Praia Grande','Caiçara',      'SP','B+', 'médio','litoral','expansão','Melhor orla de Praia Grande. Em valorização.',50000,80000),
  ('Praia Grande','Aviação',      'SP','B+', 'médio','litoral','expansão','Orla valorizada. Classe média.',               50000,80000),
  -- Cubatão
  ('Cubatão',NULL,'SP','Oportunidade','baixo','litoral','expansão','Industrial. Renda mediana mas perfil operário.',25000,45000),
  -- Guarujá (city-level já no seed)
  ('Guarujá','Enseada',          'SP','A-',       'médio','litoral','expansão','Orla tranquila. Casas e apartamentos de padrão.',80000,150000),
  ('Guarujá','Pitangueiras',     'SP','A-',       'médio','litoral','expansão','Orla principal. Apartamentos de padrão.',       80000,150000),
  ('Guarujá','Acapulco',         'SP','Premium A','alto', 'litoral','expansão','Condomínio fechado de alto padrão. Casas de luxo.',150000,300000),
  ('Guarujá','Astúrias',         'SP','B+',       'médio','litoral','expansão','Orla. Classe média.',                           50000, 80000),
  ('Guarujá','Centro',           'SP','B',        'baixo','litoral','expansão','Urbano. Comercial. Popular.',                   30000, 50000),
  ('Guarujá','Vicente de Carvalho','SP','B',      'baixo','litoral','expansão','Popular. Renda baixa.',                         25000, 45000),
  -- Bertioga
  ('Bertioga','Riviera de São Lourenço','SP','Premium A+','alto','litoral','expansão','Bairro planejado de luxo. Renda média R$20k. Ticket máximo do litoral.',300000,700000),
  ('Bertioga','Centro',              'SP','B+',         'médio','litoral','expansão','Classe média. Turismo.',50000,80000),
  -- São Sebastião (city-level já no seed)
  ('São Sebastião','Maresias',      'SP','Premium A','alto','litoral','expansão','Imóveis de luxo. Segunda residência alto padrão.',150000,300000),
  ('São Sebastião','Juquehy',       'SP','A-',       'médio','litoral','expansão','Condomínios. Classe média-alta.',              80000,150000),
  ('São Sebastião','Boiçucanga',    'SP','A-',       'médio','litoral','expansão','Condomínios. Classe média-alta.',              80000,150000),
  ('São Sebastião','Centro',        'SP','B+',       'médio','litoral','expansão','Urbano. Classe média.',                        50000, 80000),
  ('São Sebastião','Barra do Una',  'SP','B+',       'médio','litoral','expansão','Segunda residência médio padrão.',             50000, 80000),
  -- Ilhabela (city-level já no seed)
  ('Ilhabela','Perequê',   'SP','Premium A','alto','litoral','expansão','Condomínios de luxo. Segunda residência premium.',150000,300000),
  ('Ilhabela','Vila',      'SP','A-',       'médio','litoral','expansão','Oferta limitada. Imóveis exclusivos.',           80000,150000),
  ('Ilhabela','Jabaquara', 'SP','B+',       'médio','litoral','expansão','Praias remotas. Segunda residência média.',      50000, 80000),
  -- Caraguatatuba
  ('Caraguatatuba','Martim de Sá','SP','A-','médio','litoral','expansão','Condomínios fechados. Melhor área.',80000,150000),
  ('Caraguatatuba','Centro',       'SP','B+','médio','litoral','expansão','Capital econômica do litoral norte. Classe média.',50000,80000),
  ('Caraguatatuba','Porto Novo',   'SP','B', 'baixo','litoral','expansão','Segunda residência econômica.',30000,50000),
  -- Ubatuba
  ('Ubatuba','Itaguá',       'SP','A-','médio','litoral','expansão','Bairro mais valorizado de Ubatuba.',   80000,150000),
  ('Ubatuba','Praia Grande', 'SP','A-','médio','litoral','expansão','Condomínios. Alta demanda.',           80000,150000),
  ('Ubatuba','Centro',       'SP','B+','médio','litoral','expansão','Urbano. Turismo. Classe média.',       50000, 80000),
  ('Ubatuba','Lagoinha',     'SP','B+','médio','litoral','expansão','Segunda residência média.',             50000, 80000)
) AS v(cidade, bairro, estado, classificacao, potencial, zona, status_regiao, descricao, fmin, fmax)
WHERE NOT EXISTS (
  SELECT 1 FROM regioes_estrategicas r
  WHERE r.cidade = v.cidade
    AND (
      (v.bairro IS NULL AND r.bairro IS NULL)
      OR (v.bairro IS NOT NULL AND r.bairro IS NOT NULL AND lower(r.bairro) = lower(v.bairro))
    )
);

-- ────────────────────────────────────────────────────────────
-- 4. CURITIBA — bairros (city-level já no seed como expansão)
-- ────────────────────────────────────────────────────────────
INSERT INTO regioes_estrategicas
  (cidade, bairro, estado, classificacao, potencial, zona, status_regiao, descricao, faixa_valor_min, faixa_valor_max)
SELECT v.cidade, v.bairro, v.estado,
       v.classificacao::TEXT, v.potencial::TEXT, v.zona::TEXT,
       v.status_regiao::TEXT, v.descricao,
       v.fmin::INTEGER, v.fmax::INTEGER
FROM (VALUES
  -- PREMIUM (maiores m² da cidade)
  ('Curitiba','Batel',               'PR','Premium A+','alto','expansão','expansão','m² >R$15k. Ticket máximo da cidade. Altíssima renda.',300000,600000),
  ('Curitiba','Campina do Siqueira', 'PR','Premium A+','alto','expansão','expansão','m² R$14k (2º mais caro). Altíssimo padrão.',          300000,600000),
  ('Curitiba','Bigorrilho',          'PR','Premium A', 'alto','expansão','expansão','Champagnat. IDHM 0,948. Alta verticalização premium.', 150000,300000),
  ('Curitiba','Cabral',              'PR','Premium A', 'alto','expansão','expansão','IDHM 0,949. Tradicional. Casas grandes.',              150000,300000),
  ('Curitiba','Ahú',                 'PR','Premium A', 'alto','expansão','expansão','IDHM 0,949. Residencial nobre. Tranquilo.',            150000,300000),
  ('Curitiba','Água Verde',          'PR','Premium A', 'alto','expansão','expansão','Um dos mais caros. Classe alta/média-alta.',           150000,300000),
  ('Curitiba','Ecoville',            'PR','Premium A', 'alto','expansão','expansão','m² R$12k. Crescimento 17% 2024. Alta renda. Planejado.',150000,300000),
  ('Curitiba','Mossunguê',           'PR','Premium A', 'alto','expansão','expansão','Entorno do Ecoville. m² elevado. Classe premium.',     150000,300000),
  -- ALTA (A-)
  ('Curitiba','Juvevê',              'PR','A-','médio','expansão','expansão','IDHM 0,949. Classe média-alta. Bem localizado.',   80000,150000),
  ('Curitiba','Alto da Glória',      'PR','A-','médio','expansão','expansão','Central. Residencial histórico.',                  80000,150000),
  ('Curitiba','Alto da XV',          'PR','A-','médio','expansão','expansão','Próximo ao Centro Cívico. Classe média-alta.',     80000,150000),
  ('Curitiba','Centro Cívico',       'PR','A-','médio','expansão','expansão','Institucional/residencial. IDH 0,949.',            80000,150000),
  ('Curitiba','Hugo Lange',          'PR','A-','médio','expansão','expansão','Residencial tranquilo. Bom padrão.',               80000,150000),
  ('Curitiba','São Francisco',       'PR','A-','médio','expansão','expansão','Universitário nobre. Valorizado.',                 80000,150000),
  ('Curitiba','Jardim Botânico',     'PR','A-','médio','expansão','expansão','Residencial. Parque. Classe média-alta.',          80000,150000),
  ('Curitiba','Mercês',              'PR','A-','médio','expansão','expansão','Residencial. Bem localizado. Bom padrão.',         80000,150000),
  ('Curitiba','Jardim Social',       'PR','A-','médio','expansão','expansão','Residencial. Boa renda.',                          80000,150000),
  ('Curitiba','Bacacheri',           'PR','A-','médio','expansão','expansão','Classe média-alta. Residencial. Boa infraestrutura.',80000,150000),
  ('Curitiba','Vila Izabel',         'PR','A-','médio','expansão','expansão','Residencial. Bom padrão. Próximo ao Batel.',       80000,150000),
  ('Curitiba','Santa Felicidade',    'PR','A-','médio','expansão','expansão','Tradição italiana. Casas grandes. Classe média-alta.',80000,150000),
  ('Curitiba','Santo Inácio',        'PR','A-','médio','expansão','expansão','Classe média-alta. Próximo ao Ecoville.',          80000,150000),
  ('Curitiba','São Braz',            'PR','A-','médio','expansão','expansão','Classe média-alta. Boa infraestrutura.',           80000,150000),
  ('Curitiba','Seminário',           'PR','A-','médio','expansão','expansão','Residencial. Bom padrão.',                         80000,150000),
  ('Curitiba','Jardim das Américas', 'PR','A-','médio','expansão','expansão','Melhor da região sudeste. UFPR. Classe média-alta.',80000,150000),
  -- MÉDIO-ALTO (B+)
  ('Curitiba','Portão',              'PR','B+','médio','expansão','expansão','Classe média. Comércio. Boa infraestrutura.',     50000,80000),
  ('Curitiba','Cristo Rei',          'PR','B+','médio','expansão','expansão','Classe média consolidada.',                       50000,80000),
  ('Curitiba','Rebouças',            'PR','B+','médio','expansão','expansão','Bom acesso. Classe média.',                       50000,80000),
  ('Curitiba','Prado Velho',         'PR','B+','médio','expansão','expansão','PUC próximo. Classe média.',                      50000,80000),
  ('Curitiba','Bom Retiro',          'PR','B+','médio','expansão','expansão','Central. Classe média.',                          50000,80000),
  ('Curitiba','Centro',              'PR','B+','médio','expansão','expansão','Urbano. Comercial. Residencial antigo.',          50000,80000),
  ('Curitiba','Boa Vista',           'PR','B+','médio','expansão','expansão','Classe média. Shopping próximo.',                 50000,80000),
  ('Curitiba','Pilarzinho',          'PR','B+','médio','expansão','expansão','Classe média. Norte da cidade.',                  50000,80000),
  ('Curitiba','Novo Mundo',          'PR','B+','médio','expansão','expansão','Classe média em valorização.',                    50000,80000),
  ('Curitiba','Fanny',               'PR','B+','médio','expansão','expansão','Classe média.',                                   50000,80000),
  ('Curitiba','Campo Comprido',      'PR','B+','médio','expansão','expansão','Classe média. Em valorização.',                   50000,80000),
  ('Curitiba','São Lourenço',        'PR','B+','médio','expansão','expansão','Classe média. Boa localização norte.',            50000,80000),
  ('Curitiba','Santa Quitéria',      'PR','B+','médio','expansão','expansão','Classe média consolidada.',                       50000,80000),
  ('Curitiba','São João',            'PR','B+','médio','expansão','expansão','Classe média. Oeste.',                            50000,80000),
  ('Curitiba','Riviera',             'PR','B+','médio','expansão','expansão','Classe média.',                                   50000,80000),
  ('Curitiba','Lamenha Pequena',     'PR','B+','médio','expansão','expansão','Rural/residencial. Classe média.',                50000,80000),
  ('Curitiba','Hauer',               'PR','B+','médio','expansão','expansão','Classe média. Sul. Bem localizado.',              50000,80000),
  -- MÉDIO (B)
  ('Curitiba','Taboão',              'PR','B','baixo','expansão','expansão','Classe média-baixa.',                 30000,50000),
  ('Curitiba','Abranches',           'PR','B','baixo','expansão','expansão','Classe média-baixa.',                 30000,50000),
  ('Curitiba','Tingui',              'PR','B','baixo','expansão','expansão','Classe média-baixa. Parque no entorno.',30000,50000),
  ('Curitiba','Guaíra',              'PR','B','baixo','expansão','expansão','Popular/médio.',                      30000,50000),
  ('Curitiba','Lindóia',             'PR','B','baixo','expansão','expansão','Classe média-baixa.',                 30000,50000),
  ('Curitiba','Fazendinha',          'PR','B','baixo','expansão','expansão','Classe média-baixa.',                 30000,50000),
  ('Curitiba','Santa Cândida',       'PR','B','baixo','expansão','expansão','Popular. Periferia norte.',           30000,50000),
  ('Curitiba','Xaxim',               'PR','B','baixo','expansão','expansão','Popular/médio. Sul da cidade.',       30000,50000),
  ('Curitiba','Boqueirão',           'PR','B','baixo','expansão','expansão','Classe média-baixa. Populoso.',       30000,50000),
  ('Curitiba','Uberaba',             'PR','B','baixo','expansão','expansão','Classe média-baixa. Leste.',          30000,50000),
  ('Curitiba','Capão da Imbuia',     'PR','B','baixo','expansão','expansão','Classe média-baixa.',                 30000,50000),
  ('Curitiba','Butiatuvinha',        'PR','B','baixo','expansão','expansão','Periferia oeste.',                    30000,50000),
  ('Curitiba','Orleans',             'PR','B','baixo','expansão','expansão','Periferia oeste.',                    30000,50000),
  -- BAIXO (Oportunidade/B periférico)
  ('Curitiba','Barreirinha',         'PR','Oportunidade','baixo','expansão','expansão','Periferia norte.',                     25000,45000),
  ('Curitiba','Atuba',               'PR','Oportunidade','baixo','expansão','expansão','Periferia.',                           25000,45000),
  ('Curitiba','Bairro Alto',         'PR','Oportunidade','baixo','expansão','expansão','Periferia norte.',                     25000,45000),
  ('Curitiba','Cajuru',              'PR','Oportunidade','baixo','expansão','expansão','Periferia leste. Renda baixa.',        20000,40000),
  ('Curitiba','Alto Boqueirão',      'PR','Oportunidade','baixo','expansão','expansão','Periferia sul. Renda baixa.',          20000,40000),
  ('Curitiba','Parolin',             'PR','Oportunidade','baixo','expansão','expansão','Vulnerável. Renda baixa.',             20000,40000),
  ('Curitiba','Pinheirinho',         'PR','Oportunidade','baixo','expansão','expansão','Periferia sul. Renda baixa.',          20000,40000),
  ('Curitiba','Cidade Industrial',   'PR','Oportunidade','baixo','expansão','expansão','CIC. Industrial. Renda operária.',     20000,40000),
  ('Curitiba','Augusta',             'PR','Oportunidade','baixo','expansão','expansão','Periferia CIC.',                       20000,40000),
  -- PERIFÉRICO
  ('Curitiba','Sítio Cercado',       'PR','Periférico com potencial','baixo','expansão','expansão','Popular. Renda baixa. Grande população.',15000,35000),
  ('Curitiba','Tatuquara',           'PR','Periférico com potencial','baixo','expansão','expansão','Menor renda de Curitiba. Social baixo.',10000,30000),
  ('Curitiba','Ganchinho',           'PR','Periférico com potencial','baixo','expansão','expansão','Muito periférico. Renda baixíssima.',   10000,25000),
  ('Curitiba','Umbará',              'PR','Periférico com potencial','baixo','expansão','expansão','Muito periférico. Renda baixa.',        10000,25000)
) AS v(cidade, bairro, estado, classificacao, potencial, zona, status_regiao, descricao, fmin, fmax)
WHERE NOT EXISTS (
  SELECT 1 FROM regioes_estrategicas r
  WHERE r.cidade = v.cidade AND lower(r.bairro) = lower(v.bairro)
);

-- ────────────────────────────────────────────────────────────
-- 5. GRANDE CURITIBA — municípios
-- ────────────────────────────────────────────────────────────
INSERT INTO regioes_estrategicas
  (cidade, bairro, estado, classificacao, potencial, zona, status_regiao, descricao, faixa_valor_min, faixa_valor_max)
SELECT v.cidade, v.bairro, v.estado,
       v.classificacao::TEXT, v.potencial::TEXT, v.zona::TEXT,
       v.status_regiao::TEXT, v.descricao,
       v.fmin::INTEGER, v.fmax::INTEGER
FROM (VALUES
  ('São José dos Pinhais',NULL,      'PR','B+',          'médio','expansão','expansão','Aeroporto. Polo industrial. Renda sólida.',     50000,80000),
  ('São José dos Pinhais','Afonso Pena','PR','A-',       'médio','expansão','expansão','Melhor bairro. Condomínios. Classe média-alta.',80000,150000),
  ('São José dos Pinhais','Centro',  'PR','B+',          'médio','expansão','expansão','Urbano. Classe média.',                         50000,80000),
  ('Pinhais',NULL,                   'PR','B+',          'médio','expansão','expansão','Conurbado com Curitiba. Classe média.',         50000,80000),
  ('Colombo',NULL,                   'PR','Oportunidade','baixo','expansão','expansão','Popular. Cidade dormitório. Renda modesta.',    25000,50000),
  ('Almirante Tamandaré',NULL,       'PR','Oportunidade','baixo','expansão','expansão','Popular. Dormitório. Renda baixa.',             20000,45000),
  ('Fazenda Rio Grande',NULL,        'PR','Oportunidade','baixo','expansão','expansão','Popular. Crescimento rápido. Renda baixa.',     20000,45000),
  ('Araucária',NULL,                 'PR','B',            'baixo','expansão','expansão','Industrial (Repar). Renda mediana.',            30000,50000),
  ('Campo Largo',NULL,               'PR','B+',          'médio','expansão','expansão','Cerâmica. Classe média. Qualidade de vida boa.',50000,80000),
  ('Campo Magro',NULL,               'PR','B',            'baixo','expansão','expansão','Rural/periférico. Renda baixa.',               25000,45000),
  ('Quatro Barras',NULL,             'PR','B',            'baixo','expansão','expansão','Pequeno. Industrial. Renda mediana.',           25000,45000),
  ('Piraquara',NULL,                 'PR','Periférico com potencial','baixo','expansão','expansão','Mananciais. Renda baixa. Dormitório.',15000,35000),
  ('Mandirituba',NULL,               'PR','B',            'baixo','expansão','expansão','Rural. Renda baixa.',                          20000,40000)
) AS v(cidade, bairro, estado, classificacao, potencial, zona, status_regiao, descricao, fmin, fmax)
WHERE NOT EXISTS (
  SELECT 1 FROM regioes_estrategicas r
  WHERE r.cidade = v.cidade
    AND (
      (v.bairro IS NULL AND r.bairro IS NULL)
      OR (v.bairro IS NOT NULL AND r.bairro IS NOT NULL AND lower(r.bairro) = lower(v.bairro))
    )
);

-- ────────────────────────────────────────────────────────────
-- 6. GOIÂNIA — setores/bairros (city-level já no seed)
-- ────────────────────────────────────────────────────────────
INSERT INTO regioes_estrategicas
  (cidade, bairro, estado, classificacao, potencial, zona, status_regiao, descricao, faixa_valor_min, faixa_valor_max)
SELECT v.cidade, v.bairro, v.estado,
       v.classificacao::TEXT, v.potencial::TEXT, v.zona::TEXT,
       v.status_regiao::TEXT, v.descricao,
       v.fmin::INTEGER, v.fmax::INTEGER
FROM (VALUES
  -- PREMIUM
  ('Goiânia','Setor Marista',                'GO','Premium A+','alto','expansão','expansão','m² R$11k–R$12k. Mais caro da cidade. Altíssima renda.',300000,600000),
  ('Goiânia','Alphaville Flamboyant',        'GO','Premium A+','alto','expansão','expansão','Condomínios horizontais de luxo. Altíssima renda.',   300000,700000),
  ('Goiânia','Setor Bueno',                  'GO','Premium A', 'alto','expansão','expansão','m² R$9,5k–R$11k. Muito valorizado.',                   150000,300000),
  ('Goiânia','Setor Sul',                    'GO','Premium A', 'alto','expansão','expansão','m² R$10,6k. Design urbano histórico. Altíssima renda.',150000,300000),
  ('Goiânia','Aldeia do Vale',               'GO','Premium A', 'alto','expansão','expansão','Condomínio horizontal de luxo. Segunda residência.',   200000,400000),
  -- ALTA (A-)
  ('Goiânia','Jardim Goiás',                 'GO','A-','médio','expansão','expansão','m² R$9,5k. Próximo Flamboyant. Alta renda.',          100000,200000),
  ('Goiânia','Setor Oeste',                  'GO','A-','médio','expansão','expansão','m² R$8k–R$11k. Maior valorização 2024 (22,7%). Histórico.',80000,180000),
  ('Goiânia','Jardim América',               'GO','A-','médio','expansão','expansão','m² R$8k. Tradicional. Bem localizado.',               80000,150000),
  ('Goiânia','Setor Pedro Ludovico',         'GO','A-','médio','expansão','expansão','Nobre. Histórico. Residencial de qualidade.',          80000,150000),
  ('Goiânia','Setor Bela Vista',             'GO','A-','médio','expansão','expansão','Residencial. Boa renda. Bem localizado.',              80000,150000),
  ('Goiânia','Jardim Guanabara',             'GO','A-','médio','expansão','expansão','Tradicional. Classe média-alta.',                     80000,150000),
  ('Goiânia','Setor Nova Suíça',             'GO','A-','médio','expansão','expansão','Residencial. Bom padrão.',                            80000,150000),
  ('Goiânia','Setor Jaó',                   'GO','A-','médio','expansão','expansão','Residencial. Bom padrão. Próximo do sul nobre.',      80000,150000),
  ('Goiânia','Setor Bougainville',           'GO','A-','médio','expansão','expansão','Condomínios. Alta renda. Em expansão.',               80000,150000),
  ('Goiânia','Park Lozandes',                'GO','A-','médio','expansão','expansão','Polo empresarial. Condomínios verticais de alto padrão.',80000,180000),
  -- MÉDIO-ALTO (B+)
  ('Goiânia','Setor Central',                'GO','B+','médio','expansão','expansão','Urbano. Comercial. Classe média.',                    50000,80000),
  ('Goiânia','Setor Leste Universitário',    'GO','B+','médio','expansão','expansão','Universitário. Classe média.',                        50000,80000),
  ('Goiânia','Setor Campinas',               'GO','B+','médio','expansão','expansão','Tradicional. Classe média.',                          50000,80000),
  ('Goiânia','Setor Coimbra',                'GO','B+','médio','expansão','expansão','Residencial. Classe média.',                          50000,80000),
  ('Goiânia','Setor Aeroporto',              'GO','B+','médio','expansão','expansão','Bem localizado. Classe média.',                       50000,80000),
  ('Goiânia','Setor dos Funcionários',       'GO','B+','médio','expansão','expansão','Classe média. Bem localizado.',                       50000,80000),
  ('Goiânia','Setor Universitário',          'GO','B+','médio','expansão','expansão','Universitário. Classe média.',                        50000,80000),
  -- MÉDIO (B)
  ('Goiânia','Setor Negrão de Lima',         'GO','B','baixo','expansão','expansão','Popular/médio. Norte.',                               30000,50000),
  ('Goiânia','Parque Amazônia',              'GO','B','baixo','expansão','expansão','Classe média-baixa. Popular.',                        30000,50000),
  ('Goiânia','Setor Vila Rosa',              'GO','B','baixo','expansão','expansão','Classe média-baixa.',                                 30000,50000),
  ('Goiânia','Jardim Curitiba',              'GO','B','baixo','expansão','expansão','Popular. Renda mediana.',                             30000,50000),
  ('Goiânia','Setor Morada do Sol',          'GO','B','baixo','expansão','expansão','Popular/médio.',                                      30000,50000),
  ('Goiânia','Setor Criméia Leste',          'GO','B','baixo','expansão','expansão','Classe média-baixa.',                                 30000,50000),
  ('Goiânia','Setor Criméia Oeste',          'GO','B','baixo','expansão','expansão','Classe média-baixa.',                                 30000,50000),
  ('Goiânia','Jardim Novo Mundo',            'GO','B','baixo','expansão','expansão','Popular/médio. Leste.',                               30000,50000),
  -- BAIXO
  ('Goiânia','Setor Norte Ferroviário',      'GO','Oportunidade','baixo','expansão','expansão','Popular. Periferia norte.',  25000,50000),
  ('Goiânia','Setor Recanto do Bosque',      'GO','Oportunidade','médio','expansão','expansão','Condomínios misturados. Qualificação necessária.',30000,60000),
  ('Goiânia','Jardim Nova Esperança',        'GO','Periférico com potencial','baixo','expansão','expansão','Periferia. Renda baixa.',15000,35000),
  ('Goiânia','Setor Perim',                  'GO','Periférico com potencial','baixo','expansão','expansão','Periferia. Renda baixa.',15000,35000),
  ('Goiânia','Jardim Balneário Meia Ponte',  'GO','Periférico com potencial','baixo','expansão','expansão','Extremo. Renda baixa.',10000,30000)
) AS v(cidade, bairro, estado, classificacao, potencial, zona, status_regiao, descricao, fmin, fmax)
WHERE NOT EXISTS (
  SELECT 1 FROM regioes_estrategicas r
  WHERE r.cidade = v.cidade AND lower(r.bairro) = lower(v.bairro)
);

-- ────────────────────────────────────────────────────────────
-- 7. GRANDE GOIÂNIA — municípios
-- ────────────────────────────────────────────────────────────
INSERT INTO regioes_estrategicas
  (cidade, bairro, estado, classificacao, potencial, zona, status_regiao, descricao, faixa_valor_min, faixa_valor_max)
SELECT v.cidade, v.bairro, v.estado,
       v.classificacao::TEXT, v.potencial::TEXT, v.zona::TEXT,
       v.status_regiao::TEXT, v.descricao,
       v.fmin::INTEGER, v.fmax::INTEGER
FROM (VALUES
  ('Aparecida de Goiânia',NULL,                       'GO','Oportunidade','baixo','expansão','expansão','Cidade dormitório. Renda baixa. Qualificação necessária.',25000,50000),
  ('Aparecida de Goiânia','Jardim Tiradentes',        'GO','B',           'baixo','expansão','expansão','Melhor área. Algum potencial.',                           30000,50000),
  ('Aparecida de Goiânia','Papillon Park',            'GO','Oportunidade','médio','expansão','expansão','Condomínios de médio padrão. Qualificação necessária.',   40000,80000),
  ('Aparecida de Goiânia','Residencial Buena Vista',  'GO','Oportunidade','médio','expansão','expansão','Condomínios. Crescimento recente.',                       40000,80000),
  ('Trindade',NULL,                                   'GO','Oportunidade','baixo','expansão','expansão','Religiosa/turística. Renda modesta.',                     20000,45000),
  ('Senador Canedo',NULL,                             'GO','Oportunidade','médio','expansão','expansão','Crescimento 84% 2010–22. Condomínios emergentes. Qualificação necessária.',40000,80000),
  ('Goianira',NULL,                                   'GO','Oportunidade','baixo','expansão','expansão','Dormitório. Renda baixa.',                                20000,40000),
  ('Nerópolis',NULL,                                  'GO','B',           'baixo','expansão','expansão','Pequeno. Renda baixa.',                                   20000,40000),
  ('Hidrolândia',NULL,                                'GO','B',           'baixo','expansão','expansão','Rural. Renda baixa. Pouco mercado.',                      20000,40000)
) AS v(cidade, bairro, estado, classificacao, potencial, zona, status_regiao, descricao, fmin, fmax)
WHERE NOT EXISTS (
  SELECT 1 FROM regioes_estrategicas r
  WHERE r.cidade = v.cidade
    AND (
      (v.bairro IS NULL AND r.bairro IS NULL)
      OR (v.bairro IS NOT NULL AND r.bairro IS NOT NULL AND lower(r.bairro) = lower(v.bairro))
    )
);
