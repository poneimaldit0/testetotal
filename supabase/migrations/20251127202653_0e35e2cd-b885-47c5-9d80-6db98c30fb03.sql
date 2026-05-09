-- Tabela para armazenar metas de saúde da empresa
CREATE TABLE metas_saude_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Faturamento Fornecedores
  fat_fornecedores_meta_semanal NUMERIC DEFAULT 0,
  fat_fornecedores_meta_mensal NUMERIC DEFAULT 0,
  reunioes_meta_semanal INTEGER DEFAULT 0,
  reunioes_meta_mensal INTEGER DEFAULT 0,
  
  -- Faturamento Comissões
  fat_comissoes_meta_semanal NUMERIC DEFAULT 0,
  fat_comissoes_meta_mensal NUMERIC DEFAULT 0,
  publicacoes_meta_semanal INTEGER DEFAULT 0,
  publicacoes_meta_mensal INTEGER DEFAULT 0,
  tarefas_meta_semanal INTEGER DEFAULT 0,
  tarefas_meta_mensal INTEGER DEFAULT 0,
  
  -- Período de vigência
  vigente_a_partir_de DATE NOT NULL DEFAULT CURRENT_DATE,
  ativo BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para registros realizados
CREATE TABLE registros_saude_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  tipo TEXT NOT NULL CHECK (tipo IN ('faturamento_fornecedor', 'faturamento_comissao', 'reuniao')),
  valor NUMERIC DEFAULT 0,
  descricao TEXT,
  data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  
  registrado_por_id UUID REFERENCES profiles(id),
  registrado_por_nome TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE metas_saude_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_saude_empresa ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para metas_saude_empresa
CREATE POLICY "Apenas admins podem ver metas"
  ON metas_saude_empresa FOR SELECT
  USING (is_admin());

CREATE POLICY "Apenas admins podem criar metas"
  ON metas_saude_empresa FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Apenas admins podem atualizar metas"
  ON metas_saude_empresa FOR UPDATE
  USING (is_admin());

-- Políticas RLS para registros_saude_empresa
CREATE POLICY "Apenas admins podem ver registros"
  ON registros_saude_empresa FOR SELECT
  USING (is_admin());

CREATE POLICY "Apenas admins podem criar registros"
  ON registros_saude_empresa FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Apenas admins podem deletar registros"
  ON registros_saude_empresa FOR DELETE
  USING (is_admin());

-- Inserir meta padrão inicial
INSERT INTO metas_saude_empresa (
  fat_fornecedores_meta_semanal,
  fat_fornecedores_meta_mensal,
  reunioes_meta_semanal,
  reunioes_meta_mensal,
  fat_comissoes_meta_semanal,
  fat_comissoes_meta_mensal,
  publicacoes_meta_semanal,
  publicacoes_meta_mensal,
  tarefas_meta_semanal,
  tarefas_meta_mensal,
  ativo
) VALUES (
  10000, 40000, 8, 32,
  5000, 20000, 12, 50, 50, 200,
  true
);