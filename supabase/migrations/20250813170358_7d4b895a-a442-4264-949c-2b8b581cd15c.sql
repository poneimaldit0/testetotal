-- Sistema de Geração de Acessos e Comparação de Orçamentos
-- Parte 1: Tabela para códigos de acesso individuais dos fornecedores

CREATE TABLE public.codigos_acesso_propostas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE CASCADE NOT NULL,
  candidatura_id UUID REFERENCES public.candidaturas_fornecedores(id) ON DELETE CASCADE NOT NULL,
  codigo_orcamento TEXT NOT NULL,
  codigo_fornecedor TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days') NOT NULL,
  visualizacoes INTEGER DEFAULT 0 NOT NULL,
  ultimo_acesso TIMESTAMP WITH TIME ZONE,
  CONSTRAINT uk_candidatura_codigo UNIQUE (candidatura_id)
);

-- Parte 2: Tabela para senhas de comparação administrativas
CREATE TABLE public.senhas_comparacao_orcamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE CASCADE NOT NULL,
  senha_comparacao TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days') NOT NULL,
  usado BOOLEAN DEFAULT FALSE NOT NULL,
  ultimo_acesso TIMESTAMP WITH TIME ZONE,
  total_acessos INTEGER DEFAULT 0 NOT NULL,
  CONSTRAINT uk_orcamento_senha UNIQUE (orcamento_id)
);

-- Índices para performance
CREATE INDEX idx_codigos_acesso_orcamento ON public.codigos_acesso_propostas(orcamento_id);
CREATE INDEX idx_codigos_acesso_candidatura ON public.codigos_acesso_propostas(candidatura_id);
CREATE INDEX idx_codigos_acesso_expiry ON public.codigos_acesso_propostas(expires_at);
CREATE INDEX idx_codigos_fornecedor_lookup ON public.codigos_acesso_propostas(codigo_orcamento, codigo_fornecedor);

CREATE INDEX idx_senhas_comparacao_orcamento ON public.senhas_comparacao_orcamentos(orcamento_id);
CREATE INDEX idx_senhas_comparacao_expiry ON public.senhas_comparacao_orcamentos(expires_at);
CREATE INDEX idx_senhas_lookup ON public.senhas_comparacao_orcamentos(senha_comparacao);

-- Enable RLS
ALTER TABLE public.codigos_acesso_propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.senhas_comparacao_orcamentos ENABLE ROW LEVEL SECURITY;

-- RLS Policies para códigos de acesso
-- Admins podem gerenciar todos os códigos
CREATE POLICY "Admins podem gerenciar códigos de acesso" 
ON public.codigos_acesso_propostas 
FOR ALL 
TO authenticated 
USING (public.is_admin());

-- Fornecedores podem ver apenas seus próprios códigos
CREATE POLICY "Fornecedores podem ver seus códigos" 
ON public.codigos_acesso_propostas 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.candidaturas_fornecedores cf 
    WHERE cf.id = candidatura_id AND cf.fornecedor_id = auth.uid()
  )
);

-- Acesso público para validação de códigos (sem auth requerida)
CREATE POLICY "Validação pública de códigos" 
ON public.codigos_acesso_propostas 
FOR SELECT 
TO anon, authenticated
USING (expires_at > NOW());

-- RLS Policies para senhas de comparação
-- Apenas admins podem gerenciar senhas de comparação
CREATE POLICY "Apenas admins podem gerenciar senhas de comparação" 
ON public.senhas_comparacao_orcamentos 
FOR ALL 
TO authenticated 
USING (public.is_admin());

-- Acesso público para validação de senhas (sem auth requerida)
CREATE POLICY "Validação pública de senhas de comparação" 
ON public.senhas_comparacao_orcamentos 
FOR SELECT 
TO anon, authenticated
USING (expires_at > NOW());

-- Função para limpeza automática de códigos expirados
CREATE OR REPLACE FUNCTION public.limpar_codigos_expirados()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Limpar códigos de acesso expirados
  DELETE FROM public.codigos_acesso_propostas 
  WHERE expires_at < NOW() - INTERVAL '7 days';
  
  -- Limpar senhas de comparação expiradas
  DELETE FROM public.senhas_comparacao_orcamentos 
  WHERE expires_at < NOW() - INTERVAL '7 days';
  
  -- Log da limpeza
  INSERT INTO public.logs_acesso (user_id, acao)
  VALUES (NULL, 'limpeza_automatica_codigos_expirados');
END;
$$;

-- Função para buscar proposta por códigos (pública)
CREATE OR REPLACE FUNCTION public.buscar_proposta_por_codigos(
  p_codigo_orcamento TEXT,
  p_codigo_fornecedor TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resultado jsonb;
  codigo_record RECORD;
BEGIN
  -- Buscar código válido
  SELECT * INTO codigo_record
  FROM public.codigos_acesso_propostas
  WHERE codigo_orcamento = p_codigo_orcamento 
    AND codigo_fornecedor = p_codigo_fornecedor
    AND expires_at > NOW();
    
  IF codigo_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'codigo_invalido',
      'message', 'Códigos inválidos ou expirados'
    );
  END IF;
  
  -- Incrementar contador de visualizações
  UPDATE public.codigos_acesso_propostas
  SET visualizacoes = visualizacoes + 1,
      ultimo_acesso = NOW()
  WHERE id = codigo_record.id;
  
  -- Buscar dados completos da proposta
  SELECT jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'candidatura_id', cf.id,
      'orcamento', jsonb_build_object(
        'id', o.id,
        'necessidade', o.necessidade,
        'local', o.local,
        'categorias', o.categorias,
        'tamanho_imovel', o.tamanho_imovel,
        'data_publicacao', o.data_publicacao
      ),
      'candidatura', jsonb_build_object(
        'id', cf.id,
        'nome', cf.nome,
        'email', cf.email,
        'empresa', cf.empresa,
        'telefone', cf.telefone,
        'data_candidatura', cf.data_candidatura
      ),
      'codigo_info', jsonb_build_object(
        'visualizacoes', codigo_record.visualizacoes + 1,
        'expires_at', codigo_record.expires_at
      )
    )
  ) INTO resultado
  FROM public.candidaturas_fornecedores cf
  JOIN public.orcamentos o ON o.id = cf.orcamento_id
  WHERE cf.id = codigo_record.candidatura_id;
  
  RETURN resultado;
END;
$$;

-- Função para validar acesso ao comparador
CREATE OR REPLACE FUNCTION public.validar_acesso_comparador(
  p_codigo_orcamento TEXT,
  p_senha_comparacao TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  senha_record RECORD;
  orcamento_record RECORD;
BEGIN
  -- Extrair orcamento_id do código
  SELECT * INTO orcamento_record
  FROM public.orcamentos
  WHERE UPPER(REPLACE(id::text, '-', ''))::text LIKE UPPER(p_codigo_orcamento) || '%';
  
  IF orcamento_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'orcamento_nao_encontrado',
      'message', 'Código do orçamento não encontrado'
    );
  END IF;
  
  -- Verificar senha de comparação
  SELECT * INTO senha_record
  FROM public.senhas_comparacao_orcamentos
  WHERE orcamento_id = orcamento_record.id
    AND senha_comparacao = p_senha_comparacao
    AND expires_at > NOW();
    
  IF senha_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'senha_invalida',
      'message', 'Senha de comparação inválida ou expirada'
    );
  END IF;
  
  -- Incrementar contador de acessos
  UPDATE public.senhas_comparacao_orcamentos
  SET total_acessos = total_acessos + 1,
      ultimo_acesso = NOW(),
      usado = TRUE
  WHERE id = senha_record.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'orcamento_id', orcamento_record.id,
    'message', 'Acesso autorizado ao comparador'
  );
END;
$$;