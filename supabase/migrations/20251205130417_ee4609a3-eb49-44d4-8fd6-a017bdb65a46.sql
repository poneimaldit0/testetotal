-- Corrigir função obter_cadastros_pendentes para usar status = 'pendente_aprovacao'
DROP FUNCTION IF EXISTS public.obter_cadastros_pendentes();

CREATE OR REPLACE FUNCTION public.obter_cadastros_pendentes()
RETURNS TABLE (
  id UUID,
  email TEXT,
  nome TEXT,
  telefone TEXT,
  empresa TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário é admin, master ou customer_success
  IF NOT public.can_manage_suppliers() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.nome,
    p.telefone,
    p.empresa,
    p.created_at
  FROM profiles p
  WHERE p.status = 'pendente_aprovacao'
  ORDER BY p.created_at DESC;
END;
$$;