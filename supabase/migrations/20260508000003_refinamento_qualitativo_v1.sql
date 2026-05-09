-- Refinamento qualitativo v1 -- correcoes baseadas em dados de mercado 2024-2025
-- Fontes: FipeZap, VivaReal, ITBI SP, dados regionais atualizados
--
-- CRITERIO: conservadorismo como regra. Corrigir apenas casos de distorcao
-- clara e validada por pesquisa de mercado.
--
-- 16 correcoes: SP capital (11), Curitiba (4), Santos (1), Grande SP/Guarulhos (1)

-- ============================================================================
-- SAO PAULO CAPITAL -- subavaliados
-- ============================================================================

-- Morumbi: B+ -> Premium A
-- Maior distorcao da base. Condominios fechados, mansoes historicas,
-- m2 ate R$70k (Fasano). Ticket B+ (R$50k-80k) e impossivel nessa regiao.
UPDATE regioes_estrategicas
SET classificacao   = 'Premium A',
    potencial       = 'alto',
    faixa_valor_min = 150000,
    faixa_valor_max = 300000,
    descricao       = 'Bairro residencial de alto padrao. Condominios fechados, mansoes e apartamentos de luxo. Ticket real de reforma acima de R$150k.'
WHERE cidade = 'São Paulo' AND bairro = 'Morumbi' AND estado = 'SP';

-- Mooca: B+ -> A-
-- Gentrificacao consolidada. m2 entre R$3.953-7.920. Vilas operarias
-- transformadas em residencias de medio-alto padrao.
UPDATE regioes_estrategicas
SET classificacao   = 'A-',
    potencial       = 'médio',
    faixa_valor_min = 80000,
    faixa_valor_max = 150000,
    descricao       = 'Bairro em gentrificacao consolidada. Antigas vilas operarias transformadas em residencias de medio-alto padrao. Ticket A- justificado por dados FipeZap.'
WHERE cidade = 'São Paulo' AND bairro = 'Mooca' AND estado = 'SP';

-- Consolacao: B+ -> A-
-- Eixo Paulista/Augusta. Lancamentos acima de R$15k/m2, usados ate R$33k/m2.
UPDATE regioes_estrategicas
SET classificacao   = 'A-',
    potencial       = 'médio',
    faixa_valor_min = 80000,
    faixa_valor_max = 150000,
    descricao       = 'Bairro central no eixo Paulista/Augusta. Gentrificacao avancada com m2 acima de R$8k. Ticket A- consolidado em 2024-2025.'
WHERE cidade = 'São Paulo' AND bairro = 'Consolação' AND estado = 'SP';

-- Planalto Paulista: B+ -> A-
-- Proximo a Moema/Congonhas, m2 medio R$14.252/m2 (FipeZap 2024).
UPDATE regioes_estrategicas
SET classificacao   = 'A-',
    potencial       = 'médio',
    faixa_valor_min = 80000,
    faixa_valor_max = 150000,
    descricao       = 'Bairro residencial de medio-alto padrao proximo a Moema e Congonhas. m2 acima de R$14k (FipeZap 2024). Ticket A- justificado.'
WHERE cidade = 'São Paulo' AND bairro = 'Planalto Paulista' AND estado = 'SP';

-- Saude: B+ -> A-
-- m2 medio R$11.619/m2. Zona Sul classe media-alta consolidada.
UPDATE regioes_estrategicas
SET classificacao   = 'A-',
    potencial       = 'médio',
    faixa_valor_min = 80000,
    faixa_valor_max = 150000,
    descricao       = 'Bairro residencial de medio-alto padrao na Zona Sul. m2 acima de R$11k (2024). Ticket A- conservador e correto.'
WHERE cidade = 'São Paulo' AND bairro = 'Saúde' AND estado = 'SP';

-- Jardim da Saude: B+ -> A-
-- Boa infraestrutura (Metro Linha 1, proximo ao Ibirapuera). m2 consolidado.
UPDATE regioes_estrategicas
SET classificacao   = 'A-',
    potencial       = 'médio',
    faixa_valor_min = 80000,
    faixa_valor_max = 150000,
    descricao       = 'Bairro residencial consolidado proximo a Vila Mariana e Ibirapuera. Medio-alto padrao com ticket A- adequado.'
WHERE cidade = 'São Paulo' AND bairro = 'Jardim da Saúde' AND estado = 'SP';

-- ============================================================================
-- SAO PAULO CAPITAL -- superavaliados (Premium A que sao A- na realidade)
-- ============================================================================

-- Sumare: Premium A -> A-
-- m2 na planta R$19.487/m2 mas bairro misto. Perdizes/Pinheiros proximos
-- inflavam percepcao, mas padrao real e heterogeneo.
UPDATE regioes_estrategicas
SET classificacao   = 'A-',
    potencial       = 'médio',
    faixa_valor_min = 80000,
    faixa_valor_max = 150000,
    descricao       = 'Bairro misto com bolsoes de alto padrao proximos a Perdizes. Heterogeneidade relevante -- A- conservador. Qualificar perfil antes de cadencia premium.'
WHERE cidade = 'São Paulo' AND bairro = 'Sumaré' AND estado = 'SP';

-- Brooklin: Premium A -> A-
-- ITBI R$8.439/m2 (+52% acima media). Brooklin Velho (casas antigas) coexiste
-- com Brooklin Novo (premium Faria Lima). A- e a classificacao segura.
UPDATE regioes_estrategicas
SET classificacao   = 'A-',
    potencial       = 'médio',
    faixa_valor_min = 80000,
    faixa_valor_max = 150000,
    descricao       = 'Bairro misto: Brooklin Novo (premium, Faria Lima) convive com Brooklin Velho (medio padrao). A- conservador -- distinguir sub-area antes de cadencia Premium.'
WHERE cidade = 'São Paulo' AND bairro = 'Brooklin' AND estado = 'SP';

-- Granja Julieta: Premium A -> A-
-- m2 na planta R$13.135/m2, abaixo da media de lancamentos premium de SP.
UPDATE regioes_estrategicas
SET classificacao   = 'A-',
    potencial       = 'médio',
    faixa_valor_min = 80000,
    faixa_valor_max = 150000,
    descricao       = 'Bairro residencial de medio-alto padrao adjacente a Chacara Flora. m2 abaixo da media premium de SP. A- mais conservador e correto que Premium A.'
WHERE cidade = 'São Paulo' AND bairro = 'Granja Julieta' AND estado = 'SP';

-- Perdizes: Premium A -> A-
-- m2 R$5.379-13.107/m2 (variavel). Medio-alto consolidado, nao premium uniforme.
-- Casas antigas e apartamentos mistos rebaixam o ticket real.
UPDATE regioes_estrategicas
SET classificacao   = 'A-',
    potencial       = 'médio',
    faixa_valor_min = 80000,
    faixa_valor_max = 150000,
    descricao       = 'Bairro residencial consolidado de medio-alto padrao. m2 variavel (R$5k-13k). Casas antigas e apartamentos mistos -- A- conservador mais preciso que Premium A.'
WHERE cidade = 'São Paulo' AND bairro = 'Perdizes' AND estado = 'SP';

-- ============================================================================
-- CURITIBA -- superavaliados (A- que sao B+ na realidade)
-- ============================================================================

-- Bacacheri: A- -> B+
-- m2 R$7.983/m2 (4% abaixo da media de Curitiba). Medio-alto, nao A-.
UPDATE regioes_estrategicas
SET classificacao   = 'B+',
    potencial       = 'médio',
    faixa_valor_min = 50000,
    faixa_valor_max = 80000,
    descricao       = 'Bairro residencial medio em Curitiba. m2 abaixo da media da cidade (R$7.983/m2). B+ mais realista que A- anterior. Qualificacao recomendada.'
WHERE cidade = 'Curitiba' AND bairro = 'Bacacheri' AND estado = 'PR';

-- Sao Braz: A- -> B+
-- Perfil popular/medio confirmado por dados de preco. Nao suporta A-.
UPDATE regioes_estrategicas
SET classificacao   = 'B+',
    potencial       = 'médio',
    faixa_valor_min = 50000,
    faixa_valor_max = 80000,
    descricao       = 'Bairro residencial medio em Curitiba. Perfil popular-medio confirmado por dados de mercado -- B+ mais preciso que A- anterior.'
WHERE cidade = 'Curitiba' AND bairro = 'São Braz' AND estado = 'PR';

-- Sao Francisco: A- -> B+
-- Bairro historico/bohemio proximo ao Centro CWB. Heterogeneo, jovem.
UPDATE regioes_estrategicas
SET classificacao   = 'B+',
    potencial       = 'médio',
    faixa_valor_min = 50000,
    faixa_valor_max = 80000,
    descricao       = 'Bairro historico e boemia proximo ao Centro CWB. Perfil cultural jovem e heterogeneo -- B+ mais conservador e correto que A-.'
WHERE cidade = 'Curitiba' AND bairro = 'São Francisco' AND estado = 'PR';

-- Lamenha Pequena: B+ -> B
-- Area rural/periurbana no limite de Curitiba (5,9km2). Baixa densidade.
UPDATE regioes_estrategicas
SET classificacao   = 'B',
    potencial       = 'baixo',
    faixa_valor_min = 30000,
    faixa_valor_max = 50000,
    descricao       = 'Area rural/periurbana no limite de Curitiba. Baixa densidade, terrenos grandes, perfil popular-rural. B e a classificacao adequada.'
WHERE cidade = 'Curitiba' AND bairro = 'Lamenha Pequena' AND estado = 'PR';

-- ============================================================================
-- SANTOS -- subavaliado
-- ============================================================================

-- Ponta da Praia: A- -> Premium A
-- m2 na planta R$15.817/m2 (+15% acima da media de Santos).
-- Bairro mais valorizado da cidade, frente ao oceano, condominios de alto padrao.
UPDATE regioes_estrategicas
SET classificacao   = 'Premium A',
    potencial       = 'alto',
    faixa_valor_min = 150000,
    faixa_valor_max = 300000,
    descricao       = 'Bairro mais valorizado de Santos. Frente ao oceano com condominios de alto padrao. m2 acima de R$15k (FipeZap 2024). Ticket Premium A fundamentado.'
WHERE cidade = 'Santos' AND bairro = 'Ponta da Praia' AND estado = 'SP';

-- ============================================================================
-- GRANDE SP / GUARULHOS -- superavaliado
-- ============================================================================

-- Jardim Maia (Guarulhos): A- -> B+
-- Mesmo sendo area valorizada localmente, Guarulhos nao sustenta ticket A-
-- de reforma (R$80k-150k). B+ e o teto realista para Grande SP periferica.
UPDATE regioes_estrategicas
SET classificacao   = 'B+',
    potencial       = 'médio',
    faixa_valor_min = 50000,
    faixa_valor_max = 80000,
    descricao       = 'Melhor area de Guarulhos, mas cidade como um todo nao sustenta ticket A- de reforma. B+ e o teto realista para Grande SP periferia. Qualificacao obrigatoria.'
WHERE cidade = 'Guarulhos' AND bairro = 'Jardim Maia' AND estado = 'SP';
