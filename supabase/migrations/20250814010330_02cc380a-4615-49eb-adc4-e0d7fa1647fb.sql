-- Criar políticas RLS para acesso público do comparador de propostas

-- Política para candidaturas_fornecedores - permitir acesso público baseado em token
CREATE POLICY "Acesso público para comparação de propostas" ON public.candidaturas_fornecedores
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tokens_comparacao_cliente t
    WHERE t.orcamento_id = candidaturas_fornecedores.orcamento_id
      AND t.expires_at > now()
  )
);

-- Política para checklist_propostas - permitir acesso público baseado em token
CREATE POLICY "Acesso público para comparação de propostas" ON public.checklist_propostas
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.candidaturas_fornecedores cf
    JOIN public.tokens_comparacao_cliente t ON t.orcamento_id = cf.orcamento_id
    WHERE cf.id = checklist_propostas.candidatura_id
      AND t.expires_at > now()
  )
);

-- Política para respostas_checklist - permitir acesso público baseado em token
CREATE POLICY "Acesso público para comparação de propostas" ON public.respostas_checklist
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.checklist_propostas cp
    JOIN public.candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
    JOIN public.tokens_comparacao_cliente t ON t.orcamento_id = cf.orcamento_id
    WHERE cp.id = respostas_checklist.checklist_proposta_id
      AND t.expires_at > now()
  )
);

-- Política para checklist_itens - permitir acesso público (já existe política "Todos podem ver itens do checklist")

-- Política para orcamentos - permitir acesso público baseado em token
CREATE POLICY "Acesso público para comparação de orçamentos" ON public.orcamentos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tokens_comparacao_cliente t
    WHERE t.orcamento_id = orcamentos.id
      AND t.expires_at > now()
  )
);