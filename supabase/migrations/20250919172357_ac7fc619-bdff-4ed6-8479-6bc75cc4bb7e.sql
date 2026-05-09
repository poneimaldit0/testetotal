-- Corrigir status inconsistentes na tabela contratos
UPDATE contratos 
SET status_assinatura = 'aguardando_assinatura' 
WHERE status_assinatura IN ('aguardando_emissao', 'aguardando');

-- Garantir que todos os registros tenham um status válido
UPDATE contratos 
SET status_assinatura = 'aguardando_assinatura' 
WHERE status_assinatura IS NULL OR status_assinatura NOT IN ('aguardando_assinatura', 'assinado');