-- Corrigir política RLS para permitir solicitações de revisão por clientes não autenticados
-- via token de comparação

-- Primeiro, remover a política existente restritiva
DROP POLICY IF EXISTS "Admins podem gerenciar revisões" ON public.revisoes_propostas_clientes;

-- Criar nova política para admins gerenciarem tudo
CREATE POLICY "Admins podem gerenciar todas as revisões" 
ON public.revisoes_propostas_clientes 
FOR ALL
USING (is_admin());

-- Criar política para permitir INSERT de revisões por clientes com token válido
CREATE POLICY "Clientes podem solicitar revisões via token válido" 
ON public.revisoes_propostas_clientes 
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM checklist_propostas cp
    JOIN candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
    JOIN tokens_comparacao_cliente t ON t.orcamento_id = cf.orcamento_id
    WHERE cp.id = checklist_proposta_id
      AND t.expires_at > now()
  )
);

-- Política para clientes verem status de suas revisões (apenas leitura)
CREATE POLICY "Clientes podem ver status de suas revisões via token"
ON public.revisoes_propostas_clientes
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM checklist_propostas cp
    JOIN candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
    JOIN tokens_comparacao_cliente t ON t.orcamento_id = cf.orcamento_id
    WHERE cp.id = checklist_proposta_id
      AND t.expires_at > now()
  )
);