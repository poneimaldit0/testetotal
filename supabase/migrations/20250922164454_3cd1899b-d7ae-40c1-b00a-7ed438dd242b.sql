-- Drop da função existente para permitir mudança no tipo de retorno
DROP FUNCTION IF EXISTS public.relatorio_fluxo_caixa(date, date, boolean, text[]);

-- Recriar função relatorio_fluxo_caixa com subcategorias
CREATE OR REPLACE FUNCTION public.relatorio_fluxo_caixa(
  p_data_inicio date, 
  p_data_fim date, 
  p_incluir_pagas boolean DEFAULT true,
  p_status_filtros text[] DEFAULT NULL
)
RETURNS TABLE(
  id uuid, 
  data_vencimento date, 
  tipo text, 
  descricao text, 
  cliente_fornecedor text, 
  categoria text, 
  subcategoria text,
  valor_original numeric, 
  valor_pago numeric, 
  valor_recebido numeric, 
  status text, 
  origem text, 
  email text, 
  telefone text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  -- Buscar contas a receber
  SELECT 
    cr.id,
    cr.data_vencimento,
    'entrada'::TEXT as tipo,
    cr.descricao,
    cr.cliente_nome as cliente_fornecedor,
    COALESCE(cat.nome, 'Sem categoria') as categoria,
    COALESCE(sub.nome, 'Sem apropriação') as subcategoria,
    cr.valor_original,
    0::NUMERIC as valor_pago,
    cr.valor_recebido,
    cr.status,
    'conta_receber'::TEXT as origem,
    cr.cliente_email as email,
    cr.cliente_telefone as telefone
  FROM public.contas_receber cr
  LEFT JOIN public.categorias_financeiras cat ON cat.id = cr.categoria_id
  LEFT JOIN public.subcategorias_financeiras sub ON sub.id = cr.subcategoria_id
  WHERE cr.data_vencimento >= p_data_inicio 
    AND cr.data_vencimento <= p_data_fim
    AND (p_incluir_pagas OR cr.status NOT IN ('recebido', 'cancelado'))
    AND (p_status_filtros IS NULL OR cr.status = ANY(p_status_filtros))
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
    COALESCE(sub.nome, 'Sem apropriação') as subcategoria,
    cp.valor_original,
    cp.valor_pago,
    0::NUMERIC as valor_recebido,
    cp.status,
    'conta_pagar'::TEXT as origem,
    cp.fornecedor_email as email,
    cp.fornecedor_telefone as telefone
  FROM public.contas_pagar cp
  LEFT JOIN public.categorias_financeiras cat ON cat.id = cp.categoria_id
  LEFT JOIN public.subcategorias_financeiras sub ON sub.id = cp.subcategoria_id
  WHERE cp.data_vencimento >= p_data_inicio 
    AND cp.data_vencimento <= p_data_fim
    AND (p_incluir_pagas OR cp.status NOT IN ('pago', 'cancelado'))
    AND (p_status_filtros IS NULL OR cp.status = ANY(p_status_filtros))
    AND public.is_master()
  
  ORDER BY data_vencimento ASC, tipo DESC;
$function$;