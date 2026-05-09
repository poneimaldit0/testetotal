
-- Habilitar RLS na tabela inscricoes_fornecedores
ALTER TABLE public.inscricoes_fornecedores ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários autenticados façam inscrições
CREATE POLICY "Users can insert their own inscriptions" ON public.inscricoes_fornecedores
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política para permitir que usuários vejam suas próprias inscrições
CREATE POLICY "Users can view their own inscriptions" ON public.inscricoes_fornecedores
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Política para admins verem todas as inscrições
CREATE POLICY "Admins can view all inscriptions" ON public.inscricoes_fornecedores
  FOR SELECT 
  USING (public.is_admin());

-- Política para admins modificarem inscrições
CREATE POLICY "Admins can update all inscriptions" ON public.inscricoes_fornecedores
  FOR UPDATE 
  USING (public.is_admin());
