-- Criar tabela de configuração de etapas CRM Orçamentos
CREATE TABLE IF NOT EXISTS public.crm_etapas_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valor TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  cor TEXT NOT NULL DEFAULT 'bg-gray-500',
  icone TEXT DEFAULT '📋',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  tipo TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de configuração de etapas CRM Marcenaria
CREATE TABLE IF NOT EXISTS public.crm_marcenaria_etapas_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valor TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  cor TEXT NOT NULL DEFAULT 'bg-gray-500',
  icone TEXT DEFAULT '📋',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  bloqueado BOOLEAN DEFAULT false,
  tipo TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Políticas RLS para crm_etapas_config
ALTER TABLE public.crm_etapas_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para usuários autenticados"
ON public.crm_etapas_config FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir modificações apenas para master e admin"
ON public.crm_etapas_config FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Políticas RLS para crm_marcenaria_etapas_config
ALTER TABLE public.crm_marcenaria_etapas_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para usuários autenticados"
ON public.crm_marcenaria_etapas_config FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir modificações apenas para master e admin"
ON public.crm_marcenaria_etapas_config FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Popular crm_etapas_config com dados iniciais (CRM Orçamentos)
INSERT INTO public.crm_etapas_config (valor, titulo, descricao, cor, icone, ordem, ativo, tipo) VALUES
  ('orcamento_postado', 'Orçamento Postado', 'Orçamento criado e publicado pelo SDR', 'bg-blue-500', '📋', 1, true, 'normal'),
  ('contato_agendamento', 'Contato / Agendamento', 'Fornecedor fez contato e marcou visita', 'bg-yellow-500', '📞', 2, true, 'normal'),
  ('em_orcamento', 'Em Orçamento', 'Visita realizada, aguardando proposta do fornecedor', 'bg-orange-500', '📝', 3, true, 'normal'),
  ('propostas_enviadas', 'Propostas Enviadas', 'Fornecedor enviou proposta ao cliente', 'bg-purple-500', '📨', 4, true, 'normal'),
  ('compatibilizacao', 'Compatibilização', 'Cliente está analisando e comparando propostas', 'bg-indigo-500', '🔄', 5, true, 'normal'),
  ('fechamento_contrato', 'Fechamento / Contrato', 'Cliente escolheu fornecedor, aguardando assinatura', 'bg-green-500', '📄', 6, true, 'normal'),
  ('pos_venda_feedback', 'Pós-Venda / Feedback', 'Obra em andamento ou concluída', 'bg-teal-500', '⭐', 7, true, 'normal'),
  ('ganho', 'Ganho', 'Negócio fechado com sucesso', 'bg-emerald-600', '🎉', 8, true, 'arquivado'),
  ('perdido', 'Perdido', 'Negócio não concretizado', 'bg-red-600', '❌', 9, true, 'arquivado')
ON CONFLICT (valor) DO NOTHING;

-- Popular crm_marcenaria_etapas_config com dados iniciais (CRM Marcenaria)
INSERT INTO public.crm_marcenaria_etapas_config (valor, titulo, descricao, cor, icone, ordem, ativo, bloqueado, tipo) VALUES
  ('identificacao_automatica', 'Identificação Automática', 'Lead criado automaticamente pelo sistema', 'bg-slate-500', '🤖', 1, true, true, 'normal'),
  ('abordagem_inicial', 'Abordagem Inicial', 'Primeiro contato com o cliente', 'bg-blue-500', '👋', 2, true, false, 'normal'),
  ('qualificacao_briefing', 'Qualificação / Briefing', 'Entendendo necessidades e coletando informações', 'bg-cyan-500', '📋', 3, true, false, 'normal'),
  ('desenvolvimento_projeto', 'Desenvolvimento do Projeto', 'Criando projeto e orçamento', 'bg-purple-500', '🎨', 4, true, false, 'normal'),
  ('apresentacao_projeto', 'Apresentação do Projeto', 'Projeto pronto para apresentar ao cliente', 'bg-indigo-500', '📊', 5, true, false, 'normal'),
  ('reuniao_apresentacao', 'Reunião de Apresentação', 'Apresentação agendada ou realizada', 'bg-violet-500', '🗓️', 6, true, false, 'normal'),
  ('fechamento_contrato', 'Fechamento / Contrato', 'Cliente aprovou, aguardando contrato', 'bg-green-500', '📄', 7, true, false, 'normal'),
  ('pos_venda_feedback', 'Pós-Venda / Feedback', 'Projeto em execução ou concluído', 'bg-teal-500', '⭐', 8, true, false, 'normal'),
  ('ganho', 'Ganho', 'Negócio fechado com sucesso', 'bg-emerald-600', '🎉', 9, true, false, 'arquivado'),
  ('perdido', 'Perdido', 'Negócio não concretizado', 'bg-red-600', '❌', 10, true, false, 'arquivado')
ON CONFLICT (valor) DO NOTHING;