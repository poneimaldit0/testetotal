
-- Função para excluir orçamento (apenas admins)
CREATE OR REPLACE FUNCTION public.excluir_orcamento_admin(p_orcamento_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  orcamento_record RECORD;
  count_candidaturas integer;
  count_inscricoes integer;
  count_arquivos integer;
BEGIN
  -- Verificar se o usuário é admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Apenas administradores podem excluir orçamentos'
    );
  END IF;
  
  -- Verificar se o orçamento existe
  SELECT * INTO orcamento_record
  FROM public.orcamentos
  WHERE id = p_orcamento_id;
  
  IF orcamento_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Orçamento não encontrado'
    );
  END IF;
  
  -- Contar registros relacionados para logs
  SELECT COUNT(*) INTO count_candidaturas
  FROM public.candidaturas_fornecedores
  WHERE orcamento_id = p_orcamento_id;
  
  SELECT COUNT(*) INTO count_inscricoes
  FROM public.inscricoes_fornecedores
  WHERE orcamento_id = p_orcamento_id;
  
  SELECT COUNT(*) INTO count_arquivos
  FROM public.arquivos_orcamento
  WHERE orcamento_id = p_orcamento_id;
  
  -- Excluir dados relacionados em cascata
  DELETE FROM public.candidaturas_fornecedores WHERE orcamento_id = p_orcamento_id;
  DELETE FROM public.inscricoes_fornecedores WHERE orcamento_id = p_orcamento_id;
  DELETE FROM public.arquivos_orcamento WHERE orcamento_id = p_orcamento_id;
  
  -- Excluir o orçamento principal
  DELETE FROM public.orcamentos WHERE id = p_orcamento_id;
  
  -- Registrar log de exclusão
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (auth.uid(), 'exclusao_orcamento: ' || p_orcamento_id::text);
  
  -- Retornar sucesso com estatísticas
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Orçamento excluído com sucesso',
    'orcamento_id', p_orcamento_id,
    'candidaturas_removidas', count_candidaturas,
    'inscricoes_removidas', count_inscricoes,
    'arquivos_removidos', count_arquivos
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

-- Adicionar política RLS para permitir DELETE apenas para admins
CREATE POLICY "Admins can delete orcamentos" ON public.orcamentos
FOR DELETE TO authenticated
USING (public.is_admin());

-- Habilitar RLS na tabela orcamentos se ainda não estiver habilitado
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
