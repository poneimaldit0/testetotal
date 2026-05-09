-- Migration: Preencher automaticamente usuario_id na tabela orcamentos
-- Data: 2025-01-10
-- Descrição: Adiciona trigger para garantir que usuario_id seja sempre preenchido ao criar orçamento

-- Função para preencher usuario_id automaticamente
CREATE OR REPLACE FUNCTION public.set_usuario_id_orcamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Se usuario_id não foi fornecido, preencher com auth.uid()
  IF NEW.usuario_id IS NULL THEN
    NEW.usuario_id := auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar antes de INSERT
DROP TRIGGER IF EXISTS trigger_set_usuario_id_orcamento ON public.orcamentos;

CREATE TRIGGER trigger_set_usuario_id_orcamento
  BEFORE INSERT ON public.orcamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_usuario_id_orcamento();

-- Comentário da função
COMMENT ON FUNCTION public.set_usuario_id_orcamento() IS 
'Preenche automaticamente usuario_id com auth.uid() ao criar orçamento';

-- Script opcional: Atualizar registros existentes sem usuario_id
UPDATE public.orcamentos
SET usuario_id = gestor_conta_id
WHERE usuario_id IS NULL 
  AND gestor_conta_id IS NOT NULL;

-- Log da operação
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.orcamentos
  WHERE usuario_id IS NOT NULL;
  
  RAISE NOTICE 'Total de orçamentos com usuario_id preenchido: %', v_count;
END $$;