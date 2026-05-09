-- Adicionar política RLS para permitir que usuários master editem orçamentos
CREATE POLICY "Master pode atualizar qualquer orçamento"
ON public.orcamentos
FOR UPDATE
TO authenticated
USING (public.is_master())
WITH CHECK (public.is_master());

-- Comentário explicativo
COMMENT ON POLICY "Master pode atualizar qualquer orçamento" ON public.orcamentos IS 
'Permite que usuários com tipo_usuario = master possam editar qualquer orçamento cadastrado';