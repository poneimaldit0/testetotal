-- Fix: master não tinha nenhuma policy SELECT em candidaturas_fornecedores.
-- Sem isso, carregarCandidaturas (Step 1) retorna [] para usuários master
-- e o modal exibe "Nenhuma proposta" mesmo com dados no banco.
CREATE POLICY "Masters podem ver todas as candidaturas"
ON public.candidaturas_fornecedores
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND tipo_usuario = 'master'
  )
);

-- Fix: is_admin() não cobre master nem gestor_conta em propostas_analises_ia.
-- Sem isso, Step 2 retorna analiseMap vazio mesmo que Step 1 passe.
-- Mantém a policy is_admin() existente — esta é complementar.
CREATE POLICY "Admins e gestores podem ver todas as análises"
ON public.propostas_analises_ia
FOR SELECT TO authenticated
USING (public.is_admin_or_gestor());
