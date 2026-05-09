-- Migration: Permitir gestores de conta verem todos os orçamentos
-- Data: 2025-01-08
-- Objetivo: Dar visibilidade completa de orçamentos para gestores de conta

-- 1. Remover política restritiva atual
DROP POLICY IF EXISTS "Gestores de conta podem ver orçamentos apropriados ou criados por eles" 
ON public.orcamentos;

-- 2. Criar nova política permissiva para SELECT
CREATE POLICY "Gestores de conta podem ver todos os orçamentos"
ON public.orcamentos 
FOR SELECT 
TO authenticated
USING (
  -- Gestor de conta ativo pode ver todos os orçamentos
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.tipo_usuario = 'gestor_conta'
      AND profiles.status = 'ativo'
  )
);

-- 3. Adicionar comentário para documentação
COMMENT ON POLICY "Gestores de conta podem ver todos os orçamentos" 
ON public.orcamentos 
IS 'Permite que gestores de conta ativos vejam todos os orçamentos do sistema para melhor gestão e apropriação';