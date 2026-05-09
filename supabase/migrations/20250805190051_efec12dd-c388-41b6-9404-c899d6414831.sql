-- Criar função para verificar se o fornecedor está inscrito no orçamento
CREATE OR REPLACE FUNCTION public.fornecedor_inscrito_no_orcamento(p_orcamento_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.candidaturas_fornecedores
    WHERE orcamento_id = p_orcamento_id 
      AND fornecedor_id = auth.uid()
  );
$$;

-- Remover policy antiga de visualização geral
DROP POLICY IF EXISTS "Usuários podem ver arquivos dos orçamentos que têm acesso" ON public.arquivos_orcamento;

-- Criar nova policy mais restritiva para SELECT
CREATE POLICY "Fornecedores podem ver arquivos apenas dos orçamentos onde se candidataram"
ON public.arquivos_orcamento
FOR SELECT
TO authenticated
USING (
  -- Admins podem ver todos os arquivos
  public.is_admin() 
  OR 
  -- Fornecedores podem ver apenas arquivos dos orçamentos onde se candidataram
  (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND tipo_usuario = 'fornecedor' AND status = 'ativo'
    )
    AND public.fornecedor_inscrito_no_orcamento(orcamento_id)
  )
);