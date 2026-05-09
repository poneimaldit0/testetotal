-- =============================================
-- CRM DE CUSTOMER SUCCESS PARA FORNECEDORES
-- Sistema de acompanhamento guiado de 90 dias
-- =============================================

-- Tabela 1: Configuração das etapas do Pipeline CS
CREATE TABLE public.cs_etapas_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  cor TEXT NOT NULL DEFAULT 'bg-gray-500',
  cor_texto TEXT NOT NULL DEFAULT 'text-white',
  descricao TEXT,
  tipo_flag TEXT NOT NULL DEFAULT 'normal' CHECK (tipo_flag IN ('normal', 'yellow_flag', 'red_flag', 'success', 'inactive')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela 2: Acompanhamento CS de cada fornecedor
CREATE TABLE public.cs_fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  etapa_atual_id UUID REFERENCES public.cs_etapas_config(id),
  cs_responsavel_id UUID REFERENCES public.profiles(id),
  data_inicio_acompanhamento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  semana_atual INTEGER NOT NULL DEFAULT 1 CHECK (semana_atual >= 1 AND semana_atual <= 12),
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'encerrado')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(fornecedor_id)
);

-- Tabela 3: Microtreinamentos por semana (seed data)
CREATE TABLE public.cs_microtreinamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  semana INTEGER NOT NULL UNIQUE CHECK (semana >= 1 AND semana <= 12),
  titulo TEXT NOT NULL,
  descricao TEXT,
  conteudo_sugerido TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela 4: Orientações por indicador (playbook automático)
CREATE TABLE public.cs_orientacoes_indicadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicador TEXT NOT NULL CHECK (indicador IN ('inscricoes', 'visitas', 'orcamentos', 'contratos')),
  titulo TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela 5: Rituais semanais (registro semanal)
CREATE TABLE public.cs_rituais_semanais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cs_fornecedor_id UUID NOT NULL REFERENCES public.cs_fornecedores(id) ON DELETE CASCADE,
  semana INTEGER NOT NULL CHECK (semana >= 1 AND semana <= 12),
  
  -- Indicadores quantitativos
  inscricoes_orcamentos INTEGER,
  visitas_realizadas INTEGER,
  orcamentos_enviados INTEGER,
  contratos_fechados INTEGER,
  compareceu_reuniao BOOLEAN,
  
  -- Status por indicador (abaixo/dentro/acima)
  status_inscricoes TEXT CHECK (status_inscricoes IN ('abaixo', 'dentro', 'acima')),
  status_visitas TEXT CHECK (status_visitas IN ('abaixo', 'dentro', 'acima')),
  status_orcamentos TEXT CHECK (status_orcamentos IN ('abaixo', 'dentro', 'acima')),
  status_contratos TEXT CHECK (status_contratos IN ('abaixo', 'dentro', 'acima')),
  
  -- Orientações aplicadas (array de IDs das orientações marcadas)
  orientacoes_aplicadas JSONB DEFAULT '[]'::jsonb,
  
  -- Feedback do concierge
  feedback_concierge_consultado BOOLEAN DEFAULT false,
  tipo_feedback_concierge TEXT CHECK (tipo_feedback_concierge IN ('reclamacao', 'elogio', 'alerta', 'nenhum')),
  observacao_feedback_concierge TEXT,
  
  -- Microtreinamento
  treinamento_aplicado BOOLEAN DEFAULT false,
  observacao_treinamento TEXT,
  
  -- Conclusão
  concluido BOOLEAN DEFAULT false,
  concluido_por_id UUID REFERENCES public.profiles(id),
  concluido_por_nome TEXT,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(cs_fornecedor_id, semana)
);

-- Tabela 6: Planos de ação por semana
CREATE TABLE public.cs_planos_acao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ritual_semanal_id UUID NOT NULL REFERENCES public.cs_rituais_semanais(id) ON DELETE CASCADE,
  descricao_acao TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 1 CHECK (ordem >= 1 AND ordem <= 3),
  concluida BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela 7: Histórico de movimentações no pipeline
CREATE TABLE public.cs_historico_pipeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cs_fornecedor_id UUID NOT NULL REFERENCES public.cs_fornecedores(id) ON DELETE CASCADE,
  etapa_anterior_id UUID REFERENCES public.cs_etapas_config(id),
  etapa_nova_id UUID NOT NULL REFERENCES public.cs_etapas_config(id),
  movido_por_id UUID REFERENCES public.profiles(id),
  movido_por_nome TEXT,
  observacao TEXT,
  data_movimentacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- HABILITAR RLS
-- =============================================
ALTER TABLE public.cs_etapas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_microtreinamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_orientacoes_indicadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_rituais_semanais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_planos_acao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_historico_pipeline ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS DE SEGURANÇA
-- =============================================

-- Função auxiliar para verificar se é CS, admin ou master
CREATE OR REPLACE FUNCTION public.can_access_cs()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND tipo_usuario IN ('customer_success', 'admin', 'master')
    AND status = 'ativo'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

-- cs_etapas_config
CREATE POLICY "Todos autenticados podem ver etapas CS"
  ON public.cs_etapas_config FOR SELECT
  USING (true);

CREATE POLICY "Apenas admins podem gerenciar etapas CS"
  ON public.cs_etapas_config FOR ALL
  USING (is_admin());

-- cs_fornecedores
CREATE POLICY "CS e admins podem ver acompanhamentos"
  ON public.cs_fornecedores FOR SELECT
  USING (can_access_cs());

CREATE POLICY "CS e admins podem gerenciar acompanhamentos"
  ON public.cs_fornecedores FOR ALL
  USING (can_access_cs());

-- cs_microtreinamentos
CREATE POLICY "Todos autenticados podem ver microtreinamentos"
  ON public.cs_microtreinamentos FOR SELECT
  USING (true);

CREATE POLICY "Apenas admins podem gerenciar microtreinamentos"
  ON public.cs_microtreinamentos FOR ALL
  USING (is_admin());

-- cs_orientacoes_indicadores
CREATE POLICY "Todos autenticados podem ver orientações"
  ON public.cs_orientacoes_indicadores FOR SELECT
  USING (true);

CREATE POLICY "Apenas admins podem gerenciar orientações"
  ON public.cs_orientacoes_indicadores FOR ALL
  USING (is_admin());

-- cs_rituais_semanais
CREATE POLICY "CS e admins podem ver rituais"
  ON public.cs_rituais_semanais FOR SELECT
  USING (can_access_cs());

CREATE POLICY "CS e admins podem gerenciar rituais"
  ON public.cs_rituais_semanais FOR ALL
  USING (can_access_cs());

-- cs_planos_acao
CREATE POLICY "CS e admins podem ver planos de ação"
  ON public.cs_planos_acao FOR SELECT
  USING (can_access_cs());

CREATE POLICY "CS e admins podem gerenciar planos de ação"
  ON public.cs_planos_acao FOR ALL
  USING (can_access_cs());

-- cs_historico_pipeline
CREATE POLICY "CS e admins podem ver histórico"
  ON public.cs_historico_pipeline FOR SELECT
  USING (can_access_cs());

CREATE POLICY "CS e admins podem inserir histórico"
  ON public.cs_historico_pipeline FOR INSERT
  WITH CHECK (can_access_cs());

-- =============================================
-- SEED DATA: ETAPAS DO PIPELINE
-- =============================================
INSERT INTO public.cs_etapas_config (nome, ordem, cor, cor_texto, descricao, tipo_flag) VALUES
  ('Pré-Onboarding', 1, 'bg-slate-500', 'text-white', 'Fornecedor aprovado, aguardando agendamento', 'normal'),
  ('Onboarding Agendado', 2, 'bg-blue-500', 'text-white', 'Reunião de onboarding agendada', 'normal'),
  ('Onboarding Realizado', 3, 'bg-indigo-500', 'text-white', 'Onboarding concluído, iniciando ativação', 'normal'),
  ('Ativação Inicial', 4, 'bg-purple-500', 'text-white', 'Primeiras semanas de uso ativo', 'normal'),
  ('Execução Assistida', 5, 'bg-violet-500', 'text-white', 'Acompanhamento intensivo do CS', 'normal'),
  ('Execução Estável', 6, 'bg-green-500', 'text-white', 'Fornecedor operando de forma consistente', 'success'),
  ('Risco Leve', 7, 'bg-yellow-500', 'text-black', 'Yellow Flag - Indicadores levemente abaixo', 'yellow_flag'),
  ('Risco Médio', 8, 'bg-orange-500', 'text-white', 'Yellow Flag Ativo - Requer ação imediata', 'yellow_flag'),
  ('Risco Crítico', 9, 'bg-red-600', 'text-white', 'Red Flag - Risco alto de churn', 'red_flag'),
  ('Renovação Planejada', 10, 'bg-emerald-500', 'text-white', 'Em processo de renovação contratual', 'success'),
  ('Encerrado / Não Renovado', 11, 'bg-gray-400', 'text-white', 'Contrato encerrado ou não renovado', 'inactive');

-- =============================================
-- SEED DATA: MICROTREINAMENTOS (12 SEMANAS)
-- =============================================
INSERT INTO public.cs_microtreinamentos (semana, titulo, descricao, conteudo_sugerido) VALUES
  (1, 'Abertura de conversa com cliente', 'Como iniciar uma conversa que gera conexão', 'Técnicas de rapport, perguntas abertas, demonstrar interesse genuíno'),
  (2, 'Conduzir visita que converte', 'Estrutura da visita técnica de alta conversão', 'Checklist de visita, pontos de atenção, como identificar necessidades'),
  (3, 'Montar proposta irresistível', 'Como criar propostas que vendem valor', 'Estrutura da proposta, ancoragem de preço, diferenciação'),
  (4, 'Follow-up sem ser inconveniente', 'Cadência de follow-up efetiva', 'Timing ideal, mensagens de valor, quando parar'),
  (5, 'Feedback e NPS + lidar com objeções', 'Coletar feedback e tratar objeções comuns', 'Perguntas de NPS, principais objeções e respostas'),
  (6, 'Lidar com objeções + agregar valor', 'Técnicas avançadas de tratamento de objeções', 'Método LAER, agregação de valor, casos de sucesso'),
  (7, 'Convite para podcast ou almoço com dono', 'Estratégias de relacionamento executivo', 'Como fazer convite, preparação, benefícios'),
  (8, 'Escalar o negócio e análise do funil', 'Visão estratégica de crescimento', 'Análise de métricas, identificação de gargalos, plano de escala'),
  (9, 'Realização do podcast ou almoço', 'Execução do relacionamento executivo', 'Roteiro de conversa, temas a abordar, próximos passos'),
  (10, 'Tratar objeções avançadas', 'Objeções complexas e negociação', 'Objeções de preço, prazo, concorrência'),
  (11, 'Planejamento dos próximos 90 dias', 'Construção do plano de continuidade', 'Metas, ações, checkpoints, responsabilidades'),
  (12, 'Produtos complementares e homologação', 'Apresentar upsell e comunicar homologação', 'Portfólio de produtos, benefícios da homologação, próximo ciclo');

-- =============================================
-- SEED DATA: ORIENTAÇÕES POR INDICADOR
-- =============================================
-- Inscrições em orçamentos
INSERT INTO public.cs_orientacoes_indicadores (indicador, titulo, descricao, ordem) VALUES
  ('inscricoes', 'Orientar sobre volume atual', 'Alertar que com o volume atual não baterá a meta', 1),
  ('inscricoes', 'Reforçar necessidade de aumento', 'Explicar a correlação entre inscrições e resultados', 2);

-- Visitas
INSERT INTO public.cs_orientacoes_indicadores (indicador, titulo, descricao, ordem) VALUES
  ('visitas', 'Avaliar falha na abordagem', 'Revisar script de primeiro contato e cadência', 1),
  ('visitas', 'Avaliar desqualificação do lead', 'Verificar se está selecionando leads adequados', 2),
  ('visitas', 'Sinalizar para time interno', 'Acionar suporte para análise do caso', 3),
  ('visitas', 'Liberar acesso adicional', 'Quando aplicável, liberar 1 acesso extra', 4);

-- Orçamentos enviados
INSERT INTO public.cs_orientacoes_indicadores (indicador, titulo, descricao, ordem) VALUES
  ('orcamentos', 'Analisar e revisar propostas', 'Verificar qualidade das propostas enviadas', 1),
  ('orcamentos', 'Reforçar prazo máximo 48h', 'Enfatizar importância do prazo de envio', 2),
  ('orcamentos', 'Orientar critério na escolha', 'Ajudar a selecionar melhores oportunidades', 3);

-- Contratos fechados
INSERT INTO public.cs_orientacoes_indicadores (indicador, titulo, descricao, ordem) VALUES
  ('contratos', 'Analisar SLA demorado', 'Verificar se tempo de resposta está adequado', 1),
  ('contratos', 'Cliente sem orçamento', 'Avaliar qualificação do cliente', 2),
  ('contratos', 'Falta de apresentação comercial', 'Reforçar técnicas de apresentação', 3),
  ('contratos', 'Falta de venda de valor', 'Treinar diferenciação e proposta de valor', 4),
  ('contratos', 'Ausência de follow-up', 'Implementar cadência de acompanhamento', 5);

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_cs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cs_fornecedores_updated_at
  BEFORE UPDATE ON public.cs_fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.update_cs_updated_at();

CREATE TRIGGER update_cs_rituais_semanais_updated_at
  BEFORE UPDATE ON public.cs_rituais_semanais
  FOR EACH ROW EXECUTE FUNCTION public.update_cs_updated_at();

CREATE TRIGGER update_cs_etapas_config_updated_at
  BEFORE UPDATE ON public.cs_etapas_config
  FOR EACH ROW EXECUTE FUNCTION public.update_cs_updated_at();