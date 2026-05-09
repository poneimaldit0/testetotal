-- Separar motivos de perda do CRM e Financeiro em tabelas independentes

-- 1. Criar tabela específica para motivos de perda do CRM
CREATE TABLE public.motivos_perda_crm (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Inserir motivos específicos para CRM
INSERT INTO public.motivos_perda_crm (nome, descricao, ordem) VALUES
('Cliente não respondeu contatos iniciais', 'Cliente não respondeu às tentativas de contato inicial', 1),
('Cliente escolheu outro fornecedor', 'Cliente optou por trabalhar com outro fornecedor', 2),
('Orçamento fora do budget do cliente', 'Valor apresentado não cabe no orçamento do cliente', 3),
('Cliente desistiu do projeto', 'Cliente decidiu não seguir com o projeto de reforma', 4),
('Prazo não atendeu necessidade', 'Prazo de execução não atendia a necessidade do cliente', 5),
('Cliente não qualificado', 'Cliente não tinha condições/interesse real', 6),
('Projeto muito pequeno/grande', 'Escopo do projeto não era adequado para nossos fornecedores', 7),
('Outros motivos', 'Outros motivos não listados acima', 8);

-- 3. Migrar dados existentes de CRM (se houver)
INSERT INTO public.motivos_perda_crm (id, nome, descricao, ordem, ativo, created_at)
SELECT DISTINCT 
  mp.id,
  mp.nome,
  mp.descricao,
  mp.ordem,
  mp.ativo,
  mp.created_at
FROM public.motivos_perda mp
INNER JOIN public.orcamentos_crm_tracking oct ON oct.motivo_perda_id = mp.id
ON CONFLICT (id) DO NOTHING;

-- 4. Criar nova coluna temporária em orcamentos_crm_tracking
ALTER TABLE public.orcamentos_crm_tracking 
ADD COLUMN motivo_perda_crm_id UUID REFERENCES public.motivos_perda_crm(id);

-- 5. Migrar referências existentes
UPDATE public.orcamentos_crm_tracking oct
SET motivo_perda_crm_id = oct.motivo_perda_id
WHERE oct.motivo_perda_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM public.motivos_perda_crm mp WHERE mp.id = oct.motivo_perda_id);

-- 6. Dropar a view que depende da coluna
DROP VIEW IF EXISTS view_orcamentos_crm_com_checklist;

-- 7. Remover coluna antiga e renomear a nova
ALTER TABLE public.orcamentos_crm_tracking DROP COLUMN motivo_perda_id;
ALTER TABLE public.orcamentos_crm_tracking RENAME COLUMN motivo_perda_crm_id TO motivo_perda_id;

-- 8. Recriar a view agora usando motivos_perda_crm
CREATE OR REPLACE VIEW view_orcamentos_crm_com_checklist AS
SELECT 
  vcrm.id,
  vcrm.codigo_orcamento,
  vcrm.necessidade,
  vcrm.local,
  vcrm.categorias,
  vcrm.tamanho_imovel,
  vcrm.dados_contato,
  vcrm.data_publicacao,
  vcrm.created_at,
  vcrm.etapa_crm,
  vcrm.status_contato,
  vcrm.observacoes_internas,
  vcrm.feedback_cliente_nota,
  vcrm.feedback_cliente_comentario,
  vcrm.ultima_atualizacao,
  vcrm.concierge_responsavel_id,
  vcrm.concierge_nome,
  vcrm.concierge_email,
  vcrm.gestor_conta_id,
  vcrm.gestor_nome,
  vcrm.fornecedores_inscritos_count,
  vcrm.propostas_enviadas_count,
  oct.valor_lead_estimado,
  oct.motivo_perda_id,
  oct.justificativa_perda,
  oct.data_conclusao,
  mp.nome AS motivo_perda_nome,
  mp.descricao AS motivo_perda_descricao,
  COALESCE(EXTRACT(day FROM now() - oct.data_entrada_etapa_atual), 0)::integer AS tempo_na_etapa_dias,
  CASE
    WHEN oct.total_itens_checklist > 0 THEN round(oct.itens_checklist_concluidos::numeric / oct.total_itens_checklist::numeric * 100, 0)
    ELSE 0
  END AS percentual_checklist_concluido,
  oct.tem_alertas_pendentes AS tem_alertas,
  oct.total_itens_checklist,
  oct.itens_checklist_concluidos
FROM view_orcamentos_crm vcrm
JOIN orcamentos_crm_tracking oct ON oct.orcamento_id = vcrm.id
LEFT JOIN motivos_perda_crm mp ON mp.id = oct.motivo_perda_id;

-- 9. Habilitar RLS na nova tabela
ALTER TABLE public.motivos_perda_crm ENABLE ROW LEVEL SECURITY;

-- 10. Criar políticas RLS
CREATE POLICY "Admins e gestores podem gerenciar motivos CRM" 
ON public.motivos_perda_crm 
FOR ALL 
USING (is_admin_or_gestor());

CREATE POLICY "Todos usuários autenticados podem ler motivos CRM ativos" 
ON public.motivos_perda_crm 
FOR SELECT 
USING (ativo = true);

-- 11. Renomear tabela antiga para deixar claro que é só do Financeiro
ALTER TABLE public.motivos_perda RENAME TO motivos_perda_financeiro;

-- 12. Comentários para documentação
COMMENT ON TABLE public.motivos_perda_crm IS 
'Motivos de perda específicos para o CRM - quando um lead/orçamento é perdido';

COMMENT ON TABLE public.motivos_perda_financeiro IS 
'Motivos de perda específicos para o Financeiro - quando uma conta a receber é marcada como perdida';