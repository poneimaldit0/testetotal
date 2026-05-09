-- Simplificar status dos contratos e corrigir problemas de exibição
-- Atualizar status existentes para o novo formato simplificado

-- Mapear status antigos para novos
UPDATE public.contratos 
SET status_assinatura = CASE 
  WHEN status_assinatura = 'aguardando' THEN 'aguardando_emissao'
  WHEN status_assinatura = 'assinado_fornecedor' THEN 'aguardando_assinatura'
  WHEN status_assinatura = 'assinado_cliente' THEN 'aguardando_assinatura'
  WHEN status_assinatura = 'assinado_ambos' THEN 'assinado'
  ELSE 'aguardando_emissao'
END;

-- Criar função para debug de contratos por fornecedor
CREATE OR REPLACE FUNCTION public.debug_contratos_fornecedor(p_fornecedor_id uuid)
RETURNS TABLE(
  contrato_id uuid,
  cliente_nome text,
  cliente_email text,
  status_assinatura text,
  valor_contrato numeric,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT 
    c.id as contrato_id,
    cl.nome as cliente_nome,
    cl.email as cliente_email,
    c.status_assinatura,
    c.valor_contrato,
    c.created_at
  FROM public.contratos c
  LEFT JOIN public.clientes cl ON cl.id = c.cliente_id
  WHERE c.fornecedor_id = p_fornecedor_id
  ORDER BY c.created_at DESC;
$$;