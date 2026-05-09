
-- Adicionar campo gestor_conta_id na tabela orcamentos
ALTER TABLE public.orcamentos 
ADD COLUMN gestor_conta_id UUID REFERENCES public.profiles(id);

-- Adicionar índice para melhorar performance nas consultas
CREATE INDEX idx_orcamentos_gestor_conta_id ON public.orcamentos(gestor_conta_id);

-- Remover política existente de gestores de conta
DROP POLICY IF EXISTS "Gestores de conta podem ver todos os orçamentos" ON public.orcamentos;

-- Criar nova política para gestores de conta verem apenas orçamentos apropriados a eles ou que criaram
CREATE POLICY "Gestores de conta podem ver orçamentos apropriados ou criados por eles"
ON public.orcamentos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.tipo_usuario = 'gestor_conta'
      AND profiles.status = 'ativo'
      AND (
        orcamentos.gestor_conta_id = auth.uid() OR 
        orcamentos.usuario_id = auth.uid()
      )
  )
);

-- Atualizar política de inserção para gestores de conta
DROP POLICY IF EXISTS "Gestores de conta podem inserir orçamentos" ON public.orcamentos;
CREATE POLICY "Gestores de conta podem inserir orçamentos"
ON public.orcamentos 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.tipo_usuario = 'gestor_conta'
      AND profiles.status = 'ativo'
  )
);

-- Atualizar política de atualização para gestores de conta
DROP POLICY IF EXISTS "Gestores de conta podem atualizar orçamentos" ON public.orcamentos;
CREATE POLICY "Gestores de conta podem atualizar orçamentos apropriados ou criados por eles"
ON public.orcamentos 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.tipo_usuario = 'gestor_conta'
      AND profiles.status = 'ativo'
      AND (
        orcamentos.gestor_conta_id = auth.uid() OR 
        orcamentos.usuario_id = auth.uid()
      )
  )
);

-- Atualizar política de deleção para gestores de conta
DROP POLICY IF EXISTS "Gestores de conta podem deletar orçamentos" ON public.orcamentos;
CREATE POLICY "Gestores de conta podem deletar orçamentos apropriados ou criados por eles"
ON public.orcamentos 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.tipo_usuario = 'gestor_conta'
      AND profiles.status = 'ativo'
      AND (
        orcamentos.gestor_conta_id = auth.uid() OR 
        orcamentos.usuario_id = auth.uid()
      )
  )
);

-- Função para listar gestores de conta disponíveis
CREATE OR REPLACE FUNCTION public.listar_gestores_conta()
RETURNS TABLE (
  id uuid,
  nome text,
  email text,
  empresa text,
  status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.nome,
    p.email,
    p.empresa,
    p.status
  FROM public.profiles p
  WHERE p.tipo_usuario = 'gestor_conta'
    AND p.status = 'ativo'
    AND public.can_manage_orcamentos()
  ORDER BY p.nome;
$$;

-- Função para apropriar gestor de conta a um orçamento
CREATE OR REPLACE FUNCTION public.apropriar_gestor_conta(
  p_orcamento_id uuid,
  p_gestor_conta_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  orcamento_record RECORD;
  gestor_record RECORD;
BEGIN
  -- Verificar se o usuário pode gerenciar orçamentos
  IF NOT public.can_manage_orcamentos() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Apenas masters e admins podem apropriar gestores de conta'
    );
  END IF;
  
  -- Verificar se o orçamento existe
  SELECT * INTO orcamento_record
  FROM public.orcamentos
  WHERE id = p_orcamento_id;
  
  IF orcamento_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Orçamento não encontrado'
    );
  END IF;
  
  -- Se p_gestor_conta_id for NULL, remove a apropriação
  IF p_gestor_conta_id IS NULL THEN
    UPDATE public.orcamentos
    SET gestor_conta_id = NULL, updated_at = now()
    WHERE id = p_orcamento_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Apropriação removida com sucesso'
    );
  END IF;
  
  -- Verificar se o gestor existe e está ativo
  SELECT * INTO gestor_record
  FROM public.profiles
  WHERE id = p_gestor_conta_id
    AND tipo_usuario = 'gestor_conta'
    AND status = 'ativo';
  
  IF gestor_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_gestor',
      'message', 'Gestor de conta não encontrado ou inativo'
    );
  END IF;
  
  -- Apropriar o gestor ao orçamento
  UPDATE public.orcamentos
  SET gestor_conta_id = p_gestor_conta_id, updated_at = now()
  WHERE id = p_orcamento_id;
  
  -- Registrar log da apropriação
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (
    auth.uid(),
    'apropriacao_gestor_conta: ' || p_orcamento_id::text || ' -> ' || gestor_record.nome
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Gestor de conta apropriado com sucesso',
    'gestor_nome', gestor_record.nome
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Erro interno do sistema: ' || SQLERRM
    );
END;
$$;

-- Comentários para documentação
COMMENT ON COLUMN public.orcamentos.gestor_conta_id IS 'ID do gestor de conta responsável pelo orçamento';
COMMENT ON FUNCTION public.listar_gestores_conta() IS 'Lista gestores de conta disponíveis para apropriação';
COMMENT ON FUNCTION public.apropriar_gestor_conta(uuid, uuid) IS 'Apropria ou remove apropriação de gestor de conta para orçamento';
