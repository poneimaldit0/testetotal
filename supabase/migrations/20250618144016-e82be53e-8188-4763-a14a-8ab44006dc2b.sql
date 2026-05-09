
-- Criar ENUM para os status de acompanhamento
CREATE TYPE status_acompanhamento_enum AS ENUM (
  '1_contato_realizado',
  '2_contato_realizado', 
  '3_contato_realizado',
  '4_contato_realizado',
  '5_contato_realizado',
  'cliente_respondeu_nao_agendou',
  'visita_agendada',
  'visita_realizada',
  'orcamento_enviado',
  'negocio_fechado',
  'negocio_perdido',
  'nao_respondeu_mensagens'
);

-- Adicionar coluna status_acompanhamento à tabela inscricoes_fornecedores
ALTER TABLE public.inscricoes_fornecedores 
ADD COLUMN status_acompanhamento status_acompanhamento_enum DEFAULT NULL;

-- Criar função para atualizar status de acompanhamento
CREATE OR REPLACE FUNCTION public.atualizar_status_acompanhamento(
  p_inscricao_id uuid,
  p_novo_status status_acompanhamento_enum
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inscricao_record RECORD;
BEGIN
  -- Verificar se a inscrição existe e pertence ao usuário logado
  SELECT * INTO inscricao_record
  FROM public.inscricoes_fornecedores
  WHERE id = p_inscricao_id 
    AND fornecedor_id = auth.uid();
  
  IF inscricao_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'inscription_not_found',
      'message', 'Inscrição não encontrada ou você não tem permissão para alterá-la'
    );
  END IF;
  
  -- Atualizar o status
  UPDATE public.inscricoes_fornecedores
  SET status_acompanhamento = p_novo_status
  WHERE id = p_inscricao_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Status atualizado com sucesso'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Erro interno: ' || SQLERRM
    );
END;
$$;
