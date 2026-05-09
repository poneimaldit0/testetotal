-- Remover tabela de senhas de comparação
DROP TABLE IF EXISTS public.senhas_comparacao_orcamentos CASCADE;

-- Criar tabela de tokens de comparação para clientes
CREATE TABLE public.tokens_comparacao_cliente (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  token_acesso TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  usado BOOLEAN NOT NULL DEFAULT false,
  ultimo_acesso TIMESTAMP WITH TIME ZONE,
  total_acessos INTEGER NOT NULL DEFAULT 0,
  cliente_info JSONB DEFAULT NULL
);

-- Criar índices para performance
CREATE INDEX idx_tokens_comparacao_orcamento ON public.tokens_comparacao_cliente(orcamento_id);
CREATE INDEX idx_tokens_comparacao_token ON public.tokens_comparacao_cliente(token_acesso);
CREATE INDEX idx_tokens_comparacao_expires ON public.tokens_comparacao_cliente(expires_at);

-- Habilitar RLS
ALTER TABLE public.tokens_comparacao_cliente ENABLE ROW LEVEL SECURITY;

-- Policy para admins gerenciarem tokens
CREATE POLICY "Admins podem gerenciar tokens de comparação"
ON public.tokens_comparacao_cliente
FOR ALL
USING (is_admin());

-- Policy para validação pública de tokens (acesso de clientes)
CREATE POLICY "Validação pública de tokens de comparação"
ON public.tokens_comparacao_cliente
FOR SELECT
USING (expires_at > now() AND NOT usado);

-- Função para validar token de comparação
CREATE OR REPLACE FUNCTION public.validar_token_comparacao(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_record RECORD;
  orcamento_record RECORD;
BEGIN
  -- Buscar token válido
  SELECT * INTO token_record
  FROM public.tokens_comparacao_cliente
  WHERE token_acesso = p_token
    AND expires_at > NOW()
    AND NOT usado;
    
  IF token_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'token_invalido',
      'message', 'Token inválido ou expirado'
    );
  END IF;
  
  -- Buscar dados do orçamento
  SELECT * INTO orcamento_record
  FROM public.orcamentos
  WHERE id = token_record.orcamento_id;
  
  IF orcamento_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'orcamento_nao_encontrado',
      'message', 'Orçamento não encontrado'
    );
  END IF;
  
  -- Incrementar contador de acessos
  UPDATE public.tokens_comparacao_cliente
  SET total_acessos = total_acessos + 1,
      ultimo_acesso = NOW()
  WHERE id = token_record.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'orcamento_id', orcamento_record.id,
    'token_info', jsonb_build_object(
      'total_acessos', token_record.total_acessos + 1,
      'expires_at', token_record.expires_at
    ),
    'message', 'Acesso autorizado'
  );
END;
$$;

-- Função para gerar token de comparação
CREATE OR REPLACE FUNCTION public.gerar_token_comparacao(p_orcamento_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
  v_existing_token RECORD;
BEGIN
  -- Verificar se o usuário é admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Apenas administradores podem gerar tokens de comparação'
    );
  END IF;
  
  -- Verificar se já existe token válido para este orçamento
  SELECT * INTO v_existing_token
  FROM public.tokens_comparacao_cliente
  WHERE orcamento_id = p_orcamento_id
    AND expires_at > NOW()
    AND NOT usado;
  
  -- Se já existe token válido, retornar ele
  IF v_existing_token IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'token', v_existing_token.token_acesso,
      'expires_at', v_existing_token.expires_at,
      'message', 'Token existente retornado'
    );
  END IF;
  
  -- Gerar novo token único (32 caracteres)
  v_token := encode(gen_random_bytes(24), 'base64');
  v_token := replace(replace(replace(v_token, '+', 'X'), '/', 'Y'), '=', 'Z');
  
  -- Inserir novo token
  INSERT INTO public.tokens_comparacao_cliente (
    orcamento_id,
    token_acesso
  ) VALUES (
    p_orcamento_id,
    v_token
  );
  
  -- Registrar log
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (
    auth.uid(),
    'gerar_token_comparacao: ' || p_orcamento_id::text
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'token', v_token,
    'expires_at', now() + INTERVAL '30 days',
    'message', 'Token gerado com sucesso'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Erro interno: ' || SQLERRM
    );
END;
$$;