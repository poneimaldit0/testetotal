-- Criar tabela para itens individuais das medições baseados em itens do contrato
CREATE TABLE public.medicoes_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medicao_id UUID NOT NULL,
  item_checklist_id UUID NOT NULL, -- referência para os itens da proposta aceita
  percentual_executado NUMERIC NOT NULL DEFAULT 0 CHECK (percentual_executado >= 0 AND percentual_executado <= 100),
  percentual_acumulado NUMERIC NOT NULL DEFAULT 0 CHECK (percentual_acumulado >= 0 AND percentual_acumulado <= 100),
  valor_item_original NUMERIC NOT NULL DEFAULT 0,
  valor_item_medicao NUMERIC NOT NULL DEFAULT 0, -- valor proporcional do item nesta medição
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Habilitar RLS na tabela
ALTER TABLE public.medicoes_itens ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para medicoes_itens
CREATE POLICY "Admins podem gerenciar itens de medições"
ON public.medicoes_itens
FOR ALL
USING (is_admin());

CREATE POLICY "Fornecedores podem gerenciar itens de suas medições"
ON public.medicoes_itens
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.medicoes_obra mo
    WHERE mo.id = medicoes_itens.medicao_id 
    AND mo.fornecedor_id = auth.uid()
  )
);

CREATE POLICY "Clientes podem ver itens de medições de seus projetos"
ON public.medicoes_itens
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.medicoes_obra mo
    JOIN public.contratos c ON c.id = mo.contrato_id
    JOIN public.clientes cl ON cl.id = c.cliente_id
    WHERE mo.id = medicoes_itens.medicao_id 
    AND cl.auth_user_id = auth.uid()
  )
);

-- Adicionar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_medicoes_itens_updated_at
BEFORE UPDATE ON public.medicoes_itens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar campos extras na tabela medicoes_obra para melhor controle
ALTER TABLE public.medicoes_obra 
ADD COLUMN IF NOT EXISTS baseado_em_itens BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS proposta_base_id UUID; -- referência para qual proposta foi usada como base

-- Função para buscar itens do contrato baseados na proposta aceita
CREATE OR REPLACE FUNCTION public.buscar_itens_contrato(p_contrato_id UUID)
RETURNS TABLE(
  item_id UUID,
  categoria TEXT,
  nome TEXT,
  descricao TEXT,
  valor_estimado NUMERIC,
  ambientes TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jsonb_extract_path_text(item.value, 'id')::UUID as item_id,
    categoria_key as categoria,
    jsonb_extract_path_text(item.value, 'nome') as nome,
    jsonb_extract_path_text(item.value, 'descricao') as descricao,
    COALESCE(jsonb_extract_path_text(item.value, 'valor_estimado'), '0')::NUMERIC as valor_estimado,
    ARRAY(SELECT jsonb_array_elements_text(item.value->'ambientes')) as ambientes
  FROM public.contratos ct
  JOIN public.checklist_propostas cp ON cp.candidatura_id IN (
    SELECT cf.id FROM public.candidaturas_fornecedores cf 
    WHERE cf.fornecedor_id = ct.fornecedor_id 
    AND cf.orcamento_id = ct.orcamento_id
    AND cf.proposta_enviada = TRUE
    LIMIT 1
  )
  CROSS JOIN LATERAL jsonb_each(
    COALESCE(cp.respostas_checklist, '{}'::jsonb)
  ) AS categoria(categoria_key, categoria_value)
  CROSS JOIN LATERAL jsonb_path_query(
    categoria.categoria_value, '$.itens[*]'
  ) AS item(value)
  WHERE ct.id = p_contrato_id
  AND jsonb_extract_path_text(item.value, 'incluido') = 'true';
END;
$$;

-- Função para calcular percentual acumulado de um item
CREATE OR REPLACE FUNCTION public.calcular_percentual_acumulado_item(
  p_item_checklist_id UUID,
  p_medicao_atual_id UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  percentual_total NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(mi.percentual_executado), 0)
  INTO percentual_total
  FROM public.medicoes_itens mi
  JOIN public.medicoes_obra mo ON mo.id = mi.medicao_id
  WHERE mi.item_checklist_id = p_item_checklist_id
  AND mo.status IN ('aprovada', 'paga')
  AND (p_medicao_atual_id IS NULL OR mi.medicao_id != p_medicao_atual_id);
  
  RETURN percentual_total;
END;
$$;

-- Função para validar se percentual não excede 100%
CREATE OR REPLACE FUNCTION public.validar_percentual_medicao()
RETURNS TRIGGER AS $$
DECLARE
  percentual_atual NUMERIC;
BEGIN
  -- Calcular percentual acumulado atual para o item
  SELECT public.calcular_percentual_acumulado_item(NEW.item_checklist_id, NEW.medicao_id)
  INTO percentual_atual;
  
  -- Verificar se o novo percentual + o acumulado não excede 100%
  IF (percentual_atual + NEW.percentual_executado) > 100 THEN
    RAISE EXCEPTION 'O percentual executado (%) + percentual já acumulado (%) excede 100%% para este item', 
      NEW.percentual_executado, percentual_atual;
  END IF;
  
  -- Atualizar o percentual acumulado
  NEW.percentual_acumulado := percentual_atual + NEW.percentual_executado;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para validar percentuais
CREATE TRIGGER validar_percentual_medicao_trigger
BEFORE INSERT OR UPDATE ON public.medicoes_itens
FOR EACH ROW
EXECUTE FUNCTION public.validar_percentual_medicao();