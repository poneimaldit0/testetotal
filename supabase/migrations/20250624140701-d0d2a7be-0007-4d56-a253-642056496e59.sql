
-- Atualizar função para trabalhar com candidaturas_fornecedores
CREATE OR REPLACE FUNCTION public.atualizar_status_acompanhamento(
  p_inscricao_id uuid,
  p_novo_status status_acompanhamento_enum
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  candidatura_record RECORD;
BEGIN
  -- Verificar se a candidatura existe e pertence ao usuário logado
  SELECT * INTO candidatura_record
  FROM public.candidaturas_fornecedores
  WHERE id = p_inscricao_id 
    AND fornecedor_id = auth.uid();
  
  IF candidatura_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'inscription_not_found',
      'message', 'Candidatura não encontrada ou você não tem permissão para alterá-la'
    );
  END IF;
  
  -- Atualizar o status na tabela candidaturas_fornecedores
  UPDATE public.candidaturas_fornecedores
  SET status_acompanhamento = p_novo_status::text
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
