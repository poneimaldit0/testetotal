-- Correção das datas dos lançamentos financeiros antigos
-- Identificar e corrigir contas criadas antes da correção implementada hoje

-- Corrigir contas a pagar com datas incorretas (criadas antes de hoje 01:46)
UPDATE public.contas_pagar 
SET 
  data_vencimento = data_vencimento + INTERVAL '4 days',
  updated_at = now()
WHERE 
  created_at < '2025-01-12 01:46:00+00:00'
  AND descricao = 'Homologação'
  AND EXTRACT(DAY FROM data_vencimento) = 16;

UPDATE public.contas_pagar 
SET 
  data_vencimento = data_vencimento + INTERVAL '8 days',
  updated_at = now()
WHERE 
  created_at < '2025-01-12 01:46:00+00:00'
  AND descricao = 'Homologação'
  AND EXTRACT(DAY FROM data_vencimento) = 12;

-- Corrigir contas a receber com datas incorretas (criadas antes de hoje 01:46)
UPDATE public.contas_receber 
SET 
  data_vencimento = data_vencimento + INTERVAL '4 days',
  updated_at = now()
WHERE 
  created_at < '2025-01-12 01:46:00+00:00'
  AND descricao = 'Homologação'
  AND EXTRACT(DAY FROM data_vencimento) = 16;

UPDATE public.contas_receber 
SET 
  data_vencimento = data_vencimento + INTERVAL '8 days',
  updated_at = now()
WHERE 
  created_at < '2025-01-12 01:46:00+00:00'
  AND descricao = 'Homologação'
  AND EXTRACT(DAY FROM data_vencimento) = 12;

-- Log das correções realizadas
INSERT INTO public.logs_acesso (user_id, acao) 
VALUES (NULL, 'correcao_datas_lancamentos_financeiros');

-- Comentário: Esta migração corrige as datas dos lançamentos antigos
-- mantendo as contas de tráfego pago inalteradas (que já estão corretas)