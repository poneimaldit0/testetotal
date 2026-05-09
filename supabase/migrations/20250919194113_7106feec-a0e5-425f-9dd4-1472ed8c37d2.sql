-- Criar função RPC para buscar itens do contrato
CREATE OR REPLACE FUNCTION buscar_itens_contrato(p_contrato_id UUID)
RETURNS TABLE (
  item_id UUID,
  categoria TEXT,
  nome TEXT,
  descricao TEXT,
  valor_estimado NUMERIC,
  ambientes TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rc.item_id,
    ci.categoria,
    ci.nome,
    COALESCE(ci.descricao, '') as descricao,
    rc.valor_estimado,
    rc.ambientes
  FROM respostas_checklist rc
  JOIN checklist_itens ci ON ci.id = rc.item_id
  JOIN checklist_propostas cp ON cp.id = rc.checklist_proposta_id
  JOIN candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
  JOIN contratos c ON c.orcamento_id = cf.orcamento_id AND c.fornecedor_id = cf.fornecedor_id
  WHERE c.id = p_contrato_id
    AND rc.incluido = true
    AND cp.status = 'enviada'
  ORDER BY ci.categoria, ci.ordem;
END;
$$;

-- Criar função para calcular percentual acumulado de um item
CREATE OR REPLACE FUNCTION calcular_percentual_acumulado_item(p_item_checklist_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path = public
AS $$
DECLARE
  percentual_total NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(mi.percentual_executado), 0)
  INTO percentual_total
  FROM medicoes_itens mi
  JOIN medicoes_obra mo ON mo.id = mi.medicao_id
  WHERE mi.item_checklist_id = p_item_checklist_id
    AND mo.status IN ('enviada', 'aprovada', 'paga');
  
  RETURN percentual_total;
END;
$$;