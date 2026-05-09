-- Tabela de Controle Diário de Atualização do Fornecedor
CREATE TABLE controle_atualizacao_diaria_fornecedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_verificacao DATE NOT NULL,
  tipo_confirmacao TEXT NOT NULL DEFAULT 'individual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fornecedor_id, data_verificacao)
);

-- RLS Policies
ALTER TABLE controle_atualizacao_diaria_fornecedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fornecedor vê próprio controle"
  ON controle_atualizacao_diaria_fornecedor FOR SELECT
  USING (auth.uid() = fornecedor_id);

CREATE POLICY "Fornecedor insere próprio controle"
  ON controle_atualizacao_diaria_fornecedor FOR INSERT
  WITH CHECK (auth.uid() = fornecedor_id);

CREATE POLICY "Fornecedor atualiza próprio controle"
  ON controle_atualizacao_diaria_fornecedor FOR UPDATE
  USING (auth.uid() = fornecedor_id);

-- Índice para consultas por fornecedor e data
CREATE INDEX idx_controle_atualizacao_fornecedor_data 
  ON controle_atualizacao_diaria_fornecedor(fornecedor_id, data_verificacao DESC);

-- Função RPC para Buscar Pendências de Atualização
CREATE OR REPLACE FUNCTION verificar_pendencias_atualizacao_fornecedor(p_fornecedor_id UUID)
RETURNS TABLE (
  inscricao_id UUID,
  orcamento_id UUID,
  codigo_orcamento TEXT,
  cliente_nome TEXT,
  necessidade TEXT,
  local TEXT,
  status_acompanhamento TEXT,
  status_orcamento TEXT,
  data_candidatura TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cf.id AS inscricao_id,
    cf.orcamento_id,
    o.codigo_orcamento,
    (o.dados_contato->>'nome')::TEXT AS cliente_nome,
    o.necessidade,
    o.local,
    cf.status_acompanhamento,
    o.status AS status_orcamento,
    cf.data_candidatura
  FROM candidaturas_fornecedores cf
  INNER JOIN orcamentos o ON o.id = cf.orcamento_id
  WHERE cf.fornecedor_id = p_fornecedor_id
    AND o.status IN ('aberto', 'fechado')
    -- Exclui apenas os finalizados (negócio fechado ou perdido)
    AND (
      cf.status_acompanhamento IS NULL 
      OR cf.status_acompanhamento NOT IN ('negocio_fechado', 'negocio_perdido')
    )
    -- Inclui os que desistiu (sem filtro de data_desistencia)
  ORDER BY 
    CASE WHEN o.status = 'aberto' THEN 0 ELSE 1 END,
    cf.data_candidatura DESC;
END;
$$;

-- Função RPC para Contar Dias Consecutivos de Confirmação Rápida
CREATE OR REPLACE FUNCTION contar_dias_confirmacao_rapida_consecutivos(p_fornecedor_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dias_consecutivos INTEGER := 0;
  data_atual DATE := CURRENT_DATE - 1;
  registro RECORD;
BEGIN
  LOOP
    SELECT * INTO registro
    FROM controle_atualizacao_diaria_fornecedor
    WHERE fornecedor_id = p_fornecedor_id
      AND data_verificacao = data_atual;
    
    IF NOT FOUND OR registro.tipo_confirmacao != 'rapida' THEN
      EXIT;
    END IF;
    
    dias_consecutivos := dias_consecutivos + 1;
    data_atual := data_atual - 1;
  END LOOP;
  
  RETURN dias_consecutivos;
END;
$$;