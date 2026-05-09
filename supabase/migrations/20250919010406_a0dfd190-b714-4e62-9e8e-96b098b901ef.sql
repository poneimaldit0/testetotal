-- Corrigir a situação diretamente no banco
-- Como o cliente está incorretamente associado ao fornecedor, vamos corrigi-lo

-- Primeiro, desassociar o cliente do fornecedor
UPDATE public.clientes 
SET auth_user_id = NULL,
    updated_at = now()
WHERE id = '0cc896cc-346f-445d-bf14-c81df30bb3cd' 
  AND email = 'financeiro@reforma100.com.br';

-- Log da correção
INSERT INTO public.logs_acesso (user_id, acao)
VALUES (
  '767d2cf9-7bb3-4bff-a0dd-960e35812e86', -- Admin user ID
  'CORREÇÃO URGENTE: Cliente Raphael Nardi desassociado do fornecedor Joao Eduardo para corrigir conflito de login'
);