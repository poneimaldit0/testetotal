-- Criar tabela para armazenar arquivos de propostas dos fornecedores
CREATE TABLE public.propostas_arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id uuid NOT NULL REFERENCES candidaturas_fornecedores(id) ON DELETE CASCADE,
  orcamento_id uuid NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  url_arquivo text NOT NULL,
  caminho_storage text NOT NULL,
  tipo_arquivo text NOT NULL,
  tamanho bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.propostas_arquivos ENABLE ROW LEVEL SECURITY;

-- Índices para performance
CREATE INDEX idx_propostas_arquivos_candidatura ON public.propostas_arquivos(candidatura_id);
CREATE INDEX idx_propostas_arquivos_orcamento ON public.propostas_arquivos(orcamento_id);
CREATE INDEX idx_propostas_arquivos_fornecedor ON public.propostas_arquivos(fornecedor_id);

-- Políticas RLS

-- Fornecedores podem inserir seus próprios arquivos
CREATE POLICY "Fornecedores podem inserir suas propostas"
ON public.propostas_arquivos
FOR INSERT
WITH CHECK (fornecedor_id = auth.uid());

-- Fornecedores podem ver seus próprios arquivos
CREATE POLICY "Fornecedores podem ver suas propostas"
ON public.propostas_arquivos
FOR SELECT
USING (fornecedor_id = auth.uid());

-- Fornecedores podem deletar seus próprios arquivos
CREATE POLICY "Fornecedores podem deletar suas propostas"
ON public.propostas_arquivos
FOR DELETE
USING (fornecedor_id = auth.uid());

-- Admins podem ver todas as propostas
CREATE POLICY "Admins podem ver todas as propostas"
ON public.propostas_arquivos
FOR SELECT
USING (is_admin());

-- Gestores de conta podem ver propostas dos seus orçamentos
CREATE POLICY "Gestores podem ver propostas dos seus orçamentos"
ON public.propostas_arquivos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orcamentos_crm_tracking oct
    WHERE oct.orcamento_id = propostas_arquivos.orcamento_id
    AND oct.concierge_responsavel_id = auth.uid()
  )
);

-- Customer Success podem ver todas as propostas
CREATE POLICY "CS podem ver todas as propostas"
ON public.propostas_arquivos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = 'customer_success'
    AND profiles.status = 'ativo'
  )
);

-- Criar bucket para armazenamento das propostas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'propostas-fornecedores',
  'propostas-fornecedores',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
);

-- Políticas de Storage

-- Fornecedores podem fazer upload em sua pasta
CREATE POLICY "Fornecedores podem fazer upload de propostas"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'propostas-fornecedores'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Fornecedores podem ver seus arquivos
CREATE POLICY "Fornecedores podem ver seus arquivos de propostas"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'propostas-fornecedores'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Fornecedores podem deletar seus arquivos
CREATE POLICY "Fornecedores podem deletar seus arquivos de propostas"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'propostas-fornecedores'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins podem ver todos os arquivos do bucket
CREATE POLICY "Admins podem ver todos arquivos de propostas"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'propostas-fornecedores'
  AND is_admin()
);

-- Gestores podem ver arquivos de propostas dos seus orçamentos
CREATE POLICY "Gestores podem ver arquivos de propostas"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'propostas-fornecedores'
  AND EXISTS (
    SELECT 1 FROM propostas_arquivos pa
    JOIN orcamentos_crm_tracking oct ON oct.orcamento_id = pa.orcamento_id
    WHERE pa.caminho_storage = name
    AND oct.concierge_responsavel_id = auth.uid()
  )
);

-- CS podem ver todos os arquivos do bucket
CREATE POLICY "CS podem ver todos arquivos de propostas"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'propostas-fornecedores'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tipo_usuario = 'customer_success'
    AND profiles.status = 'ativo'
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_propostas_arquivos_updated_at
BEFORE UPDATE ON public.propostas_arquivos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();