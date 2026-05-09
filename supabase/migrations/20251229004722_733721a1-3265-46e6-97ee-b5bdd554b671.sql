-- Permitir fornecedores inscritos verem o tracking do orçamento para visualizar o concierge responsável
CREATE POLICY "Fornecedores inscritos podem ver concierge do orçamento"
ON orcamentos_crm_tracking
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM candidaturas_fornecedores cf
    WHERE cf.orcamento_id = orcamentos_crm_tracking.orcamento_id
    AND cf.fornecedor_id = auth.uid()
    AND cf.data_desistencia IS NULL
  )
);