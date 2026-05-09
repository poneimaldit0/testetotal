
-- Drop e recriar a RPC relatorio_inscricoes_fornecedor com novo campo
DROP FUNCTION IF EXISTS public.relatorio_inscricoes_fornecedor(uuid, date, date);

CREATE OR REPLACE FUNCTION public.relatorio_inscricoes_fornecedor(p_fornecedor_id uuid, p_data_inicio date, p_data_fim date)
 RETURNS TABLE(inscricao_id uuid, orcamento_id uuid, codigo_orcamento text, necessidade text, local text, data_inscricao timestamp with time zone, status_orcamento text, status_acompanhamento text, cliente_nome text, cliente_email text, cliente_telefone text, tamanho_imovel numeric, observacoes_acompanhamento text, data_ultima_atualizacao timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    cf.id as inscricao_id,
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
    cf.observacoes_acompanhamento,
    cf.updated_at as data_ultima_atualizacao
  FROM public.candidaturas_fornecedores cf
  JOIN public.orcamentos o ON o.id = cf.orcamento_id
  WHERE cf.fornecedor_id = p_fornecedor_id
    AND DATE(cf.data_candidatura) BETWEEN p_data_inicio AND p_data_fim
  ORDER BY cf.data_candidatura DESC;
$function$;
