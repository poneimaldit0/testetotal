-- Modificar tabela respostas_checklist para suportar itens extras
ALTER TABLE respostas_checklist 
ADD COLUMN item_extra boolean DEFAULT false,
ADD COLUMN nome_item_extra text,
ADD COLUMN descricao_item_extra text;

-- Tornar item_id opcional para itens personalizados
ALTER TABLE respostas_checklist 
ALTER COLUMN item_id DROP NOT NULL;

-- Criar tabela para itens extras personalizados
CREATE TABLE itens_extras_personalizados (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  descricao text,
  categoria text DEFAULT 'Extras',
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS na nova tabela
ALTER TABLE itens_extras_personalizados ENABLE ROW LEVEL SECURITY;

-- Políticas para itens extras personalizados
CREATE POLICY "Admins podem gerenciar itens extras personalizados" 
ON itens_extras_personalizados 
FOR ALL 
USING (is_admin());

CREATE POLICY "Todos podem ver itens extras personalizados" 
ON itens_extras_personalizados 
FOR SELECT 
USING (true);