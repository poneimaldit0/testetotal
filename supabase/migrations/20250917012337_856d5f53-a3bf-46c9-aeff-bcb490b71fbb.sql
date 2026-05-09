-- Dropar função existente para poder recriar com novo tipo de retorno
DROP FUNCTION IF EXISTS buscar_proposta_por_codigos(text, text);

-- Função para extrair código do UUID do orçamento (8 caracteres)
CREATE OR REPLACE FUNCTION extrair_codigo_orcamento(orcamento_uuid uuid)
RETURNS text AS $$
BEGIN
  RETURN UPPER(SUBSTRING(REPLACE(orcamento_uuid::text, '-', ''), 1, 8));
END;
$$ LANGUAGE plpgsql;

-- Atualizar todos os orçamentos existentes com códigos
UPDATE orcamentos 
SET codigo_orcamento = extrair_codigo_orcamento(id)
WHERE codigo_orcamento IS NULL;

-- Trigger para gerar código automaticamente em novos orçamentos
CREATE OR REPLACE FUNCTION gerar_codigo_orcamento_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo_orcamento IS NULL THEN
    NEW.codigo_orcamento := extrair_codigo_orcamento(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para novos orçamentos
DROP TRIGGER IF EXISTS trigger_gerar_codigo_orcamento ON orcamentos;
CREATE TRIGGER trigger_gerar_codigo_orcamento
  BEFORE INSERT ON orcamentos
  FOR EACH ROW
  EXECUTE FUNCTION gerar_codigo_orcamento_trigger();

-- Função para gerar código do fornecedor (6 caracteres aleatórios)
CREATE OR REPLACE FUNCTION gerar_codigo_fornecedor()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := 'FORN';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Gerar códigos de acesso para todas as candidaturas existentes que não têm
INSERT INTO codigos_acesso_propostas (orcamento_id, candidatura_id, codigo_orcamento, codigo_fornecedor)
SELECT 
  cf.orcamento_id,
  cf.id as candidatura_id,
  o.codigo_orcamento,
  gerar_codigo_fornecedor()
FROM candidaturas_fornecedores cf
JOIN orcamentos o ON o.id = cf.orcamento_id
WHERE NOT EXISTS (
  SELECT 1 FROM codigos_acesso_propostas cap 
  WHERE cap.candidatura_id = cf.id
)
AND cf.data_desistencia IS NULL;

-- Função RPC para buscar proposta por códigos (corrigida)
CREATE OR REPLACE FUNCTION buscar_proposta_por_codigos(
  p_codigo_orcamento text,
  p_codigo_fornecedor text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resultado json;
BEGIN
  SELECT json_build_object(
    'id', cap.id,
    'candidatura_id', cf.id,
    'codigo_orcamento', cap.codigo_orcamento,
    'codigo_fornecedor', cap.codigo_fornecedor,
    'orcamento', json_build_object(
      'id', o.id,
      'necessidade', o.necessidade,
      'local', o.local,
      'categorias', o.categorias,
      'tamanho_imovel', o.tamanho_imovel,
      'data_publicacao', o.data_publicacao,
      'prazo_inicio_texto', o.prazo_inicio_texto
    ),
    'candidatura', json_build_object(
      'id', cf.id,
      'fornecedor_id', cf.fornecedor_id,
      'nome', cf.nome,
      'email', cf.email,
      'empresa', cf.empresa,
      'telefone', cf.telefone,
      'data_candidatura', cf.data_candidatura,
      'status_acompanhamento', cf.status_acompanhamento
    ),
    'proposta', COALESCE(
      (SELECT json_build_object(
        'valor_total_estimado', cp.valor_total_estimado,
        'status', CASE WHEN cp.id IS NOT NULL THEN 'enviada' ELSE 'nao_enviada' END,
        'observacoes', cp.observacoes_gerais,
        'categorias', cp.dados_proposta
      )
      FROM checklist_propostas cp 
      WHERE cp.candidatura_id = cf.id 
      LIMIT 1),
      json_build_object(
        'valor_total_estimado', 0,
        'status', 'nao_enviada',
        'observacoes', null,
        'categorias', '{}'::json
      )
    ),
    'codigo_info', json_build_object(
      'visualizacoes', cap.visualizacoes,
      'expires_at', cap.expires_at
    )
  )
  INTO resultado
  FROM codigos_acesso_propostas cap
  JOIN candidaturas_fornecedores cf ON cf.id = cap.candidatura_id
  JOIN orcamentos o ON o.id = cap.orcamento_id
  WHERE UPPER(cap.codigo_orcamento) = UPPER(p_codigo_orcamento)
    AND UPPER(cap.codigo_fornecedor) = UPPER(p_codigo_fornecedor)
    AND cap.expires_at > now()
  LIMIT 1;

  -- Incrementar visualizações se encontrou
  IF resultado IS NOT NULL THEN
    UPDATE codigos_acesso_propostas 
    SET visualizacoes = visualizacoes + 1,
        ultimo_acesso = now()
    WHERE UPPER(codigo_orcamento) = UPPER(p_codigo_orcamento)
      AND UPPER(codigo_fornecedor) = UPPER(p_codigo_fornecedor);
  END IF;

  RETURN resultado;
END;
$$;