-- Sincronizar status de contratos com obras em andamento
-- Atualizar contratos que têm obras em andamento mas ainda estão aguardando assinatura

UPDATE contratos 
SET status_assinatura = 'assinado',
    data_assinatura_fornecedor = COALESCE(data_assinatura_fornecedor, now()),
    updated_at = now()
WHERE id IN (
  SELECT c.id 
  FROM contratos c
  JOIN obras o ON o.contrato_id = c.id 
  WHERE o.status = 'em_andamento' 
  AND c.status_assinatura = 'aguardando_assinatura'
);

-- Comentário: Esta migration corrige inconsistências onde obras já estão em andamento
-- mas os contratos ainda mostram status 'aguardando_assinatura'