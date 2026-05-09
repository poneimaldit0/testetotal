-- Criar função para relatório de funil de vendas
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
WITH dados_funil AS (
  SELECT 
    CASE 
      WHEN cf.status_acompanhamento IN ('primeiro_contato_realizado', 'segundo_contato_realizado', 'terceiro_contato_realizado', 'quarto_contato_realizado', 'quinto_contato_realizado') THEN 'Contatos Iniciais'
      WHEN cf.status_acompanhamento IN ('cliente_respondeu', 'cliente_nao_respondeu') THEN 'Resposta do Cliente'
      WHEN cf.status_acompanhamento IN ('visita_agendada', 'visita_realizada') THEN 'Visitas'
      WHEN cf.status_acompanhamento = 'orcamento_enviado' THEN 'Proposta Enviada'
      WHEN cf.status_acompanhamento IN ('negocio_fechado', 'negocio_perdido') THEN 'Finalização'
      ELSE 'Sem Status'
    END as etapa_funil,
    COUNT(*) as quantidade
  FROM public.candidaturas_fornecedores cf
  WHERE 
    (p_data_inicio IS NULL OR cf.data_candidatura::date >= p_data_inicio)
    AND (p_data_fim IS NULL OR cf.data_candidatura::date <= p_data_fim)
    AND public.is_admin()
  GROUP BY 
    CASE 
      WHEN cf.status_acompanhamento IN ('primeiro_contato_realizado', 'segundo_contato_realizado', 'terceiro_contato_realizado', 'quarto_contato_realizado', 'quinto_contato_realizado') THEN 'Contatos Iniciais'
      WHEN cf.status_acompanhamento IN ('cliente_respondeu', 'cliente_nao_respondeu') THEN 'Resposta do Cliente'
      WHEN cf.status_acompanhamento IN ('visita_agendada', 'visita_realizada') THEN 'Visitas'
      WHEN cf.status_acompanhamento = 'orcamento_enviado' THEN 'Proposta Enviada'
      WHEN cf.status_acompanhamento IN ('negocio_fechado', 'negocio_perdido') THEN 'Finalização'
      ELSE 'Sem Status'
    END
),
total_candidaturas AS (
  SELECT SUM(quantidade) as total FROM dados_funil
),
etapas_ordenadas AS (
  SELECT 
    etapa_funil as etapa,
    quantidade,
    ROW_NUMBER() OVER (ORDER BY 
      CASE etapa_funil
        WHEN 'Contatos Iniciais' THEN 1
        WHEN 'Resposta do Cliente' THEN 2
        WHEN 'Visitas' THEN 3
        WHEN 'Proposta Enviada' THEN 4
        WHEN 'Finalização' THEN 5
        ELSE 6
      END
    ) as ordem
  FROM dados_funil
  CROSS JOIN total_candidaturas
)
SELECT 
  eo.etapa,
  eo.quantidade,
  ROUND((eo.quantidade * 100.0 / (SELECT total FROM total_candidaturas))::numeric, 2) as percentual_total,
  CASE 
    WHEN LAG(eo.quantidade) OVER (ORDER BY eo.ordem) IS NULL THEN 100.00
    ELSE ROUND((eo.quantidade * 100.0 / LAG(eo.quantidade) OVER (ORDER BY eo.ordem))::numeric, 2)
  END as taxa_conversao
FROM etapas_ordenadas eo
ORDER BY eo.ordem;
$function$;