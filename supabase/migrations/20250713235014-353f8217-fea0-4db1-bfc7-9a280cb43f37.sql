-- Criar tabela de relacionamento orçamento-checklist
CREATE TABLE public.orcamentos_checklist_itens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.checklist_itens(id) ON DELETE CASCADE,
  obrigatorio BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(orcamento_id, item_id)
);

-- Enable RLS
ALTER TABLE public.orcamentos_checklist_itens ENABLE ROW LEVEL SECURITY;

-- RLS policies for orcamentos_checklist_itens
CREATE POLICY "Admins podem gerenciar checklist de orçamentos"
ON public.orcamentos_checklist_itens
FOR ALL
USING (public.is_admin());

CREATE POLICY "Fornecedores podem ver checklist dos orçamentos que se candidataram"
ON public.orcamentos_checklist_itens
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.candidaturas_fornecedores cf
    WHERE cf.orcamento_id = orcamentos_checklist_itens.orcamento_id
      AND cf.fornecedor_id = auth.uid()
  )
);

-- Limpar itens existentes e inserir novos
DELETE FROM public.checklist_itens;

-- Inserir novos itens do checklist organizados por categoria
INSERT INTO public.checklist_itens (categoria, nome, descricao, ordem, ativo) VALUES

-- Etapas Iniciais
('Etapas Iniciais', 'Levantamento técnico no local', 'Avaliação técnica presencial da obra', 1, true),
('Etapas Iniciais', 'Projeto executivo / detalhamento técnico', 'Elaboração de projeto técnico detalhado', 2, true),
('Etapas Iniciais', 'Planejamento de obra (cronograma)', 'Cronograma detalhado das etapas da obra', 3, true),

-- Demolições e Preparações  
('Demolições e Preparações', 'Demolição de pisos existentes', 'Remoção completa dos pisos atuais', 4, true),
('Demolições e Preparações', 'Demolição de revestimentos de parede', 'Remoção de azulejos e revestimentos', 5, true),
('Demolições e Preparações', 'Demolição de forro ou sancas', 'Remoção de estruturas do teto', 6, true),
('Demolições e Preparações', 'Remoção de louças, metais e bancadas', 'Retirada de equipamentos sanitários', 7, true),
('Demolições e Preparações', 'Remoção de rodapés / guarnições', 'Retirada de acabamentos', 8, true),
('Demolições e Preparações', 'Descarte e transporte de entulho', 'Remoção e destinação de resíduos', 9, true),

-- Infraestrutura hidráulica
('Infraestrutura hidráulica', 'Readequação de pontos de água', 'Modificação da rede hidráulica', 10, true),
('Infraestrutura hidráulica', 'Troca de tubulações hidráulicas', 'Substituição completa da tubulação', 11, true),
('Infraestrutura hidráulica', 'Instalação de registros e válvulas', 'Componentes de controle hidráulico', 12, true),

-- Infraestrutura elétrica
('Infraestrutura elétrica', 'Troca de quadro de energia', 'Substituição do painel elétrico', 13, true),
('Infraestrutura elétrica', 'Passagem de nova fiação', 'Instalação de nova rede elétrica', 14, true),
('Infraestrutura elétrica', 'Instalação de disjuntores e DR', 'Dispositivos de proteção elétrica', 15, true),
('Infraestrutura elétrica', 'Ponto para ar-condicionado (elétrico e dreno)', 'Preparação para sistema de climatização', 16, true),
('Infraestrutura elétrica', 'Preparação para automação ou iluminação cênica', 'Infraestrutura para sistemas inteligentes', 17, true),

-- Outras infraestruturas
('Outras infraestruturas', 'Preparação para gás (GLP ou encanado)', 'Instalação de rede de gás', 18, true),
('Outras infraestruturas', 'Preparação para rede/internet', 'Cabeamento estruturado', 19, true),
('Outras infraestruturas', 'Preparação para som/multimídia', 'Infraestrutura audiovisual', 20, true),

-- Alvenaria e ajustes de layout
('Alvenaria e ajustes de layout', 'Fechamento de vãos', 'Vedação de aberturas', 21, true),
('Alvenaria e ajustes de layout', 'Abertura de vãos', 'Criação de novas aberturas', 22, true),
('Alvenaria e ajustes de layout', 'Construção de elementos em alvenaria/drywall', 'Novas estruturas internas', 23, true),
('Alvenaria e ajustes de layout', 'Reparo de trincas e nivelamento', 'Correções estruturais', 24, true),

-- Instalação de revestimentos
('Instalação de revestimentos', 'Regularização de contrapiso', 'Nivelamento do piso', 25, true),
('Instalação de revestimentos', 'Instalação de piso porcelanato', 'Aplicação de revestimento porcelanato', 26, true),
('Instalação de revestimentos', 'Instalação de piso cerâmico', 'Aplicação de revestimento cerâmico', 27, true),
('Instalação de revestimentos', 'Instalação de revestimento de parede', 'Azulejos e revestimentos de parede', 28, true),
('Instalação de revestimentos', 'Rejuntamento', 'Finalização das juntas', 29, true),
('Instalação de revestimentos', 'Impermeabilização de áreas molhadas', 'Proteção contra umidade', 30, true),

-- Forro e iluminação
('Forro e iluminação', 'Instalação de forro de gesso', 'Aplicação de forro em gesso', 31, true),
('Forro e iluminação', 'Sancas e cortineiros', 'Elementos decorativos do teto', 32, true),
('Forro e iluminação', 'Recortes para iluminação embutida', 'Preparação para spots', 33, true),
('Forro e iluminação', 'Ponto para lustres e pendentes', 'Infraestrutura para luminárias', 34, true),
('Forro e iluminação', 'Instalação de spots/trilhos/luminárias', 'Sistema de iluminação', 35, true),

-- Acabamentos e pintura
('Acabamentos e pintura', 'Preparação de paredes (massa corrida, lixamento)', 'Preparação para pintura', 36, true),
('Acabamentos e pintura', 'Pintura de paredes internas', 'Aplicação de tinta nas paredes', 37, true),
('Acabamentos e pintura', 'Pintura de teto', 'Aplicação de tinta no teto', 38, true),
('Acabamentos e pintura', 'Pintura de portas e rodapés', 'Pintura de elementos de madeira', 39, true),
('Acabamentos e pintura', 'Pintura de esquadrias (se houver)', 'Pintura de janelas e portas', 40, true),

-- Esquadrias, portas e marcenaria
('Esquadrias, portas e marcenaria', 'Instalação ou troca de portas', 'Colocação de portas novas', 41, true),
('Esquadrias, portas e marcenaria', 'Instalação de rodapés', 'Acabamento do piso', 42, true),
('Esquadrias, portas e marcenaria', 'Instalação de guarnições / batentes', 'Acabamento das portas', 43, true),
('Esquadrias, portas e marcenaria', 'Ajustes de janelas/esquadrias', 'Regulagem e vedação', 44, true),
('Esquadrias, portas e marcenaria', 'Instalação de móveis planejados', 'Marcenaria sob medida', 45, true),
('Esquadrias, portas e marcenaria', 'Instalação de puxadores, dobradiças, amortecedores', 'Ferragens e acessórios', 46, true),

-- Louças e metais
('Louças e metais', 'Instalação de vasos sanitários', 'Colocação de equipamentos sanitários', 47, true),
('Louças e metais', 'Instalação de lavatórios e torneiras', 'Equipamentos de pia', 48, true),
('Louças e metais', 'Instalação de chuveiros e registros', 'Sistema de banho', 49, true),
('Louças e metais', 'Instalação de ralos, sifões e válvulas', 'Componentes de drenagem', 50, true),
('Louças e metais', 'Instalação de bancadas', 'Bancadas de cozinha e banheiro', 51, true),

-- Limpeza e entrega final
('Limpeza e entrega final', 'Limpeza grossa pós-obra', 'Remoção de sujidades da obra', 52, true),
('Limpeza e entrega final', 'Limpeza fina', 'Limpeza detalhada final', 53, true),
('Limpeza e entrega final', 'Correção de detalhes (retoques)', 'Ajustes finais', 54, true),
('Limpeza e entrega final', 'Entrega técnica com checklist final', 'Vistoria e entrega', 55, true);