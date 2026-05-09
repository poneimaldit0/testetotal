-- Função para gerar relatório de fluxo de caixa detalhado
CREATE OR REPLACE FUNCTION public.relatorio_fluxo_caixa(
  p_data_inicio DATE,
  p_data_fim DATE,
  p_incluir_pagas BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
  id UUID,
  data_vencimento DATE,
  tipo TEXT,
  descricao TEXT,
  cliente_fornecedor TEXT,
  categoria TEXT,
  valor_original NUMERIC,
  valor_pago NUMERIC,
  valor_recebido NUMERIC,
  status TEXT,
  origem TEXT,
  email TEXT,
  telefone TEXT
)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  -- Buscar contas a receber
  SELECT 
    cr.id,
    cr.data_vencimento,
    'entrada'::TEXT as tipo,
    cr.descricao,
    cr.cliente_nome as cliente_fornecedor,
    COALESCE(cat.nome, 'Sem categoria') as categoria,
    cr.valor_original,
    0::NUMERIC as valor_pago,
    cr.valor_recebido,
    cr.status,
    'conta_receber'::TEXT as origem,
    cr.cliente_email as email,
    cr.cliente_telefone as telefone
  FROM public.contas_receber cr
  LEFT JOIN public.categorias_financeiras cat ON cat.id = cr.categoria_id
  WHERE cr.data_vencimento >= p_data_inicio 
    AND cr.data_vencimento <= p_data_fim
    AND (p_incluir_pagas OR cr.status NOT IN ('recebido', 'cancelado'))
    AND public.is_master()
  
  UNION ALL
  
  -- Buscar contas a pagar
  SELECT 
    cp.id,
    cp.data_vencimento,
    'saida'::TEXT as tipo,
    cp.descricao,
    cp.fornecedor_nome as cliente_fornecedor,
    COALESCE(cat.nome, 'Sem categoria') as categoria,
    cp.valor_original,
    cp.valor_pago,
    0::NUMERIC as valor_recebido,
    cp.status,
    'conta_pagar'::TEXT as origem,
    cp.fornecedor_email as email,
    cp.fornecedor_telefone as telefone
  FROM public.contas_pagar cp
  LEFT JOIN public.categorias_financeiras cat ON cat.id = cp.categoria_id
  WHERE cp.data_vencimento >= p_data_inicio 
    AND cp.data_vencimento <= p_data_fim
    AND (p_incluir_pagas OR cp.status NOT IN ('pago', 'cancelado'))
    AND public.is_master()
  
  ORDER BY data_vencimento ASC, tipo DESC;
$$;