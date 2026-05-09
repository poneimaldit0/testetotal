-- ETAPA 1: Adicionar campos necessários para completar o fluxo pós-aceite

-- 1.1. Adicionar campo must_change_password na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;

-- 1.2. Criar tabela obras (centralizada) que será o hub principal de gestão pós-aceite
CREATE TABLE IF NOT EXISTS public.obras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id uuid REFERENCES public.contratos(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL,
  fornecedor_id uuid NOT NULL, 
  orcamento_id uuid,
  proposta_id uuid,
  endereco_obra jsonb NOT NULL,
  valor_total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aguardando_inicio' CHECK (status IN (
    'aguardando_inicio', 'em_andamento', 'pausada', 
    'finalizada', 'cancelada'
  )),
  data_inicio date,
  data_fim_prevista date,
  data_fim_real date,
  porcentagem_conclusao integer DEFAULT 0 CHECK (porcentagem_conclusao >= 0 AND porcentagem_conclusao <= 100),
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_obras_cliente_id ON public.obras(cliente_id);
CREATE INDEX IF NOT EXISTS idx_obras_fornecedor_id ON public.obras(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_obras_status ON public.obras(status);

-- 1.3. Habilitar RLS na tabela obras
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para obras
CREATE POLICY "Admins podem gerenciar todas as obras"
ON public.obras FOR ALL
TO authenticated
USING (is_admin());

CREATE POLICY "Clientes podem ver suas obras"
ON public.obras FOR SELECT
TO authenticated
USING (cliente_id IN (
  SELECT id FROM public.clientes WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Fornecedores podem ver suas obras"
ON public.obras FOR SELECT
TO authenticated
USING (fornecedor_id = auth.uid());

CREATE POLICY "Fornecedores podem atualizar suas obras"
ON public.obras FOR UPDATE
TO authenticated
USING (fornecedor_id = auth.uid());

-- 1.4. Criar relacionamento entre cronograma_obra e obras
ALTER TABLE public.cronograma_obra 
ADD COLUMN IF NOT EXISTS obra_id uuid REFERENCES public.obras(id) ON DELETE CASCADE;

-- 1.5. Adicionar campos extras para melhor gestão do cronograma
ALTER TABLE public.cronograma_obra 
ADD COLUMN IF NOT EXISTS item_proposta_id uuid,
ADD COLUMN IF NOT EXISTS valor_item numeric DEFAULT 0;

-- 1.6. Função para auto-popular cronograma baseado na proposta
CREATE OR REPLACE FUNCTION public.popular_cronograma_obra(
  p_obra_id uuid,
  p_proposta_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Inserir itens do cronograma baseados nas respostas do checklist da proposta
  INSERT INTO public.cronograma_obra (
    obra_id,
    contrato_id,
    fornecedor_id,
    item_checklist,
    categoria,
    status,
    ordem,
    item_proposta_id,
    valor_item
  )
  SELECT 
    p_obra_id,
    (SELECT contrato_id FROM public.obras WHERE id = p_obra_id),
    (SELECT fornecedor_id FROM public.obras WHERE id = p_obra_id),
    COALESCE(rc.nome_item_extra, ci.nome, 'Item do orçamento') as item_checklist,
    COALESCE(ci.categoria, 'Geral') as categoria,
    'planejado' as status,
    ROW_NUMBER() OVER (ORDER BY ci.ordem, rc.created_at) as ordem,
    rc.item_id as item_proposta_id,
    rc.valor_estimado as valor_item
  FROM public.respostas_checklist rc
  LEFT JOIN public.checklist_itens ci ON ci.id = rc.item_id
  WHERE rc.checklist_proposta_id = p_proposta_id
    AND rc.incluido = true
    AND NOT EXISTS (
      SELECT 1 FROM public.cronograma_obra co2 
      WHERE co2.obra_id = p_obra_id 
        AND co2.item_proposta_id = rc.item_id
    );
END;
$$;

-- 1.7. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_obras_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_obras_updated_at
  BEFORE UPDATE ON public.obras
  FOR EACH ROW
  EXECUTE FUNCTION public.update_obras_updated_at();