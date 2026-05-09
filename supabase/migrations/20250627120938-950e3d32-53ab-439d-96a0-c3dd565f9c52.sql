
-- Função para excluir usuário (somente admin)
CREATE OR REPLACE FUNCTION public.excluir_usuario_admin(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_record RECORD;
  count_inscricoes integer;
  count_candidaturas integer;
  count_logs integer;
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Apenas administradores podem excluir usuários'
    );
  END IF;
  
  -- Impedir que admin exclua a si mesmo
  IF p_user_id = auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'self_deletion',
      'message', 'Você não pode excluir sua própria conta'
    );
  END IF;
  
  -- Verificar se o usuário existe
  SELECT * INTO user_record
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF user_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Usuário não encontrado'
    );
  END IF;
  
  -- Contar registros relacionados para logs
  SELECT COUNT(*) INTO count_inscricoes
  FROM public.inscricoes_fornecedores
  WHERE fornecedor_id = p_user_id;
  
  SELECT COUNT(*) INTO count_candidaturas
  FROM public.candidaturas_fornecedores
  WHERE fornecedor_id = p_user_id;
  
  SELECT COUNT(*) INTO count_logs
  FROM public.logs_acesso
  WHERE user_id = p_user_id;
  
  -- Excluir dados relacionados em cascata
  DELETE FROM public.inscricoes_fornecedores WHERE fornecedor_id = p_user_id;
  DELETE FROM public.candidaturas_fornecedores WHERE fornecedor_id = p_user_id;
  DELETE FROM public.logs_acesso WHERE user_id = p_user_id;
  
  -- Excluir o perfil (isso vai fazer cascade delete no auth.users)
  DELETE FROM public.profiles WHERE id = p_user_id;
  
  -- Registrar log de exclusão
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (auth.uid(), 'exclusao_usuario: ' || p_user_id::text || ' (' || user_record.email || ')');
  
  -- Retornar sucesso com estatísticas
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Usuário excluído com sucesso',
    'user_id', p_user_id,
    'email', user_record.email,
    'inscricoes_removidas', count_inscricoes,
    'candidaturas_removidas', count_candidaturas,
    'logs_removidos', count_logs
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Erro interno do sistema: ' || SQLERRM
    );
END;
$function$;
