-- Criar tabela de avisos do sistema
CREATE TABLE IF NOT EXISTS public.avisos_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('info', 'warning', 'success', 'error')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_inicio TIMESTAMP WITH TIME ZONE,
  data_fim TIMESTAMP WITH TIME ZONE,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_avisos_ativo ON public.avisos_sistema(ativo);
CREATE INDEX IF NOT EXISTS idx_avisos_datas ON public.avisos_sistema(data_inicio, data_fim);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.atualizar_updated_at_avisos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_updated_at_avisos
  BEFORE UPDATE ON public.avisos_sistema
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_updated_at_avisos();

-- Habilitar RLS
ALTER TABLE public.avisos_sistema ENABLE ROW LEVEL SECURITY;

-- Todos podem ver avisos ativos e dentro do período
CREATE POLICY "Todos podem ver avisos ativos"
  ON public.avisos_sistema
  FOR SELECT
  TO authenticated
  USING (
    ativo = true 
    AND (data_inicio IS NULL OR data_inicio <= now())
    AND (data_fim IS NULL OR data_fim >= now())
  );

-- Apenas Master pode gerenciar avisos (ver todos, criar, editar, excluir)
CREATE POLICY "Master pode ver todos os avisos"
  ON public.avisos_sistema
  FOR SELECT
  TO authenticated
  USING (public.is_master());

CREATE POLICY "Master pode criar avisos"
  ON public.avisos_sistema
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_master());

CREATE POLICY "Master pode editar avisos"
  ON public.avisos_sistema
  FOR UPDATE
  TO authenticated
  USING (public.is_master())
  WITH CHECK (public.is_master());

CREATE POLICY "Master pode excluir avisos"
  ON public.avisos_sistema
  FOR DELETE
  TO authenticated
  USING (public.is_master());