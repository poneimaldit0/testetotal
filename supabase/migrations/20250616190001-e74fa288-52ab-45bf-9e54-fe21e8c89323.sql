
-- Atualizar a tabela profiles para incluir mais informações de controle
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ultimo_login timestamp with time zone,
ADD COLUMN IF NOT EXISTS data_criacao timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso')),
ADD COLUMN IF NOT EXISTS limite_acessos_diarios integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS limite_acessos_mensais integer DEFAULT 100;

-- Criar tabela para logs de acesso dos usuários
CREATE TABLE IF NOT EXISTS public.logs_acesso (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  data_acesso timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  acao text NOT NULL -- 'login', 'logout', 'acesso_orcamento', etc
);

-- Habilitar RLS na tabela de logs
ALTER TABLE public.logs_acesso ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para logs de acesso - apenas admins podem ver tudo
CREATE POLICY "Admins can view all access logs" 
  ON public.logs_acesso 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- Usuários podem ver apenas seus próprios logs
CREATE POLICY "Users can view their own logs" 
  ON public.logs_acesso 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Política para inserção de logs
CREATE POLICY "Allow insert access logs" 
  ON public.logs_acesso 
  FOR INSERT 
  WITH CHECK (true);

-- Atualizar a função de verificação de limite para usar os novos campos
CREATE OR REPLACE FUNCTION public.verificar_limite_acesso(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  profile_record RECORD;
BEGIN
  SELECT * INTO profile_record 
  FROM public.profiles 
  WHERE id = user_id;
  
  -- Se não encontrou o usuário ou está inativo, negar acesso
  IF profile_record IS NULL OR profile_record.status != 'ativo' THEN
    RETURN FALSE;
  END IF;
  
  -- Admins sempre têm acesso
  IF profile_record.tipo_usuario = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Reset contadores se necessário
  IF profile_record.ultimo_acesso_diario < CURRENT_DATE THEN
    UPDATE public.profiles 
    SET acessos_diarios = 0, ultimo_acesso_diario = CURRENT_DATE
    WHERE id = user_id;
  END IF;
  
  IF DATE_TRUNC('month', profile_record.ultimo_acesso_mensal) < DATE_TRUNC('month', CURRENT_DATE) THEN
    UPDATE public.profiles 
    SET acessos_mensais = 0, ultimo_acesso_mensal = CURRENT_DATE
    WHERE id = user_id;
  END IF;
  
  -- Verificar limites personalizados
  SELECT * INTO profile_record 
  FROM public.profiles 
  WHERE id = user_id;
  
  IF profile_record.acessos_diarios >= profile_record.limite_acessos_diarios OR 
     profile_record.acessos_mensais >= profile_record.limite_acessos_mensais THEN
    RETURN FALSE;
  END IF;
  
  -- Incrementar contadores e atualizar último login
  UPDATE public.profiles 
  SET acessos_diarios = acessos_diarios + 1,
      acessos_mensais = acessos_mensais + 1,
      ultimo_login = now()
  WHERE id = user_id;
  
  -- Registrar log de acesso
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (user_id, 'acesso_sistema');
  
  RETURN TRUE;
END;
$function$;

-- Função para obter estatísticas de um fornecedor
CREATE OR REPLACE FUNCTION public.obter_estatisticas_fornecedor(fornecedor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  stats jsonb;
  profile_data RECORD;
  orcamentos_participando integer;
  total_inscricoes integer;
BEGIN
  -- Verificar se o usuário logado é admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND tipo_usuario = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem acessar estas informações.';
  END IF;
  
  -- Obter dados do perfil
  SELECT * INTO profile_data 
  FROM public.profiles 
  WHERE id = fornecedor_id;
  
  -- Contar orçamentos que está participando
  SELECT COUNT(*) INTO orcamentos_participando
  FROM public.inscricoes_fornecedores 
  WHERE fornecedor_id = fornecedor_id;
  
  -- Contar total de inscrições
  SELECT COUNT(*) INTO total_inscricoes
  FROM public.inscricoes_fornecedores 
  WHERE fornecedor_id = fornecedor_id;
  
  -- Montar objeto com estatísticas
  stats := jsonb_build_object(
    'perfil', row_to_json(profile_data),
    'orcamentos_participando', orcamentos_participando,
    'total_inscricoes', total_inscricoes,
    'acessos_hoje', profile_data.acessos_diarios,
    'acessos_mes', profile_data.acessos_mensais,
    'ultimo_login', profile_data.ultimo_login,
    'status', profile_data.status,
    'limites', jsonb_build_object(
      'diario', profile_data.limite_acessos_diarios,
      'mensal', profile_data.limite_acessos_mensais
    )
  );
  
  RETURN stats;
END;
$function$;

-- Atualizar políticas RLS para permitir que admins vejam todos os perfis
CREATE POLICY "Admins can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (
    tipo_usuario = 'admin' OR 
    id = auth.uid()
  );

-- Permitir que admins atualizem qualquer perfil
CREATE POLICY "Admins can update all profiles" 
  ON public.profiles 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- Permitir que admins insiram novos perfis
CREATE POLICY "Admins can insert profiles" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );
