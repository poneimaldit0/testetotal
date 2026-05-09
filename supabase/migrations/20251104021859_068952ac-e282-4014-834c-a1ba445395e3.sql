-- Habilitar RLS na tabela de configurações de marcenaria
ALTER TABLE public.configuracoes_marcenaria ENABLE ROW LEVEL SECURITY;

-- Política para admins e masters visualizarem configurações
CREATE POLICY "Admins podem visualizar configurações de marcenaria"
ON public.configuracoes_marcenaria
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND tipo_usuario IN ('admin', 'master')
      AND status = 'ativo'
  )
);

-- Política para admins e masters atualizarem configurações
CREATE POLICY "Admins podem atualizar configurações de marcenaria"
ON public.configuracoes_marcenaria
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND tipo_usuario IN ('admin', 'master')
      AND status = 'ativo'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND tipo_usuario IN ('admin', 'master')
      AND status = 'ativo'
  )
);