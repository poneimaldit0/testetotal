
-- Remover a constraint existente que está limitando os valores de status
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;

-- Criar nova constraint que inclui 'pendente_aprovacao' além dos valores existentes
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check 
CHECK (status IN ('ativo', 'inativo', 'suspenso', 'pendente_aprovacao'));
