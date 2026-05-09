-- Limpar categorias existentes e inserir as novas categorias específicas
DELETE FROM public.categorias_financeiras;

-- Inserir as 5 categorias específicas para contas a receber
INSERT INTO public.categorias_financeiras (nome, tipo, descricao, ativa) VALUES
('Comissionamento de reforma', 'receita', 'Comissões recebidas por projetos de reforma', true),
('Comissionamento de materiais', 'receita', 'Comissões recebidas por venda de materiais', true),
('Homologação', 'receita', 'Receitas de processos de homologação', true),
('Produtos complementares', 'receita', 'Vendas de produtos complementares', true),
('Publicidade e propaganda', 'receita', 'Receitas de serviços de marketing e publicidade', true);