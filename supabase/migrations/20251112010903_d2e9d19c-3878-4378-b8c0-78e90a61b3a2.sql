-- Criar função genérica para atualizar updated_at
CREATE OR REPLACE FUNCTION public.atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo da tabela crm_orcamentos_tarefas
DROP TRIGGER IF EXISTS atualizar_updated_at_tarefas_crm ON public.crm_orcamentos_tarefas;

-- Criar novo trigger com a função genérica
CREATE TRIGGER atualizar_updated_at_tarefas_crm
  BEFORE UPDATE ON public.crm_orcamentos_tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_updated_at();