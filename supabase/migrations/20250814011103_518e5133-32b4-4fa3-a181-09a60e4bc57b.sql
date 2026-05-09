-- Remover políticas RLS duplicadas/conflitantes
DROP POLICY IF EXISTS "Admins podem ver todas candidaturas" ON public.candidaturas_fornecedores;
DROP POLICY IF EXISTS "Fornecedores podem ver suas próprias candidaturas" ON public.candidaturas_fornecedores;
DROP POLICY IF EXISTS "Fornecedores podem criar suas próprias candidaturas" ON public.candidaturas_fornecedores;
DROP POLICY IF EXISTS "Fornecedores podem atualizar suas próprias candidaturas" ON public.candidaturas_fornecedores;

-- Otimizar políticas RLS para melhor performance
CREATE OR REPLACE FUNCTION public.verificar_acesso_comparacao_token(p_orcamento_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tokens_comparacao_cliente t
    WHERE t.orcamento_id = p_orcamento_id
      AND t.expires_at > now()
  );
$$;

-- Recriar políticas otimizadas
CREATE POLICY "Acesso público via token - candidaturas" ON public.candidaturas_fornecedores
FOR SELECT USING (public.verificar_acesso_comparacao_token(orcamento_id));

CREATE POLICY "Acesso público via token - checklist" ON public.checklist_propostas
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.candidaturas_fornecedores cf
    WHERE cf.id = checklist_propostas.candidatura_id
      AND public.verificar_acesso_comparacao_token(cf.orcamento_id)
  )
);

CREATE POLICY "Acesso público via token - respostas" ON public.respostas_checklist
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.checklist_propostas cp
    JOIN public.candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
    WHERE cp.id = respostas_checklist.checklist_proposta_id
      AND public.verificar_acesso_comparacao_token(cf.orcamento_id)
  )
);