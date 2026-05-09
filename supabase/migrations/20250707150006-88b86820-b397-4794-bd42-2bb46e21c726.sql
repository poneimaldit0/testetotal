-- Remover função existente e recriar com novos campos
DROP FUNCTION IF EXISTS public.relatorio_inscricoes_fornecedor(uuid, date, date);

-- Criar função atualizada para incluir dados do cliente e garantir código do orçamento
CREATE OR REPLACE FUNCTION public.relatorio_inscricoes_fornecedor(p_fornecedor_id uuid, p_data_inicio date, p_data_fim date)
 RETURNS TABLE(
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
   tamanho_imovel numeric
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT 
    cf.orcamento_id,
    COALESCE(o.codigo_orcamento, 'ORG-' || SUBSTRING(o.id::text, 1, 8)) as codigo_orcamento,
    o.necessidade,
    o.local,
    cf.data_candidatura as data_inscricao,
    o.status as status_orcamento,
    cf.status_acompanhamento,
    (o.dados_contato->>'nome')::text as cliente_nome,
    (o.dados_contato->>'email')::text as cliente_email,
    (o.dados_contato->>'telefone')::text as cliente_telefone,
    o.tamanho_imovel
  FROM public.candidaturas_fornecedores cf
  JOIN public.orcamentos o ON o.id = cf.orcamento_id
  WHERE cf.fornecedor_id = p_fornecedor_id
    AND DATE(cf.data_candidatura) BETWEEN p_data_inicio AND p_data_fim
  ORDER BY cf.data_candidatura DESC;
$function$;