-- Correção imediata: Atualizar dados inconsistentes do cliente gasrok@swiftlist.io
-- Usuário ID: 458413c9-f505-43a5-9cf3-fea34fa2f0d8

UPDATE public.profiles 
SET 
  email = 'gasrok@swiftlist.io',
  nome = 'Fulinho da Silva',
  updated_at = now()
WHERE id = '458413c9-f505-43a5-9cf3-fea34fa2f0d8';

-- Log da correção para auditoria
INSERT INTO public.logs_acesso (user_id, acao)
VALUES (
  '458413c9-f505-43a5-9cf3-fea34fa2f0d8',
  'correcao_dados_inconsistentes: email atualizado de mifrit@tempmaila.pro para gasrok@swiftlist.io'
);

-- Verificar se existem outras inconsistências similares
-- Esta query identifica usuários com emails diferentes entre auth.users e profiles
-- (será executada apenas para consulta, não é uma alteração)