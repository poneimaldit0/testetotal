-- Criar política para permitir que fornecedores vejam contribuições consolidadas de todos os fornecedores
CREATE POLICY "Fornecedores podem ver contribuições consolidadas"
ON public.contribuicoes_checklist
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM checklist_colaborativo cc
    JOIN candidaturas_fornecedores cf ON cf.orcamento_id = cc.orcamento_id
    WHERE cc.id = contribuicoes_checklist.checklist_colaborativo_id
      AND cc.status = 'checklist_definido'
      AND cf.fornecedor_id = auth.uid()
      AND cf.data_desistencia IS NULL
  )
);