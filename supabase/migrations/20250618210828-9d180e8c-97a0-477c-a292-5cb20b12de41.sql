
-- Primeiro, vamos migrar os dados da tabela inscricoes_fornecedores para candidaturas_fornecedores
INSERT INTO public.candidaturas_fornecedores (
  orcamento_id,
  fornecedor_id,
  nome,
  email,
  telefone,
  empresa,
  status_acompanhamento,
  data_candidatura,
  created_at,
  updated_at
)
SELECT 
  orcamento_id,
  fornecedor_id,
  nome,
  email,
  telefone,
  empresa,
  status_acompanhamento::text,
  data_inscricao,
  data_inscricao,
  data_inscricao
FROM public.inscricoes_fornecedores
WHERE orcamento_id IS NOT NULL 
  AND fornecedor_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Habilitar RLS na tabela candidaturas_fornecedores
ALTER TABLE public.candidaturas_fornecedores ENABLE ROW LEVEL SECURITY;

-- Política para fornecedores verem suas próprias candidaturas
CREATE POLICY "Fornecedores podem ver suas próprias candidaturas" 
ON public.candidaturas_fornecedores 
FOR SELECT 
USING (fornecedor_id = auth.uid());

-- Política para fornecedores criarem suas próprias candidaturas
CREATE POLICY "Fornecedores podem criar suas próprias candidaturas" 
ON public.candidaturas_fornecedores 
FOR INSERT 
WITH CHECK (fornecedor_id = auth.uid());

-- Política para fornecedores atualizarem suas próprias candidaturas
CREATE POLICY "Fornecedores podem atualizar suas próprias candidaturas" 
ON public.candidaturas_fornecedores 
FOR UPDATE 
USING (fornecedor_id = auth.uid());

-- Política para admins verem todas as candidaturas
CREATE POLICY "Admins podem ver todas as candidaturas" 
ON public.candidaturas_fornecedores 
FOR ALL 
USING (public.is_admin());

-- Atualizar contagem de empresas nos orçamentos baseado na nova tabela
UPDATE public.orcamentos 
SET quantidade_empresas = subquery.count_empresas
FROM (
  SELECT 
    orcamento_id, 
    COUNT(*) as count_empresas
  FROM public.candidaturas_fornecedores 
  GROUP BY orcamento_id
) AS subquery
WHERE orcamentos.id = subquery.orcamento_id;
