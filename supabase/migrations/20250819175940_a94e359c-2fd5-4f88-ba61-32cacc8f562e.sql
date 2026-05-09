-- Limpar políticas existentes que podem conflitar
DROP POLICY IF EXISTS "Fornecedores podem ver suas solicitações de ajuda" ON public.solicitacoes_ajuda;
DROP POLICY IF EXISTS "Fornecedores podem criar solicitações de ajuda" ON public.solicitacoes_ajuda;
DROP POLICY IF EXISTS "Admins podem gerenciar todas as solicitações de ajuda" ON public.solicitacoes_ajuda;
DROP POLICY IF EXISTS "Fornecedores podem ver suas desistências" ON public.desistencias_propostas;
DROP POLICY IF EXISTS "Fornecedores podem criar solicitações de desistência" ON public.desistencias_propostas;
DROP POLICY IF EXISTS "Admins podem gerenciar todas as desistências" ON public.desistencias_propostas;

-- Fase A: Estrutura do Sistema de Controle de Propostas

-- 1. Alterar tabela profiles (fornecedores)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS limite_propostas_abertas integer;

-- 2. Alterar tabela orcamentos
ALTER TABLE public.orcamentos 
ADD COLUMN IF NOT EXISTS prazo_envio_proposta_dias integer DEFAULT 7;

-- 3. Alterar tabela candidaturas_fornecedores
ALTER TABLE public.candidaturas_fornecedores 
ADD COLUMN IF NOT EXISTS data_limite_envio timestamp with time zone,
ADD COLUMN IF NOT EXISTS proposta_enviada boolean DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pode_desistir boolean DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS data_desistencia timestamp with time zone,
ADD COLUMN IF NOT EXISTS motivo_desistencia text,
ADD COLUMN IF NOT EXISTS desistencia_aprovada boolean DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS penalidade_aplicada boolean DEFAULT FALSE;

-- 4. Criar tabela solicitacoes_ajuda
CREATE TABLE IF NOT EXISTS public.solicitacoes_ajuda (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidatura_id uuid NOT NULL REFERENCES public.candidaturas_fornecedores(id) ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mensagem text NOT NULL,
  data_solicitacao timestamp with time zone NOT NULL DEFAULT now(),
  respondida boolean NOT NULL DEFAULT FALSE,
  resposta_admin text,
  admin_respondeu_id uuid REFERENCES public.profiles(id),
  data_resposta timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 5. Criar tabela desistencias_propostas
CREATE TABLE IF NOT EXISTS public.desistencias_propostas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidatura_id uuid NOT NULL REFERENCES public.candidaturas_fornecedores(id) ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  motivo_categoria text NOT NULL,
  justificativa text NOT NULL,
  data_solicitacao timestamp with time zone NOT NULL DEFAULT now(),
  aprovada boolean,
  aprovada_por uuid REFERENCES public.profiles(id),
  data_aprovacao timestamp with time zone,
  penalidade_aplicada boolean DEFAULT FALSE,
  observacoes_admin text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 6. Ativar RLS nas novas tabelas
ALTER TABLE public.solicitacoes_ajuda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desistencias_propostas ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas RLS para solicitacoes_ajuda
CREATE POLICY "Fornecedores podem ver suas solicitações de ajuda"
ON public.solicitacoes_ajuda
FOR SELECT
USING (fornecedor_id = auth.uid());

CREATE POLICY "Fornecedores podem criar solicitações de ajuda"
ON public.solicitacoes_ajuda
FOR INSERT
WITH CHECK (fornecedor_id = auth.uid());

CREATE POLICY "Admins podem gerenciar todas as solicitações de ajuda"
ON public.solicitacoes_ajuda
FOR ALL
USING (is_admin());

-- 8. Criar políticas RLS para desistencias_propostas
CREATE POLICY "Fornecedores podem ver suas desistências"
ON public.desistencias_propostas
FOR SELECT
USING (fornecedor_id = auth.uid());

CREATE POLICY "Fornecedores podem criar solicitações de desistência"
ON public.desistencias_propostas
FOR INSERT
WITH CHECK (fornecedor_id = auth.uid());

CREATE POLICY "Admins podem gerenciar todas as desistências"
ON public.desistencias_propostas
FOR ALL
USING (is_admin());

-- 9. Criar triggers para updated_at (se não existirem)
DROP TRIGGER IF EXISTS update_solicitacoes_ajuda_updated_at ON public.solicitacoes_ajuda;
DROP TRIGGER IF EXISTS update_desistencias_propostas_updated_at ON public.desistencias_propostas;

CREATE TRIGGER update_solicitacoes_ajuda_updated_at
  BEFORE UPDATE ON public.solicitacoes_ajuda
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_desistencias_propostas_updated_at
  BEFORE UPDATE ON public.desistencias_propostas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Criar função para calcular data limite de envio
CREATE OR REPLACE FUNCTION public.calcular_data_limite_envio(p_data_candidatura timestamp with time zone, p_prazo_dias integer)
RETURNS timestamp with time zone
LANGUAGE sql
STABLE
AS $$
  SELECT p_data_candidatura + (p_prazo_dias || ' days')::interval;
$$;

-- 11. Criar função para verificar se pode solicitar desistência
CREATE OR REPLACE FUNCTION public.pode_solicitar_desistencia(p_candidatura_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  candidatura_record RECORD;
BEGIN
  SELECT 
    cf.data_candidatura,
    cf.proposta_enviada,
    cf.data_limite_envio,
    cf.data_desistencia
  INTO candidatura_record
  FROM public.candidaturas_fornecedores cf
  WHERE cf.id = p_candidatura_id;
  
  -- Não pode desistir se não existe ou já desistiu
  IF candidatura_record IS NULL OR candidatura_record.data_desistencia IS NOT NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Não pode desistir se já enviou proposta
  IF candidatura_record.proposta_enviada THEN
    RETURN FALSE;
  END IF;
  
  -- Pode desistir se passou do prazo
  IF candidatura_record.data_limite_envio IS NOT NULL AND candidatura_record.data_limite_envio < NOW() THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- 12. Criar função para contar propostas abertas de um fornecedor
CREATE OR REPLACE FUNCTION public.contar_propostas_abertas_fornecedor(p_fornecedor_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT COUNT(*)::integer
  FROM public.candidaturas_fornecedores cf
  WHERE cf.fornecedor_id = p_fornecedor_id
    AND cf.proposta_enviada = FALSE
    AND cf.data_desistencia IS NULL;
$$;

-- 13. Criar função para verificar limite de propostas
CREATE OR REPLACE FUNCTION public.verificar_limite_propostas_fornecedor(p_fornecedor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  profile_record RECORD;
  propostas_abertas integer;
BEGIN
  -- Buscar dados do fornecedor
  SELECT 
    p.limite_propostas_abertas,
    p.nome,
    p.status
  INTO profile_record
  FROM public.profiles p
  WHERE p.id = p_fornecedor_id;
  
  -- Se não encontrou o fornecedor
  IF profile_record IS NULL THEN
    RETURN jsonb_build_object(
      'pode_candidatar', false,
      'motivo', 'Fornecedor não encontrado'
    );
  END IF;
  
  -- Se fornecedor não está ativo
  IF profile_record.status != 'ativo' THEN
    RETURN jsonb_build_object(
      'pode_candidatar', false,
      'motivo', 'Fornecedor não está ativo'
    );
  END IF;
  
  -- Se não tem limite definido (NULL), pode candidatar
  IF profile_record.limite_propostas_abertas IS NULL THEN
    RETURN jsonb_build_object(
      'pode_candidatar', true,
      'limite', NULL,
      'propostas_abertas', public.contar_propostas_abertas_fornecedor(p_fornecedor_id),
      'motivo', 'Sem limite de propostas'
    );
  END IF;
  
  -- Contar propostas abertas
  propostas_abertas := public.contar_propostas_abertas_fornecedor(p_fornecedor_id);
  
  -- Verificar se está dentro do limite
  IF propostas_abertas >= profile_record.limite_propostas_abertas THEN
    RETURN jsonb_build_object(
      'pode_candidatar', false,
      'limite', profile_record.limite_propostas_abertas,
      'propostas_abertas', propostas_abertas,
      'motivo', 'Limite de propostas abertas atingido'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'pode_candidatar', true,
    'limite', profile_record.limite_propostas_abertas,
    'propostas_abertas', propostas_abertas,
    'motivo', 'Dentro do limite'
  );
END;
$$;

-- 14. Criar trigger para calcular data limite automaticamente
CREATE OR REPLACE FUNCTION public.trigger_calcular_data_limite_candidatura()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  prazo_dias integer;
BEGIN
  -- Buscar prazo do orçamento
  SELECT o.prazo_envio_proposta_dias INTO prazo_dias
  FROM public.orcamentos o
  WHERE o.id = NEW.orcamento_id;
  
  -- Se não tem prazo definido, usar 7 dias como padrão
  IF prazo_dias IS NULL THEN
    prazo_dias := 7;
  END IF;
  
  -- Calcular data limite apenas para candidaturas novas
  IF TG_OP = 'INSERT' THEN
    NEW.data_limite_envio := public.calcular_data_limite_envio(NEW.data_candidatura, prazo_dias);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_calcular_data_limite_candidatura ON public.candidaturas_fornecedores;
CREATE TRIGGER trigger_calcular_data_limite_candidatura
  BEFORE INSERT ON public.candidaturas_fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_calcular_data_limite_candidatura();

-- 15. Atualizar candidaturas existentes para serem compatíveis
UPDATE public.candidaturas_fornecedores 
SET data_limite_envio = data_candidatura + INTERVAL '7 days'
WHERE data_limite_envio IS NULL;

-- 16. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_candidaturas_fornecedor_propostas_abertas 
ON public.candidaturas_fornecedores(fornecedor_id) 
WHERE proposta_enviada = FALSE AND data_desistencia IS NULL;

CREATE INDEX IF NOT EXISTS idx_candidaturas_data_limite 
ON public.candidaturas_fornecedores(data_limite_envio);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_ajuda_fornecedor 
ON public.solicitacoes_ajuda(fornecedor_id);

CREATE INDEX IF NOT EXISTS idx_desistencias_fornecedor 
ON public.desistencias_propostas(fornecedor_id);

-- 17. Comentários para documentação
COMMENT ON COLUMN public.profiles.limite_propostas_abertas IS 'Limite de propostas em aberto para o fornecedor. NULL = sem limite';
COMMENT ON COLUMN public.orcamentos.prazo_envio_proposta_dias IS 'Prazo em dias para envio da proposta após candidatura';
COMMENT ON COLUMN public.candidaturas_fornecedores.data_limite_envio IS 'Data limite calculada automaticamente para envio da proposta';
COMMENT ON COLUMN public.candidaturas_fornecedores.proposta_enviada IS 'Indica se a proposta foi enviada/finalizada';
COMMENT ON COLUMN public.candidaturas_fornecedores.pode_desistir IS 'Calculado automaticamente - se pode solicitar desistência';
COMMENT ON TABLE public.solicitacoes_ajuda IS 'Solicitações de ajuda dos fornecedores durante o processo de proposta';
COMMENT ON TABLE public.desistencias_propostas IS 'Solicitações de desistência de propostas com controle administrativo';