-- Corrigir política RLS da tabela contas_receber para permitir acesso a usuários que podem acessar módulo financeiro
DROP POLICY IF EXISTS "Apenas masters podem acessar contas a receber" ON public.contas_receber;

CREATE POLICY "Usuários autorizados podem acessar contas a receber" 
ON public.contas_receber 
FOR ALL 
USING (can_access_financial());

-- Corrigir política RLS da tabela contas_pagar para consistência
DROP POLICY IF EXISTS "Apenas masters podem acessar contas a pagar" ON public.contas_pagar;

CREATE POLICY "Usuários autorizados podem acessar contas a pagar" 
ON public.contas_pagar 
FOR ALL 
USING (can_access_financial());

-- Corrigir política RLS da tabela motivos_perda
DROP POLICY IF EXISTS "Apenas masters podem acessar motivos de perda" ON public.motivos_perda;

CREATE POLICY "Usuários autorizados podem acessar motivos de perda" 
ON public.motivos_perda 
FOR ALL 
USING (can_access_financial());

-- Corrigir política RLS da tabela transacoes_financeiras  
DROP POLICY IF EXISTS "Apenas masters podem acessar transações financeiras" ON public.transacoes_financeiras;

CREATE POLICY "Usuários autorizados podem acessar transações financeiras" 
ON public.transacoes_financeiras 
FOR ALL 
USING (can_access_financial());

-- Corrigir política RLS da tabela movimentacoes_bancarias
DROP POLICY IF EXISTS "Apenas masters podem acessar movimentações bancárias" ON public.movimentacoes_bancarias;

CREATE POLICY "Usuários autorizados podem acessar movimentações bancárias" 
ON public.movimentacoes_bancarias 
FOR ALL 
USING (can_access_financial());

-- Corrigir política RLS da tabela contas_bancarias
DROP POLICY IF EXISTS "Apenas masters podem acessar contas bancárias" ON public.contas_bancarias;

CREATE POLICY "Usuários autorizados podem acessar contas bancárias" 
ON public.contas_bancarias 
FOR ALL 
USING (can_access_financial());

-- Corrigir política RLS da tabela categorias_financeiras
DROP POLICY IF EXISTS "Apenas masters podem acessar categorias financeiras" ON public.categorias_financeiras;

CREATE POLICY "Usuários autorizados podem acessar categorias financeiras" 
ON public.categorias_financeiras 
FOR ALL 
USING (can_access_financial());

-- Corrigir política RLS da tabela fornecedores_clientes
DROP POLICY IF EXISTS "Apenas masters podem acessar fornecedores/clientes" ON public.fornecedores_clientes;

CREATE POLICY "Usuários autorizados podem acessar fornecedores/clientes" 
ON public.fornecedores_clientes 
FOR ALL 
USING (can_access_financial());

-- Corrigir política RLS da tabela fechamentos_caixa
DROP POLICY IF EXISTS "Apenas masters podem acessar fechamentos de caixa" ON public.fechamentos_caixa;

CREATE POLICY "Usuários autorizados podem acessar fechamentos de caixa" 
ON public.fechamentos_caixa 
FOR ALL 
USING (can_access_financial());

-- Corrigir política RLS da tabela conciliacoes_bancarias
DROP POLICY IF EXISTS "Apenas masters podem acessar conciliações bancárias" ON public.conciliacoes_bancarias;

CREATE POLICY "Usuários autorizados podem acessar conciliações bancárias" 
ON public.conciliacoes_bancarias 
FOR ALL 
USING (can_access_financial());