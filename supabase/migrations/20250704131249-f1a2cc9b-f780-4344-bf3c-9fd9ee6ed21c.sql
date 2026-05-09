
-- Função para relatório de acessos únicos diários de fornecedores
CREATE OR REPLACE FUNCTION public.relatorio_acessos_unicos_diarios(
  p_data_inicio date,
  p_data_fim date
) 
RETURNS TABLE(
  data date,
  acessos_unicos bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    DATE(data_acesso) as data,
    COUNT(DISTINCT user_id) as acessos_unicos
  FROM public.logs_acesso la
  JOIN public.profiles p ON p.id = la.user_id
  WHERE p.tipo_usuario = 'fornecedor'
    AND DATE(la.data_acesso) BETWEEN p_data_inicio AND p_data_fim
    AND la.acao = 'acesso_sistema'
  GROUP BY DATE(data_acesso)
  ORDER BY data;
$$;

-- Função para relatório de inscrições por fornecedor
CREATE OR REPLACE FUNCTION public.relatorio_inscricoes_fornecedor(
  p_fornecedor_id uuid,
  p_data_inicio date,
  p_data_fim date
) 
RETURNS TABLE(
  orcamento_id uuid,
  codigo_orcamento text,
  necessidade text,
  local text,
  data_inscricao timestamp with time zone,
  status_orcamento text,
  status_acompanhamento text
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    cf.orcamento_id,
    o.codigo_orcamento,
    o.necessidade,
    o.local,
    cf.data_candidatura as data_inscricao,
    o.status as status_orcamento,
    cf.status_acompanhamento
  FROM public.candidaturas_fornecedores cf
  JOIN public.orcamentos o ON o.id = cf.orcamento_id
  WHERE cf.fornecedor_id = p_fornecedor_id
    AND DATE(cf.data_candidatura) BETWEEN p_data_inicio AND p_data_fim
  ORDER BY cf.data_candidatura DESC;
$$;

-- Função para relatório de status de orçamentos por fornecedor
CREATE OR REPLACE FUNCTION public.relatorio_status_orcamentos_fornecedor(
  p_fornecedor_id uuid,
  p_data_inicio date,
  p_data_fim date
) 
RETURNS TABLE(
  status_acompanhamento text,
  quantidade bigint,
  percentual numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  WITH total_inscricoes AS (
    SELECT COUNT(*) as total
    FROM public.candidaturas_fornecedores cf
    WHERE cf.fornecedor_id = p_fornecedor_id
      AND DATE(cf.data_candidatura) BETWEEN p_data_inicio AND p_data_fim
  ),
  status_counts AS (
    SELECT 
      COALESCE(cf.status_acompanhamento, 'Sem status') as status_acompanhamento,
      COUNT(*) as quantidade
    FROM public.candidaturas_fornecedores cf
    WHERE cf.fornecedor_id = p_fornecedor_id
      AND DATE(cf.data_candidatura) BETWEEN p_data_inicio AND p_data_fim
    GROUP BY cf.status_acompanhamento
  )
  SELECT 
    sc.status_acompanhamento,
    sc.quantidade,
    ROUND((sc.quantidade * 100.0 / ti.total), 2) as percentual
  FROM status_counts sc
  CROSS JOIN total_inscricoes ti
  ORDER BY sc.quantidade DESC;
$$;

-- Função para relatório de orçamentos postados por dia
CREATE OR REPLACE FUNCTION public.relatorio_orcamentos_postados_diarios(
  p_data_inicio date,
  p_data_fim date
) 
RETURNS TABLE(
  data date,
  quantidade_postados bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    DATE(created_at) as data,
    COUNT(*) as quantidade_postados
  FROM public.orcamentos
  WHERE DATE(created_at) BETWEEN p_data_inicio AND p_data_fim
  GROUP BY DATE(created_at)
  ORDER BY data;
$$;

-- Função para listar fornecedores (para dropdown nos relatórios)
CREATE OR REPLACE FUNCTION public.listar_fornecedores_para_relatorio()
RETURNS TABLE(
  id uuid,
  nome text,
  email text,
  empresa text
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.nome,
    p.email,
    p.empresa
  FROM public.profiles p
  WHERE p.tipo_usuario = 'fornecedor'
    AND p.status = 'ativo'
    AND public.is_admin()
  ORDER BY p.nome;
$$;
