-- Atualizar função para relatório de funil de vendas detalhado por status individual
CREATE OR REPLACE FUNCTION public.relatorio_funil_vendas(
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS TABLE(
  etapa text,
  quantidade bigint,
  percentual_total numeric,
  taxa_conversao numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
WITH dados_status AS (
  SELECT 
    COALESCE(cf.status_acompanhamento, 'Sem Status') as status_individual,
    COUNT(*) as quantidade
  FROM public.candidaturas_fornecedores cf
  WHERE 
    (p_data_inicio IS NULL OR cf.data_candidatura::date >= p_data_inicio)
    AND (p_data_fim IS NULL OR cf.data_candidatura::date <= p_data_fim)
    AND public.is_admin()
  GROUP BY COALESCE(cf.status_acompanhamento, 'Sem Status')
),
total_candidaturas AS (
  SELECT SUM(quantidade) as total FROM dados_status
),
status_ordenados AS (
  SELECT 
    ds.status_individual as etapa,
    ds.quantidade,
    -- Ordem lógica do funil de vendas
    CASE ds.status_individual
      WHEN '1_contato_realizado' THEN 1
      WHEN '2_contato_realizado' THEN 2
      WHEN '3_contato_realizado' THEN 3
      WHEN '4_contato_realizado' THEN 4
      WHEN '5_contato_realizado' THEN 5
      WHEN 'cliente_respondeu_nao_agendou' THEN 6
      WHEN 'nao_respondeu_mensagens' THEN 7
      WHEN 'visita_agendada' THEN 8
      WHEN 'visita_realizada' THEN 9
      WHEN 'orcamento_enviado' THEN 10
      WHEN 'negocio_fechado' THEN 11
      WHEN 'negocio_perdido' THEN 12
      ELSE 13
    END as ordem
  FROM dados_status ds
  CROSS JOIN total_candidaturas
)
SELECT 
  so.etapa,
  so.quantidade,
  ROUND((so.quantidade * 100.0 / (SELECT total FROM total_candidaturas))::numeric, 2) as percentual_total,
  -- Taxa de conversão baseada no status anterior no funil
  CASE 
    WHEN LAG(so.quantidade) OVER (ORDER BY so.ordem) IS NULL THEN 100.00
    ELSE ROUND((so.quantidade * 100.0 / LAG(so.quantidade) OVER (ORDER BY so.ordem))::numeric, 2)
  END as taxa_conversao
FROM status_ordenados so
ORDER BY so.quantidade DESC; -- Ordenar por quantidade (maior para menor)
$function$;