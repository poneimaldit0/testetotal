-- =====================================================
-- Migration: Corrigir visibilidade de equipe de marcenaria no RLS
-- =====================================================

-- 1. Criar função helper para verificar se usuário é da equipe de marcenaria
CREATE OR REPLACE FUNCTION public.is_gestor_ou_consultor_marcenaria()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND tipo_usuario IN ('gestor_marcenaria', 'consultor_marcenaria')
    AND status = 'ativo'
  );
END;
$$;

-- 2. Criar política RLS para permitir visibilidade entre equipe
CREATE POLICY "gestores_marcenaria_podem_ver_equipe"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_gestor_ou_consultor_marcenaria() 
  AND tipo_usuario IN ('gestor_marcenaria', 'consultor_marcenaria')
  AND status = 'ativo'
);

-- 3. Comentários para documentação
COMMENT ON FUNCTION public.is_gestor_ou_consultor_marcenaria IS 
'Verifica se o usuário logado é gestor ou consultor de marcenaria ativo';

COMMENT ON POLICY "gestores_marcenaria_podem_ver_equipe" ON public.profiles IS
'Permite que gestores e consultores de marcenaria vejam outros membros da equipe para apropriação de leads';