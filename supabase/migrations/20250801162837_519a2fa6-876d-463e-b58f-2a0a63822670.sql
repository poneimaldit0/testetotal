-- Criar tabela para motivos de perda
CREATE TABLE public.motivos_perda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir motivos padronizados
INSERT INTO public.motivos_perda (nome, descricao, ordem) VALUES
('Cliente encerrou atividades', 'Cliente encerrou suas atividades comerciais', 1),
('Cliente inadimplente - sem resposta', 'Cliente não responde às tentativas de contato', 2),
('Disputa comercial não resolvida', 'Divergência sobre o serviço prestado não foi resolvida', 3),
('Cliente em recuperação judicial', 'Cliente está em processo de recuperação judicial', 4),
('Valor muito baixo - não compensa cobrança', 'Valor da conta é muito baixo para justificar cobrança', 5),
('Erro na prestação de serviço', 'Erro identificado na prestação do serviço', 6),
('Cliente não reconhece o débito', 'Cliente contesta a existência do débito', 7),
('Outros motivos', 'Outros motivos não listados acima', 8);

-- Adicionar colunas na tabela contas_receber
ALTER TABLE public.contas_receber 
ADD COLUMN motivo_perda_id UUID REFERENCES public.motivos_perda(id),
ADD COLUMN justificativa_perda TEXT,
ADD COLUMN data_perda DATE;

-- Habilitar RLS na nova tabela
ALTER TABLE public.motivos_perda ENABLE ROW LEVEL SECURITY;

-- Criar política para motivos de perda
CREATE POLICY "Apenas masters podem acessar motivos de perda" 
ON public.motivos_perda 
FOR ALL 
USING (is_master());