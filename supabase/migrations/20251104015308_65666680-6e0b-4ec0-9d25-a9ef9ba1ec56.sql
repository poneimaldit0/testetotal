-- Atualizar função is_admin_or_gestor para incluir gestor_marcenaria
CREATE OR REPLACE FUNCTION public.is_admin_or_gestor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND tipo_usuario IN ('admin', 'master', 'gestor_conta', 'sdr', 'gestor_marcenaria', 'customer_success')
  );
$$;

-- RLS policies para crm_marcenaria_leads
-- Permitir que gestor_marcenaria veja APENAS seus leads apropriados

-- Nova política para gestores de marcenaria (SELECT)
CREATE POLICY "Gestores marcenaria podem ver seus leads"
ON public.crm_marcenaria_leads
FOR SELECT
TO public
USING (
  consultor_responsavel_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND tipo_usuario = 'gestor_marcenaria'
    AND status = 'ativo'
  )
);

-- Nova política para gestores de marcenaria (UPDATE)
CREATE POLICY "Gestores marcenaria podem atualizar seus leads"
ON public.crm_marcenaria_leads
FOR UPDATE
TO public
USING (
  consultor_responsavel_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND tipo_usuario = 'gestor_marcenaria'
    AND status = 'ativo'
  )
);

-- RLS policies para crm_marcenaria_historico
CREATE POLICY "Gestores marcenaria podem ver histórico de seus leads"
ON public.crm_marcenaria_historico
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
  )
);

-- RLS policies para crm_marcenaria_notas
CREATE POLICY "Gestores marcenaria podem gerenciar notas de seus leads"
ON public.crm_marcenaria_notas
FOR ALL
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
  )
);

-- RLS policies para crm_marcenaria_checklist_progresso
CREATE POLICY "Gestores marcenaria podem gerenciar checklist de seus leads"
ON public.crm_marcenaria_checklist_progresso
FOR ALL
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
  )
);

-- Comentários para documentação
COMMENT ON POLICY "Gestores marcenaria podem ver seus leads" ON public.crm_marcenaria_leads IS 
'Permite que gestores de marcenaria visualizem apenas os leads apropriados para eles';

COMMENT ON POLICY "Gestores marcenaria podem atualizar seus leads" ON public.crm_marcenaria_leads IS 
'Permite que gestores de marcenaria atualizem apenas os leads apropriados para eles';