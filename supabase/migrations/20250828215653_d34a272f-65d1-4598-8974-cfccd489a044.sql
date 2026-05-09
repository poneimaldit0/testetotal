-- Corrigir constraints de chave estrangeira para permitir exclusão de orçamentos

-- Primeiro, dropar a constraint existente e recriar com CASCADE
ALTER TABLE public.checklist_colaborativo 
DROP CONSTRAINT IF EXISTS checklist_colaborativo_orcamento_id_fkey;

ALTER TABLE public.checklist_colaborativo 
ADD CONSTRAINT checklist_colaborativo_orcamento_id_fkey 
FOREIGN KEY (orcamento_id) REFERENCES public.orcamentos(id) 
ON UPDATE CASCADE ON DELETE CASCADE;

-- Verificar e corrigir constraint da tabela contribuicoes_checklist se existir
ALTER TABLE public.contribuicoes_checklist 
DROP CONSTRAINT IF EXISTS contribuicoes_checklist_checklist_colaborativo_id_fkey;

ALTER TABLE public.contribuicoes_checklist 
ADD CONSTRAINT contribuicoes_checklist_checklist_colaborativo_id_fkey 
FOREIGN KEY (checklist_colaborativo_id) REFERENCES public.checklist_colaborativo(id) 
ON UPDATE CASCADE ON DELETE CASCADE;

-- Verificar outras tabelas que podem ter foreign keys para orçamentos
-- e garantir que usem CASCADE apropriado

-- Arquivos de orçamento
ALTER TABLE public.arquivos_orcamento 
DROP CONSTRAINT IF EXISTS arquivos_orcamento_orcamento_id_fkey;

ALTER TABLE public.arquivos_orcamento 
ADD CONSTRAINT arquivos_orcamento_orcamento_id_fkey 
FOREIGN KEY (orcamento_id) REFERENCES public.orcamentos(id) 
ON UPDATE CASCADE ON DELETE CASCADE;

-- Candidaturas de fornecedores
ALTER TABLE public.candidaturas_fornecedores 
DROP CONSTRAINT IF EXISTS candidaturas_fornecedores_orcamento_id_fkey;

ALTER TABLE public.candidaturas_fornecedores 
ADD CONSTRAINT candidaturas_fornecedores_orcamento_id_fkey 
FOREIGN KEY (orcamento_id) REFERENCES public.orcamentos(id) 
ON UPDATE CASCADE ON DELETE CASCADE;

-- Inscrições de fornecedores
ALTER TABLE public.inscricoes_fornecedores 
DROP CONSTRAINT IF EXISTS inscricoes_fornecedores_orcamento_id_fkey;

ALTER TABLE public.inscricoes_fornecedores 
ADD CONSTRAINT inscricoes_fornecedores_orcamento_id_fkey 
FOREIGN KEY (orcamento_id) REFERENCES public.orcamentos(id) 
ON UPDATE CASCADE ON DELETE CASCADE;

-- Itens do checklist de orçamentos
ALTER TABLE public.orcamentos_checklist_itens 
DROP CONSTRAINT IF EXISTS orcamentos_checklist_itens_orcamento_id_fkey;

ALTER TABLE public.orcamentos_checklist_itens 
ADD CONSTRAINT orcamentos_checklist_itens_orcamento_id_fkey 
FOREIGN KEY (orcamento_id) REFERENCES public.orcamentos(id) 
ON UPDATE CASCADE ON DELETE CASCADE;

-- Códigos de acesso a propostas
ALTER TABLE public.codigos_acesso_propostas 
DROP CONSTRAINT IF EXISTS codigos_acesso_propostas_orcamento_id_fkey;

ALTER TABLE public.codigos_acesso_propostas 
ADD CONSTRAINT codigos_acesso_propostas_orcamento_id_fkey 
FOREIGN KEY (orcamento_id) REFERENCES public.orcamentos(id) 
ON UPDATE CASCADE ON DELETE CASCADE;

-- Tokens de comparação cliente
ALTER TABLE public.tokens_comparacao_cliente 
DROP CONSTRAINT IF EXISTS tokens_comparacao_cliente_orcamento_id_fkey;

ALTER TABLE public.tokens_comparacao_cliente 
ADD CONSTRAINT tokens_comparacao_cliente_orcamento_id_fkey 
FOREIGN KEY (orcamento_id) REFERENCES public.orcamentos(id) 
ON UPDATE CASCADE ON DELETE CASCADE;

-- Senhas de comparação de orçamentos  
ALTER TABLE public.senhas_comparacao_orcamentos 
DROP CONSTRAINT IF EXISTS senhas_comparacao_orcamentos_orcamento_id_fkey;

ALTER TABLE public.senhas_comparacao_orcamentos 
ADD CONSTRAINT senhas_comparacao_orcamentos_orcamento_id_fkey 
FOREIGN KEY (orcamento_id) REFERENCES public.orcamentos(id) 
ON UPDATE CASCADE ON DELETE CASCADE;

-- Contas a receber (opcional - pode querer SET NULL em vez de CASCADE)
ALTER TABLE public.contas_receber 
DROP CONSTRAINT IF EXISTS contas_receber_orcamento_id_fkey;

ALTER TABLE public.contas_receber 
ADD CONSTRAINT contas_receber_orcamento_id_fkey 
FOREIGN KEY (orcamento_id) REFERENCES public.orcamentos(id) 
ON UPDATE CASCADE ON DELETE SET NULL;

-- Avaliações de fornecedores (opcional - pode querer SET NULL em vez de CASCADE)
ALTER TABLE public.avaliacoes_fornecedores 
DROP CONSTRAINT IF EXISTS avaliacoes_fornecedores_orcamento_id_fkey;

ALTER TABLE public.avaliacoes_fornecedores 
ADD CONSTRAINT avaliacoes_fornecedores_orcamento_id_fkey 
FOREIGN KEY (orcamento_id) REFERENCES public.orcamentos(id) 
ON UPDATE CASCADE ON DELETE SET NULL;

-- Log da correção
INSERT INTO public.logs_acesso (user_id, acao)
VALUES (auth.uid(), 'correcao_constraints_exclusao_orcamentos');