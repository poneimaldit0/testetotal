-- Atualizar função RPC para permitir Admin/CS atualizar status
CREATE OR REPLACE FUNCTION public.atualizar_status_acompanhamento(
  p_inscricao_id uuid, 
  p_novo_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidatura_record RECORD;
  user_is_admin BOOLEAN;
BEGIN
  -- Verificar se o usuário é admin/CS
  user_is_admin := is_admin();
  
  -- Verificar se a candidatura existe
  -- Para admin: qualquer candidatura
  -- Para fornecedor: apenas suas próprias
  IF user_is_admin THEN
    SELECT * INTO candidatura_record
    FROM public.candidaturas_fornecedores
    WHERE id = p_inscricao_id;
  ELSE
    SELECT * INTO candidatura_record
    FROM public.candidaturas_fornecedores
    WHERE id = p_inscricao_id 
      AND fornecedor_id = auth.uid();
  END IF;
  
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

-- Atualizar função RPC para permitir Admin/CS atualizar observações
CREATE OR REPLACE FUNCTION public.atualizar_observacoes_acompanhamento(
  p_inscricao_id uuid, 
  p_observacoes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidatura_record RECORD;
  user_is_admin BOOLEAN;
BEGIN
  -- Verificar se o usuário é admin/CS
  user_is_admin := is_admin();
  
  -- Verificar se a candidatura existe
  -- Para admin: qualquer candidatura
  -- Para fornecedor: apenas suas próprias
  IF user_is_admin THEN
    SELECT * INTO candidatura_record
    FROM public.candidaturas_fornecedores
    WHERE id = p_inscricao_id;
  ELSE
    SELECT * INTO candidatura_record
    FROM public.candidaturas_fornecedores
    WHERE id = p_inscricao_id 
      AND fornecedor_id = auth.uid();
  END IF;
  
  IF candidatura_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'inscription_not_found',
      'message', 'Candidatura não encontrada ou você não tem permissão para alterá-la'
    );
  END IF;
  
  -- Atualizar as observações na tabela candidaturas_fornecedores
  UPDATE public.candidaturas_fornecedores
  SET observacoes_acompanhamento = p_observacoes
  WHERE id = p_inscricao_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Observações atualizadas com sucesso'
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