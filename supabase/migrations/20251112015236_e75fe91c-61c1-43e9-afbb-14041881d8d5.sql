-- Criar tabela para anexos do CRM de Marcenaria
CREATE TABLE IF NOT EXISTS crm_marcenaria_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_marcenaria_leads(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  tipo_arquivo text NOT NULL,
  tamanho bigint NOT NULL,
  caminho_storage text NOT NULL,
  url_arquivo text NOT NULL,
  categoria text NOT NULL DEFAULT 'documento' CHECK (categoria IN ('documento', 'imagem', 'video')),
  adicionado_por_id uuid REFERENCES profiles(id),
  adicionado_por_nome text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_crm_marcenaria_anexos_lead_id ON crm_marcenaria_anexos(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_marcenaria_anexos_categoria ON crm_marcenaria_anexos(categoria);

-- Criar bucket público para anexos de marcenaria
INSERT INTO storage.buckets (id, name, public) 
VALUES ('crm-marcenaria-anexos', 'crm-marcenaria-anexos', true)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS na tabela
ALTER TABLE crm_marcenaria_anexos ENABLE ROW LEVEL SECURITY;

-- Políticas para tabela crm_marcenaria_anexos
CREATE POLICY "Usuários autorizados podem ver anexos"
ON crm_marcenaria_anexos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario IN (
      'master', 'admin', 'gestor_marcenaria', 
      'consultor_marcenaria', 'customer_success'
    )
  )
);

CREATE POLICY "Usuários autorizados podem adicionar anexos"
ON crm_marcenaria_anexos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario IN (
      'master', 'admin', 'gestor_marcenaria', 
      'consultor_marcenaria', 'customer_success'
    )
  )
);

CREATE POLICY "Usuários autorizados podem deletar anexos"
ON crm_marcenaria_anexos FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario IN (
      'master', 'admin', 'gestor_marcenaria', 'customer_success'
    )
  )
);

-- Políticas para Storage bucket
CREATE POLICY "Usuários autorizados podem ver arquivos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'crm-marcenaria-anexos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario IN (
      'master', 'admin', 'gestor_marcenaria', 
      'consultor_marcenaria', 'customer_success'
    )
  )
);

CREATE POLICY "Usuários autorizados podem fazer upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'crm-marcenaria-anexos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario IN (
      'master', 'admin', 'gestor_marcenaria', 
      'consultor_marcenaria', 'customer_success'
    )
  )
);

CREATE POLICY "Usuários autorizados podem deletar arquivos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'crm-marcenaria-anexos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario IN (
      'master', 'admin', 'gestor_marcenaria', 'customer_success'
    )
  )
);