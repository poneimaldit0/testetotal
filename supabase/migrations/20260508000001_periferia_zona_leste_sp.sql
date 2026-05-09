-- Correção: periferia Zona Leste SP + fallback conservador
--
-- PROBLEMA: o fallback city-level de SP (bairro IS NULL) estava em B+
-- (R$50k–R$80k), elevando artificialmente o potencial de regiões periféricas
-- que não têm entrada explícita no banco.
--
-- SOLUÇÃO:
--   1. Baixar o fallback genérico de SP de B+ para B (mais conservador).
--   2. Inserir entradas explícitas para zonas periféricas da Zona Leste,
--      classificadas como 'Periférico com potencial' (ticket R$15k–R$40k).

-- ── 1. Fallback city-level SP: B+ → B ────────────────────────────────────────
-- Antes: B+ / médio / R$50k–R$80k
-- Depois: B / baixo / R$30k–R$50k
-- Justificativa: a maioria dos bairros SP não mapeados é de perfil médio-baixo;
-- B+ superestimava o potencial comercial de regiões periféricas.
UPDATE regioes_estrategicas
SET classificacao   = 'B',
    potencial       = 'baixo',
    descricao       = 'Bairro de São Paulo não mapeado individualmente. Classificação conservadora — qualifique perfil e orçamento disponível antes de iniciar cadência.',
    faixa_valor_min = 30000,
    faixa_valor_max = 50000
WHERE cidade = 'São Paulo'
  AND bairro IS NULL
  AND estado = 'SP';

-- ── 2. Zonas periféricas da Zona Leste ───────────────────────────────────────
-- Perfil socioeconômico inferior ao restante da capital.
-- Ticket de referência: R$15k–R$40k.
-- Nomes exatos conforme retorno do ViaCEP (ilike case-insensitive).
INSERT INTO regioes_estrategicas
  (cidade, bairro, estado, classificacao, potencial, zona, status_regiao, descricao, faixa_valor_min, faixa_valor_max)
VALUES
  ('São Paulo', 'Cidade Tiradentes',          'SP', 'Periférico com potencial', 'baixo', 'capital', 'ativa',
   'Região periférica da Zona Leste extrema. Ticket baixo — exige qualificação criteriosa de perfil e capacidade de investimento antes de qualquer cadência.',
   15000, 40000),

  ('São Paulo', 'Vila Progresso (Zona Leste)', 'SP', 'Periférico com potencial', 'baixo', 'capital', 'ativa',
   'Região periférica da Zona Leste. Ticket baixo — exige qualificação criteriosa de perfil e capacidade de investimento antes de qualquer cadência.',
   15000, 40000),

  ('São Paulo', 'Gleba do Pêssego',            'SP', 'Periférico com potencial', 'baixo', 'capital', 'ativa',
   'Região periférica da Zona Leste extrema. Ticket baixo — exige qualificação criteriosa de perfil e capacidade de investimento antes de qualquer cadência.',
   15000, 35000),

  ('São Paulo', 'Jardim Helena',               'SP', 'Periférico com potencial', 'baixo', 'capital', 'ativa',
   'Região periférica da Zona Leste. Ticket baixo — exige qualificação criteriosa de perfil e capacidade de investimento antes de qualquer cadência.',
   15000, 40000),

  ('São Paulo', 'Lajeado',                     'SP', 'Periférico com potencial', 'baixo', 'capital', 'ativa',
   'Região periférica da Zona Leste. Ticket baixo — exige qualificação criteriosa de perfil e capacidade de investimento antes de qualquer cadência.',
   15000, 40000),

  ('São Paulo', 'José Bonifácio',              'SP', 'Periférico com potencial', 'baixo', 'capital', 'ativa',
   'Região da Zona Leste. Perfil médio-baixo — qualificação de orçamento disponível obrigatória.',
   20000, 40000),

  ('São Paulo', 'São Miguel Paulista',          'SP', 'Periférico com potencial', 'baixo', 'capital', 'ativa',
   'Região da Zona Leste. Perfil predominantemente popular com bolsões pontuais de maior renda. Qualificação obrigatória antes de cadência.',
   15000, 40000),

  ('São Paulo', 'Itaim Paulista',              'SP', 'Periférico com potencial', 'baixo', 'capital', 'ativa',
   'Região periférica da Zona Leste. Ticket baixo — exige qualificação criteriosa de perfil e capacidade de investimento antes de qualquer cadência.',
   15000, 35000);
