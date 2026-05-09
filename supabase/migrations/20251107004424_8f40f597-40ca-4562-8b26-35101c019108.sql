-- Adicionar políticas RLS para gestores de marcenaria gerenciarem tarefas de seus leads

-- Política de SELECT: Gestores podem ver tarefas de seus leads
CREATE POLICY "Gestores marcenaria podem ver tarefas de seus leads"
ON public.crm_marcenaria_tarefas
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.crm_marcenaria_leads 
    WHERE id = lead_id 
    AND consultor_responsavel_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND tipo_usuario = 'gestor_marcenaria'
    AND status = 'ativo'
  )
);

-- Política de INSERT: Gestores podem criar tarefas em seus leads
CREATE POLICY "Gestores marcenaria podem criar tarefas em seus leads"
ON public.crm_marcenaria_tarefas
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.crm_marcenaria_leads 
    WHERE id = lead_id 
    AND consultor_responsavel_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND tipo_usuario = 'gestor_marcenaria'
    AND status = 'ativo'
  )
);

-- Política de UPDATE: Gestores podem atualizar tarefas de seus leads
CREATE POLICY "Gestores marcenaria podem atualizar tarefas de seus leads"
ON public.crm_marcenaria_tarefas
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.crm_marcenaria_leads 
    WHERE id = lead_id 
    AND consultor_responsavel_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND tipo_usuario = 'gestor_marcenaria'
    AND status = 'ativo'
  )
);

-- Política de DELETE: Gestores podem deletar tarefas de seus leads
CREATE POLICY "Gestores marcenaria podem deletar tarefas de seus leads"
ON public.crm_marcenaria_tarefas
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.crm_marcenaria_leads 
    WHERE id = lead_id 
    AND consultor_responsavel_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND tipo_usuario = 'gestor_marcenaria'
    AND status = 'ativo'
  )
);

-- Comentários para documentação
COMMENT ON POLICY "Gestores marcenaria podem ver tarefas de seus leads" 
ON public.crm_marcenaria_tarefas IS 
'Permite que gestores de marcenaria visualizem tarefas apenas dos leads apropriados para eles';

COMMENT ON POLICY "Gestores marcenaria podem criar tarefas em seus leads" 
ON public.crm_marcenaria_tarefas IS 
'Permite que gestores de marcenaria criem tarefas apenas nos leads apropriados para eles';

COMMENT ON POLICY "Gestores marcenaria podem atualizar tarefas de seus leads" 
ON public.crm_marcenaria_tarefas IS 
'Permite que gestores de marcenaria atualizem tarefas apenas dos leads apropriados para eles';

COMMENT ON POLICY "Gestores marcenaria podem deletar tarefas de seus leads" 
ON public.crm_marcenaria_tarefas IS 
'Permite que gestores de marcenaria excluam tarefas apenas dos leads apropriados para eles';