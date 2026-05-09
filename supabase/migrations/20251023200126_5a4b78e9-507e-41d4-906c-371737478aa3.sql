-- Remover política RLS problemática que permite gestores verem todos os orçamentos
DROP POLICY IF EXISTS "Gestores de conta podem ver todos os orçamentos" ON public.orcamentos;

-- Criar nova política RLS com verificação de apropriação
CREATE POLICY "Gestores de conta podem ver orçamentos apropriados"
ON public.orcamentos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.tipo_usuario = 'gestor_conta'
      AND profiles.status = 'ativo'
  )
  AND (
    -- Orçamentos criados pelo próprio gestor
    usuario_id = auth.uid()
    OR
    -- Orçamentos apropriados para o gestor no CRM
    EXISTS (
      SELECT 1
      FROM orcamentos_crm_tracking oct
      WHERE oct.orcamento_id = orcamentos.id
        AND oct.concierge_responsavel_id = auth.uid()
    )
  )
);

-- Apropriar 37 orçamentos sem gestor para Cristine Carvalho
WITH orcamentos_sem_gestor AS (
  SELECT orcamento_id 
  FROM orcamentos_crm_tracking 
  WHERE concierge_responsavel_id IS NULL 
  ORDER BY created_at DESC
  LIMIT 37
)
UPDATE orcamentos_crm_tracking
SET concierge_responsavel_id = '4312c123-34e5-4a61-a640-1c0e9eef845b',
    updated_at = NOW()
WHERE orcamento_id IN (SELECT orcamento_id FROM orcamentos_sem_gestor);