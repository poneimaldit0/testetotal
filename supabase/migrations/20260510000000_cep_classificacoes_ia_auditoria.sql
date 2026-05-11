-- Adiciona campos de auditabilidade à tabela cep_classificacoes_ia
-- tipo_resultado: permite rastrear se a classificação foi validada, contextual, fallback ou necessita revisão
-- tem_coordenadas: indica se coordenadas GPS foram usadas na classificação original

ALTER TABLE cep_classificacoes_ia
  ADD COLUMN IF NOT EXISTS tipo_resultado TEXT
    CHECK (tipo_resultado IN ('validado', 'contextual', 'fallback', 'necessita_validacao')),
  ADD COLUMN IF NOT EXISTS tem_coordenadas BOOLEAN NOT NULL DEFAULT FALSE;

-- Atualizar registros existentes: derivar tipo_resultado a partir de confianca e inferencia_conservadora
UPDATE cep_classificacoes_ia
SET tipo_resultado = CASE
  WHEN confianca = 'insuficiente'                        THEN 'necessita_validacao'
  WHEN confianca = 'baixa'                               THEN 'fallback'
  WHEN inferencia_conservadora = TRUE OR confianca = 'media' THEN 'contextual'
  ELSE                                                        'validado'
END
WHERE tipo_resultado IS NULL;
