-- Permite que admins e consultores vejam todas as análises de propostas.
-- Sem esta política, a query do ModalCompatibilizacaoConsultor retorna []
-- silenciosamente (RLS bloqueia; fornecedor_id ≠ auth.uid() do consultor).

CREATE POLICY "Admins podem ver todas as análises"
  ON public.propostas_analises_ia
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
