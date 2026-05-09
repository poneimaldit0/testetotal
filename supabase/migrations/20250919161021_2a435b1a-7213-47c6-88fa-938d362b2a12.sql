-- Função para identificar e corrigir contas com inconsistências de email
-- entre Supabase Auth e tabela profiles

CREATE OR REPLACE FUNCTION public.corrigir_inconsistencias_emails_clientes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  inconsistencia_record RECORD;
  total_corrigidas INTEGER := 0;
  total_encontradas INTEGER := 0;
  detalhes_correcoes JSONB[] := '{}';
BEGIN
  -- Verificar se é admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Apenas administradores podem executar correções de inconsistências'
    );
  END IF;

  -- Buscar clientes com inconsistências de email
  FOR inconsistencia_record IN 
    SELECT 
      c.id as cliente_id,
      c.nome as cliente_nome,
      c.email as email_correto_cliente,
      c.auth_user_id,
      p.email as email_profile_atual,
      p.nome as nome_profile_atual
    FROM public.clientes c
    JOIN public.profiles p ON p.id = c.auth_user_id
    WHERE c.email != p.email
      AND c.auth_user_id IS NOT NULL
  LOOP
    total_encontradas := total_encontradas + 1;
    
    -- Corrigir o email e nome no profile
    UPDATE public.profiles
    SET 
      email = inconsistencia_record.email_correto_cliente,
      nome = inconsistencia_record.cliente_nome,
      updated_at = now()
    WHERE id = inconsistencia_record.auth_user_id;
    
    -- Registrar a correção
    detalhes_correcoes := array_append(detalhes_correcoes, jsonb_build_object(
      'cliente_id', inconsistencia_record.cliente_id,
      'auth_user_id', inconsistencia_record.auth_user_id,
      'nome_cliente', inconsistencia_record.cliente_nome,
      'email_antes', inconsistencia_record.email_profile_atual,
      'email_depois', inconsistencia_record.email_correto_cliente
    ));
    
    total_corrigidas := total_corrigidas + 1;
    
    -- Log da correção
    INSERT INTO public.logs_acesso (user_id, acao)
    VALUES (
      inconsistencia_record.auth_user_id,
      'correcao_automatica_inconsistencia: email corrigido de ' || 
      inconsistencia_record.email_profile_atual || ' para ' || 
      inconsistencia_record.email_correto_cliente
    );
  END LOOP;

  -- Log da operação completa
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (
    auth.uid(),
    'correcao_inconsistencias_emails: ' || total_encontradas || ' encontradas, ' || 
    total_corrigidas || ' corrigidas'
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Correção de inconsistências concluída',
    'total_encontradas', total_encontradas,
    'total_corrigidas', total_corrigidas,
    'detalhes', detalhes_correcoes
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Erro na correção de inconsistências: ' || SQLERRM
    );
END;
$$;