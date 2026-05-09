-- Adicionar política RLS para clientes poderem visualizar cronogramas das suas obras
CREATE POLICY "Clientes podem visualizar cronograma das suas obras" 
ON public.cronograma_obra 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.contratos c
    JOIN public.clientes cl ON cl.id = c.cliente_id
    WHERE c.id = cronograma_obra.contrato_id 
      AND cl.auth_user_id = auth.uid()
  )
);