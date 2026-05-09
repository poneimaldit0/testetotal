
-- Tabela de metas mensais do funil de vendas
CREATE TABLE public.funil_vendas_metas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER NOT NULL,
  closer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  meta_leads INTEGER NOT NULL DEFAULT 0,
  meta_mql INTEGER NOT NULL DEFAULT 0,
  meta_ligacoes INTEGER NOT NULL DEFAULT 0,
  meta_reunioes_agendadas INTEGER NOT NULL DEFAULT 0,
  meta_reunioes_iniciadas INTEGER NOT NULL DEFAULT 0,
  meta_pitchs INTEGER NOT NULL DEFAULT 0,
  meta_vendas INTEGER NOT NULL DEFAULT 0,
  meta_caixa NUMERIC(12,2) NOT NULL DEFAULT 0,
  meta_faturamento NUMERIC(12,2) NOT NULL DEFAULT 0,
  criado_por_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mes, ano, closer_id)
);

-- Tabela de registros diários do funil de vendas
CREATE TABLE public.funil_vendas_registros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL,
  closer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leads_entrada INTEGER NOT NULL DEFAULT 0,
  mql INTEGER NOT NULL DEFAULT 0,
  ligacoes_realizadas INTEGER NOT NULL DEFAULT 0,
  reunioes_agendadas INTEGER NOT NULL DEFAULT 0,
  reunioes_iniciadas INTEGER NOT NULL DEFAULT 0,
  pitchs_realizados INTEGER NOT NULL DEFAULT 0,
  vendas INTEGER NOT NULL DEFAULT 0,
  caixa_coletado NUMERIC(12,2) NOT NULL DEFAULT 0,
  faturamento_gerado NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(data, closer_id)
);

-- Enable RLS
ALTER TABLE public.funil_vendas_metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funil_vendas_registros ENABLE ROW LEVEL SECURITY;

-- Function to check if user is closer
CREATE OR REPLACE FUNCTION public.is_closer_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
    AND tipo_usuario IN ('master', 'admin', 'closer')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_master(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
    AND tipo_usuario IN ('master', 'admin')
  )
$$;

-- RLS for funil_vendas_registros
CREATE POLICY "Closers can view own records" ON public.funil_vendas_registros
  FOR SELECT TO authenticated
  USING (closer_id = auth.uid() OR public.is_admin_or_master(auth.uid()));

CREATE POLICY "Closers can insert own records" ON public.funil_vendas_registros
  FOR INSERT TO authenticated
  WITH CHECK (closer_id = auth.uid() OR public.is_admin_or_master(auth.uid()));

CREATE POLICY "Closers can update own records" ON public.funil_vendas_registros
  FOR UPDATE TO authenticated
  USING (closer_id = auth.uid() OR public.is_admin_or_master(auth.uid()));

CREATE POLICY "Admins can delete records" ON public.funil_vendas_registros
  FOR DELETE TO authenticated
  USING (public.is_admin_or_master(auth.uid()));

-- RLS for funil_vendas_metas
CREATE POLICY "Anyone authenticated can view metas" ON public.funil_vendas_metas
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert metas" ON public.funil_vendas_metas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_master(auth.uid()));

CREATE POLICY "Admins can update metas" ON public.funil_vendas_metas
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_master(auth.uid()));

CREATE POLICY "Admins can delete metas" ON public.funil_vendas_metas
  FOR DELETE TO authenticated
  USING (public.is_admin_or_master(auth.uid()));
