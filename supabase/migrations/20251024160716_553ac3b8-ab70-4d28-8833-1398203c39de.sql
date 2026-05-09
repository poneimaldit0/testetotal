-- PASSO 1: Remover política problemática que causa recursão infinita
DROP POLICY IF EXISTS "SDR podem ver dados de gestores de conta" ON public.profiles;

-- PASSO 2: Criar função auxiliar is_sdr() (SECURITY DEFINER para bypass RLS)
CREATE OR REPLACE FUNCTION public.is_sdr()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND tipo_usuario = 'sdr'
      AND status = 'ativo'
  );
$function$;

-- PASSO 3: Criar política correta usando a função is_sdr()
CREATE POLICY "SDR podem ver dados de gestores de conta"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- SDR pode ver perfis de gestores, admins e masters
  (
    public.is_sdr()
    AND tipo_usuario IN ('gestor_conta', 'admin', 'master')
  )
);