-- Criar bucket de storage para anexos de orçamentos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('orcamentos-anexos', 'orcamentos-anexos', true);

-- Criar políticas de acesso para o bucket de anexos
CREATE POLICY "Usuários podem ver anexos de orçamentos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'orcamentos-anexos');

CREATE POLICY "Admins podem fazer upload de anexos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'orcamentos-anexos' AND is_admin());

CREATE POLICY "Admins podem deletar anexos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'orcamentos-anexos' AND is_admin());