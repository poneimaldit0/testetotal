-- Atualizar política RLS para permitir que master, admin e gestor_conta vejam os arquivos
DROP POLICY IF EXISTS "Fornecedores podem ver arquivos apenas dos orçamentos onde se" ON public.arquivos_orcamento;

CREATE POLICY "Usuários autorizados e fornecedores inscritos podem ver arquivos" 
ON public.arquivos_orcamento 
FOR SELECT 
USING (
  can_manage_orcamentos() OR 
  (
    (EXISTS ( SELECT 1
     FROM profiles
    WHERE ((profiles.id = auth.uid()) AND (profiles.tipo_usuario = 'fornecedor'::text) AND (profiles.status = 'ativo'::text)))) 
    AND fornecedor_inscrito_no_orcamento(orcamento_id)
  )
);