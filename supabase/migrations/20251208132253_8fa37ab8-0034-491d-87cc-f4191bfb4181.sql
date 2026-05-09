-- Dropar e recriar relatorio_clientes_postados_mes para usar can_manage_orcamentos
DROP FUNCTION IF EXISTS public.relatorio_clientes_postados_mes(date, date);

CREATE FUNCTION public.relatorio_clientes_postados_mes(p_data_inicio date, p_data_fim date)
RETURNS TABLE (
  orcamento_id uuid,
  codigo_orcamento text,
  data_publicacao timestamp with time zone,
  necessidade text,
  categorias text[],
  local text,
  tamanho_imovel text,
  status_orcamento text,
  cliente_nome text,
  cliente_email text,
  cliente_telefone text,
  gestor_conta_nome text,
  gestor_conta_email text,
  total_fornecedores_inscritos bigint,
  fornecedores_inscritos jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    o.id as orcamento_id,
    o.codigo_orcamento,
    o.data_publicacao,
    o.necessidade,
    o.categorias,
    o.local,
    o.tamanho_imovel,
    o.status as status_orcamento,
    (o.dados_contato->>'nome')::text as cliente_nome,
    (o.dados_contato->>'email')::text as cliente_email,
    (o.dados_contato->>'telefone')::text as cliente_telefone,
    gc.nome as gestor_conta_nome,
    gc.email as gestor_conta_email,
    COALESCE(fornecedores_count.total, 0) as total_fornecedores_inscritos,
    COALESCE(fornecedores_data.fornecedores, '[]'::jsonb) as fornecedores_inscritos
  FROM public.orcamentos o
  LEFT JOIN public.profiles gc ON gc.id = o.gestor_conta_id
  LEFT JOIN (
    SELECT 
      cf.orcamento_id,
      COUNT(*) as total
    FROM public.candidaturas_fornecedores cf
    GROUP BY cf.orcamento_id
  ) fornecedores_count ON fornecedores_count.orcamento_id = o.id
  LEFT JOIN (
    SELECT 
      cf.orcamento_id,
      jsonb_agg(
        jsonb_build_object(
          'id', cf.id,
          'fornecedor_id', cf.fornecedor_id,
          'nome', cf.nome,
          'email', cf.email,
          'telefone', cf.telefone,
          'empresa', cf.empresa,
          'data_candidatura', cf.data_candidatura,
          'status_acompanhamento', cf.status_acompanhamento
        ) ORDER BY cf.data_candidatura
      ) as fornecedores
    FROM public.candidaturas_fornecedores cf
    GROUP BY cf.orcamento_id
  ) fornecedores_data ON fornecedores_data.orcamento_id = o.id
  WHERE DATE(o.data_publicacao) BETWEEN p_data_inicio AND p_data_fim
    AND public.can_manage_orcamentos()
  ORDER BY o.data_publicacao DESC;
$$;