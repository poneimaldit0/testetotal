
-- Create status enum for reunioes
CREATE TYPE public.funil_reuniao_status AS ENUM ('agendada', 'realizada', 'no_show', 'cancelada');

-- Create funil_reunioes table
CREATE TABLE public.funil_reunioes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  data_agendada DATE NOT NULL,
  closer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pre_vendas_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status funil_reuniao_status NOT NULL DEFAULT 'agendada',
  teve_pitch BOOLEAN NOT NULL DEFAULT false,
  teve_venda BOOLEAN NOT NULL DEFAULT false,
  caixa_coletado NUMERIC NOT NULL DEFAULT 0,
  faturamento_gerado NUMERIC NOT NULL DEFAULT 0,
  observacoes_pre_vendas TEXT,
  observacoes_closer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.funil_reunioes ENABLE ROW LEVEL SECURITY;

-- Security definer function to check tipo_usuario
CREATE OR REPLACE FUNCTION public.get_user_tipo(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tipo_usuario FROM public.profiles WHERE id = p_user_id LIMIT 1;
$$;

-- Admin can do everything
CREATE POLICY "admin_full_access_funil_reunioes"
ON public.funil_reunioes
FOR ALL
TO authenticated
USING (public.get_user_tipo(auth.uid()) = 'admin')
WITH CHECK (public.get_user_tipo(auth.uid()) = 'admin');

-- Pre-vendas can SELECT all and INSERT/UPDATE their own
CREATE POLICY "pre_vendas_select_funil_reunioes"
ON public.funil_reunioes
FOR SELECT
TO authenticated
USING (public.get_user_tipo(auth.uid()) = 'pre_vendas');

CREATE POLICY "pre_vendas_insert_funil_reunioes"
ON public.funil_reunioes
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_user_tipo(auth.uid()) = 'pre_vendas'
  AND pre_vendas_id = auth.uid()
);

CREATE POLICY "pre_vendas_update_funil_reunioes"
ON public.funil_reunioes
FOR UPDATE
TO authenticated
USING (
  public.get_user_tipo(auth.uid()) = 'pre_vendas'
  AND pre_vendas_id = auth.uid()
);

-- Closer can SELECT and UPDATE their own reunioes
CREATE POLICY "closer_select_funil_reunioes"
ON public.funil_reunioes
FOR SELECT
TO authenticated
USING (
  public.get_user_tipo(auth.uid()) = 'closer'
  AND closer_id = auth.uid()
);

CREATE POLICY "closer_update_funil_reunioes"
ON public.funil_reunioes
FOR UPDATE
TO authenticated
USING (
  public.get_user_tipo(auth.uid()) = 'closer'
  AND closer_id = auth.uid()
);
