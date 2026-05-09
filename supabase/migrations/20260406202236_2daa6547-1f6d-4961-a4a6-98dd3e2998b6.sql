
-- Tabela de dados cadastrais de homologação do fornecedor
CREATE TABLE public.fornecedor_dados_homologacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cnpj TEXT NOT NULL,
  endereco_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  vigencia_contrato TEXT NOT NULL,
  forma_pagamento TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(fornecedor_id)
);

ALTER TABLE public.fornecedor_dados_homologacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver dados homologacao"
  ON public.fornecedor_dados_homologacao
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins podem inserir dados homologacao"
  ON public.fornecedor_dados_homologacao
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins podem atualizar dados homologacao"
  ON public.fornecedor_dados_homologacao
  FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- Tabela de documentos de homologação do fornecedor
CREATE TABLE public.fornecedor_documentos_homologacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('rg_cnh', 'comprovante_endereco_pf', 'cartao_cnpj', 'contrato_social', 'comprovante_endereco_pj', 'contrato_homologacao')),
  nome_arquivo TEXT NOT NULL,
  caminho_storage TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fornecedor_documentos_homologacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver documentos homologacao"
  ON public.fornecedor_documentos_homologacao
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins podem inserir documentos homologacao"
  ON public.fornecedor_documentos_homologacao
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins podem deletar documentos homologacao"
  ON public.fornecedor_documentos_homologacao
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Bucket privado para documentos de homologação
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-homologacao', 'documentos-homologacao', false);

-- Policies de storage
CREATE POLICY "Admins podem upload documentos homologacao"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documentos-homologacao' AND public.is_admin());

CREATE POLICY "Admins podem ver documentos homologacao storage"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'documentos-homologacao' AND public.is_admin());

CREATE POLICY "Admins podem deletar documentos homologacao storage"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'documentos-homologacao' AND public.is_admin());
