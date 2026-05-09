-- Função SECURITY DEFINER para buscar nome do concierge de forma segura
-- Só retorna se o fornecedor estiver inscrito no orçamento

CREATE OR REPLACE FUNCTION get_concierge_para_fornecedor(p_orcamento_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_concierge_nome text;
BEGIN
  -- Verificar se o fornecedor está inscrito no orçamento (ativo, sem desistência)
  IF NOT EXISTS (
    SELECT 1 FROM candidaturas_fornecedores cf
    WHERE cf.orcamento_id = p_orcamento_id
    AND cf.fornecedor_id = auth.uid()
    AND cf.data_desistencia IS NULL
  ) THEN
    RETURN NULL;
  END IF;

  -- Buscar o nome do concierge responsável
  SELECT p.nome INTO v_concierge_nome
  FROM orcamentos_crm_tracking oct
  JOIN profiles p ON p.id = oct.concierge_responsavel_id
  WHERE oct.orcamento_id = p_orcamento_id
  LIMIT 1;

  RETURN v_concierge_nome;
END;
$$;