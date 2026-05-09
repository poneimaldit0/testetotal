-- Remover a função antiga que usa o tipo enum (causando conflito de resolução)
DROP FUNCTION IF EXISTS public.atualizar_status_acompanhamento(uuid, status_acompanhamento_enum);

-- Verificar e remover também a versão duplicada de observações se existir
DROP FUNCTION IF EXISTS public.atualizar_observacoes_acompanhamento(uuid, status_acompanhamento_enum);