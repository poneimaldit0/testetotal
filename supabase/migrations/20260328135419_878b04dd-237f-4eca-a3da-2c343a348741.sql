-- Tabela de canais de origem para reuniões do funil
CREATE TABLE public.funil_canais_origem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.funil_canais_origem ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ver canais ativos
CREATE POLICY "authenticated_select_canais" ON public.funil_canais_origem
  FOR SELECT TO authenticated USING (true);

-- Apenas admin/master podem gerenciar
CREATE POLICY "admin_all_canais" ON public.funil_canais_origem
  FOR ALL TO authenticated USING (is_admin_or_master(auth.uid()))
  WITH CHECK (is_admin_or_master(auth.uid()));

-- Inserir canais padrão
INSERT INTO public.funil_canais_origem (nome) VALUES
  ('Social Selling'),
  ('Prospecção Ativa'),
  ('WhatsApp'),
  ('Formulário'),
  ('Site');

-- Adicionar coluna canal_origem_id em funil_reunioes
ALTER TABLE public.funil_reunioes
  ADD COLUMN canal_origem_id uuid REFERENCES public.funil_canais_origem(id);