-- Drop e recriar função RPC para incluir observacoes_acompanhamento
DROP FUNCTION IF EXISTS public.relatorio_inscricoes_fornecedor(uuid, date, date);

CREATE FUNCTION public.relatorio_inscricoes_fornecedor(
  p_fornecedor_id uuid,
  p_data_inicio date,
  p_data_fim date
)
RETURNS TABLE (
  orcamento_id uuid,
  codigo_orcamento text,
  necessidade text,
  local text,
  data_inscricao timestamp with time zone,
  status_orcamento text,
  status_acompanhamento text,
  cliente_nome text,
  cliente_email text,
  cliente_telefone text,
  tamanho_imovel numeric,
  observacoes_acompanhamento text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cf.orcamento_id,
    COALESCE(o.codigo_orcamento, 'ORG-' || SUBSTRING(o.id::text, 1, 8)),
    o.necessidade,
    o.local,
    cf.data_candidatura,
    o.status,
    cf.status_acompanhamento,
    (o.dados_contato->>'nome')::text,
    (o.dados_contato->>'email')::text,
    (o.dados_contato->>'telefone')::text,
    o.tamanho_imovel,
    cf.observacoes_acompanhamento
  FROM public.candidaturas_fornecedores cf
  JOIN public.orcamentos o ON o.id = cf.orcamento_id
  WHERE cf.fornecedor_id = p_fornecedor_id
    AND DATE(cf.data_candidatura) BETWEEN p_data_inicio AND p_data_fim
  ORDER BY cf.data_candidatura DESC;
$$;