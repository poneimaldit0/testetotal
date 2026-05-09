-- Corrigir problema de movimentação de cards no CRM Kanban

-- 1. Preencher data_entrada_etapa NULL usando histórico
UPDATE orcamentos_crm_tracking t
SET data_entrada_etapa = (
  SELECT h.data_movimentacao
  FROM orcamentos_crm_historico h
  WHERE h.orcamento_id = t.orcamento_id
    AND h.etapa_nova = t.etapa_crm
  ORDER BY h.data_movimentacao DESC
  LIMIT 1
)
WHERE data_entrada_etapa IS NULL;

-- 2. Para orçamentos sem histórico, usar created_at do orçamento
UPDATE orcamentos_crm_tracking t
SET data_entrada_etapa = o.created_at
FROM orcamentos o
WHERE t.orcamento_id = o.id
  AND t.data_entrada_etapa IS NULL;

-- 3. Criar função para garantir data_entrada_etapa sempre preenchido
CREATE OR REPLACE FUNCTION public.set_data_entrada_etapa()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se data_entrada_etapa for NULL, preencher com NOW()
  IF NEW.data_entrada_etapa IS NULL THEN
    NEW.data_entrada_etapa := NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Criar trigger para preencher automaticamente
DROP TRIGGER IF EXISTS trigger_set_data_entrada_etapa ON orcamentos_crm_tracking;
CREATE TRIGGER trigger_set_data_entrada_etapa
  BEFORE INSERT OR UPDATE ON orcamentos_crm_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.set_data_entrada_etapa();