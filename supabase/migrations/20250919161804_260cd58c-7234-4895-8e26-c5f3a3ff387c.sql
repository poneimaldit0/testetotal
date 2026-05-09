-- Correção direta para o cliente wufcio@bloggingideas.site
-- Atualizar o email no auth.users para permitir login com email correto

-- Buscar o auth_user_id do cliente com problema
DO $$
DECLARE
    v_auth_user_id uuid;
    v_client_email text := 'wufcio@bloggingideas.site';
BEGIN
    -- Encontrar o auth_user_id do cliente
    SELECT auth_user_id INTO v_auth_user_id
    FROM public.clientes
    WHERE email = v_client_email;
    
    IF v_auth_user_id IS NOT NULL THEN
        -- Atualizar o email no auth.users para o email correto do cliente
        UPDATE auth.users
        SET email = v_client_email,
            raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('email_original', v_client_email),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            updated_at = now()
        WHERE id = v_auth_user_id;
        
        -- Log da correção
        INSERT INTO public.logs_acesso (user_id, acao)
        VALUES (
            v_auth_user_id,
            'correcao_email_auth: email corrigido para ' || v_client_email
        );
        
        RAISE NOTICE 'Email corrigido no auth.users para cliente: % (auth_user_id: %)', v_client_email, v_auth_user_id;
    ELSE
        RAISE NOTICE 'Cliente não encontrado: %', v_client_email;
    END IF;
END
$$;