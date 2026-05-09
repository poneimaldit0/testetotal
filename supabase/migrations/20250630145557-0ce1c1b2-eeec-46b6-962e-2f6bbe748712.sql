
-- Atualizar a função handle_new_user para incluir telefone e empresa
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    nome,
    telefone,
    empresa,
    tipo_usuario,
    status,
    data_criacao,
    limite_acessos_diarios,
    limite_acessos_mensais
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.raw_user_meta_data ->> 'telefone',
    NEW.raw_user_meta_data ->> 'empresa',
    COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', 'fornecedor'),
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', 'fornecedor') = 'fornecedor' THEN 'pendente_aprovacao'
      ELSE 'ativo'
    END,
    NOW(),
    10,
    100
  );
  RETURN NEW;
END;
$$;
