-- Função helper para verificar se usuário pode gerenciar fornecedores (CS, Admin ou Master)
CREATE OR REPLACE FUNCTION public.can_manage_suppliers()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND tipo_usuario IN ('master', 'admin', 'customer_success')
      AND status = 'ativo'
  )
$$;

-- Política: CS pode ver profiles de fornecedores (LEITURA APENAS)
CREATE POLICY "cs_can_view_fornecedores"
ON profiles
FOR SELECT
TO authenticated
USING (
  tipo_usuario = 'fornecedor' 
  AND public.can_manage_suppliers()
);

-- Política: CS pode atualizar profiles de fornecedores
CREATE POLICY "cs_can_update_fornecedores"
ON profiles
FOR UPDATE
TO authenticated
USING (
  tipo_usuario = 'fornecedor' 
  AND public.can_manage_suppliers()
)
WITH CHECK (
  tipo_usuario = 'fornecedor'
);

-- Política: CS pode ver logs de acesso (LEITURA APENAS)
CREATE POLICY "cs_can_view_logs"
ON logs_acesso
FOR SELECT
TO authenticated
USING (
  public.can_manage_suppliers()
);

-- Política: CS pode atualizar desistências de propostas
CREATE POLICY "cs_can_update_desistencias"
ON desistencias_propostas
FOR UPDATE
TO authenticated
USING (
  public.can_manage_suppliers()
);

-- Política: CS pode atualizar candidaturas de fornecedores
CREATE POLICY "cs_can_update_candidaturas"
ON candidaturas_fornecedores
FOR UPDATE
TO authenticated
USING (
  public.can_manage_suppliers()
);