-- Função auxiliar: Calcular gatilhos ativos baseado em inatividade, orçamentos abertos e marcos temporais
CREATE OR REPLACE FUNCTION calcular_gatilhos_ativos(
  dias_inativo integer,
  orc_abertos bigint,
  dias_plataforma integer
) RETURNS jsonb AS $$
DECLARE
  gatilhos jsonb := '[]'::jsonb;
BEGIN
  -- Gatilhos de inatividade
  IF dias_inativo >= 30 THEN 
    gatilhos := gatilhos || '{"tipo": "inatividade", "valor": 30}'::jsonb; 
  ELSIF dias_inativo >= 20 THEN 
    gatilhos := gatilhos || '{"tipo": "inatividade", "valor": 20}'::jsonb; 
  ELSIF dias_inativo >= 10 THEN 
    gatilhos := gatilhos || '{"tipo": "inatividade", "valor": 10}'::jsonb; 
  ELSIF dias_inativo >= 5 THEN 
    gatilhos := gatilhos || '{"tipo": "inatividade", "valor": 5}'::jsonb; 
  END IF;
  
  -- Gatilhos de orçamentos abertos
  IF orc_abertos >= 50 THEN 
    gatilhos := gatilhos || '{"tipo": "orcamentos_abertos", "valor": 50}'::jsonb; 
  ELSIF orc_abertos >= 40 THEN 
    gatilhos := gatilhos || '{"tipo": "orcamentos_abertos", "valor": 40}'::jsonb; 
  ELSIF orc_abertos >= 30 THEN 
    gatilhos := gatilhos || '{"tipo": "orcamentos_abertos", "valor": 30}'::jsonb; 
  ELSIF orc_abertos >= 15 THEN 
    gatilhos := gatilhos || '{"tipo": "orcamentos_abertos", "valor": 15}'::jsonb; 
  ELSIF orc_abertos >= 7 THEN 
    gatilhos := gatilhos || '{"tipo": "orcamentos_abertos", "valor": 7}'::jsonb; 
  ELSIF orc_abertos >= 5 THEN 
    gatilhos := gatilhos || '{"tipo": "orcamentos_abertos", "valor": 5}'::jsonb; 
  END IF;
  
  -- Gatilhos de marcos temporais
  IF dias_plataforma IN (1,2,3,4,5,10,20,30,45,60,75,90) THEN 
    gatilhos := gatilhos || jsonb_build_object('tipo', 'marco_temporal', 'valor', dias_plataforma); 
  END IF;
  
  RETURN gatilhos;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função auxiliar: Calcular prioridade baseada em múltiplos fatores
CREATE OR REPLACE FUNCTION calcular_prioridade(
  dias_inativo integer,
  orc_abertos bigint,
  dias_plataforma integer,
  status_contrato text
) RETURNS integer AS $$
DECLARE
  prioridade integer := 0;
BEGIN
  -- Inatividade (máx 40 pontos)
  IF dias_inativo >= 30 THEN 
    prioridade := prioridade + 40;
  ELSIF dias_inativo >= 20 THEN 
    prioridade := prioridade + 30;
  ELSIF dias_inativo >= 10 THEN 
    prioridade := prioridade + 20;
  ELSIF dias_inativo >= 5 THEN 
    prioridade := prioridade + 10;
  END IF;
  
  -- Orçamentos abertos (máx 40 pontos)
  IF orc_abertos >= 50 THEN 
    prioridade := prioridade + 40;
  ELSIF orc_abertos >= 30 THEN 
    prioridade := prioridade + 35;
  ELSIF orc_abertos >= 15 THEN 
    prioridade := prioridade + 25;
  ELSIF orc_abertos >= 7 THEN 
    prioridade := prioridade + 15;
  ELSIF orc_abertos >= 5 THEN 
    prioridade := prioridade + 10;
  END IF;
  
  -- Marcos temporais importantes (máx 15 pontos)
  IF dias_plataforma IN (30, 75, 90) THEN 
    prioridade := prioridade + 15;
  ELSIF dias_plataforma IN (1, 5, 10, 45, 60) THEN 
    prioridade := prioridade + 5;
  END IF;
  
  -- Contrato (máx 5 pontos)
  IF status_contrato = 'vencendo' THEN 
    prioridade := prioridade + 5;
  ELSIF status_contrato = 'vencido' THEN 
    prioridade := prioridade + 3;
  END IF;
  
  RETURN prioridade;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função auxiliar: Definir ação sugerida baseada nos gatilhos
CREATE OR REPLACE FUNCTION definir_acao_sugerida(
  dias_inativo integer,
  orc_abertos bigint,
  dias_plataforma integer,
  nome_fornecedor text
) RETURNS jsonb AS $$
DECLARE
  acao jsonb;
  tipo text;
  titulo text;
  template text;
  link_reuniao text := null;
BEGIN
  -- CRÍTICOS - Prioridade máxima
  IF dias_inativo >= 30 THEN
    tipo := 'reuniao_presencial';
    titulo := '30+ dias inativo - Reunião Presencial';
    template := 'Oi ' || nome_fornecedor || ', tudo bem?

Notei que você está há 30 dias sem acessar a plataforma 😕.

Gostaria de marcar uma reunião para entender o que aconteceu e como podemos melhorar sua experiência com os clientes. Pode me dizer qual horário funciona melhor para você?

**Assunto da reunião:** Revisão de Engajamento e Atividade na Plataforma';
    link_reuniao := 'https://www.notion.so/Revis-o-de-Engajamento-e-Atividade-na-Plataforma-295ed5be158f8031a389d497b896c3ff';
    
  ELSIF orc_abertos >= 50 THEN
    tipo := 'reuniao_presencial';
    titulo := '50+ orçamentos abertos - Reunião Estratégica';
    template := 'Oi ' || nome_fornecedor || ', tudo bem?

Você atingiu a marca de 50 orçamentos abertos 🎉

Queremos te convidar para uma reunião presencial estratégica, onde vamos revisar resultados, comportamento dos leads e próximos passos para escalar sua operação.

**Assunto da reunião:** Revisão de Performance e Planejamento de Expansão';
    link_reuniao := 'https://www.notion.so/Revis-o-de-Performance-e-Planejamento-de-Expans-o-295ed5be158f801c8845c79630e5304a';
    
  -- ATENÇÃO - Segunda prioridade
  ELSIF dias_inativo >= 20 THEN
    tipo := 'mensagem';
    titulo := '20 dias inativo - Agendar Conversa';
    template := 'Oi ' || nome_fornecedor || ', tudo bem?

Faz um tempinho que você não acessa a plataforma e quero entender se aconteceu algo ou se podemos ajustar algo juntos.

Podemos marcar uma conversa rápida para revisar sua operação e garantir que você continue recebendo boas oportunidades?

**Assunto da reunião (caso aceite):** Revisão de Engajamento e Atividade na Plataforma';
    link_reuniao := 'https://www.notion.so/Revis-o-de-Engajamento-e-Atividade-na-Plataforma-295ed5be158f8066bec4d25ed51fa9dd';
    
  ELSIF orc_abertos >= 40 THEN
    tipo := 'reuniao_online';
    titulo := '40 orçamentos abertos - Ajustar Estratégia';
    template := 'Oi ' || nome_fornecedor || ', tudo bem?

Chegamos a 40 orçamentos abertos — um ótimo sinal de demanda!

Vamos revisar juntos seus indicadores e ajustar os pontos que possam estar reduzindo o índice de fechamento?

**Assunto da reunião:** Ajuste de Estratégia Comercial e Qualidade das Propostas';
    link_reuniao := 'https://www.notion.so/Ajuste-de-Estrat-gia-Comercial-e-Qualidade-das-Propostas-295ed5be158f804ea6bfdc0fdf0e6624';
    
  ELSIF orc_abertos >= 30 THEN
    tipo := 'reuniao_presencial';
    titulo := '30 orçamentos abertos - Mentoria de Conversão';
    template := 'Oi ' || nome_fornecedor || ', tudo bem?

Você está com 30 orçamentos abertos, e isso mostra um ótimo potencial.

Vamos marcar uma reunião presencial para analisar o perfil dos clientes e alinhar estratégias práticas para converter mais negócios?

**Assunto da reunião:** Mentoria de Conversão e Análise de Perfil dos Clientes';
    link_reuniao := 'https://www.notion.so/Mentoria-de-Convers-o-e-An-lise-de-Perfil-dos-Clientes-295ed5be158f808b86d2f8a8c4b3f86d';
    
  ELSIF orc_abertos >= 15 THEN
    tipo := 'reuniao_online';
    titulo := '15 orçamentos abertos - Diagnóstico de Gargalos';
    template := 'Oi ' || nome_fornecedor || ', tudo bem?

Você já abriu 15 orçamentos e queremos te ajudar a entender o que pode estar impedindo os fechamentos.

Podemos agendar uma conversa online de 20 minutos para revisar o funil de oportunidades?

**Assunto da reunião:** Diagnóstico de Gargalos no Processo Comercial';
    link_reuniao := 'https://www.notion.so/Diagn-stico-de-Gargalos-no-Processo-Comercial-295ed5be158f8025ac34d4152963b1d9';
    
  ELSIF dias_inativo >= 10 THEN
    tipo := 'mensagem';
    titulo := '10 dias inativo - Oferecer Ajuda';
    template := 'Oi ' || nome_fornecedor || ', tudo bem?

Vi que você ainda não voltou a acessar a plataforma. Às vezes uma simples dúvida pode travar o uso — quer que eu te mostre alguma função específica ou te ajude a revisar sua estratégia de contato com clientes?';
    
  ELSIF orc_abertos >= 7 THEN
    tipo := 'reuniao_presencial';
    titulo := '7 orçamentos abertos - Estratégias de Fechamento';
    template := 'Oi ' || nome_fornecedor || ', tudo bem?

Você já abriu 7 orçamentos, parabéns pelo volume! 🎯

Queremos entender mais de perto como estão as negociações e pensar juntos em estratégias para aumentar sua taxa de fechamento.

Que tal marcarmos uma reunião presencial para conversarmos sobre isso?

**Assunto da reunião:** Análise de Conversão e Estratégias de Fechamento';
    link_reuniao := 'https://www.notion.so/An-lise-de-Convers-o-e-Estrat-gias-de-Fechamento-295ed5be158f809fb232ece8b084631c';
    
  -- MARCOS TEMPORAIS
  ELSIF dias_plataforma = 90 THEN
    tipo := 'mensagem';
    titulo := '90 dias - 3 meses na plataforma';
    template := 'Oi ' || nome_fornecedor || ', tudo bem?

Você completou 3 meses na plataforma! 🎯

Queremos te agradecer pela parceria e te convidar para continuar crescendo conosco.

Tem algo que você gostaria de sugerir ou ajustar na experiência?';
    
  ELSIF dias_plataforma = 75 THEN
    tipo := 'reuniao_presencial';
    titulo := '75 dias - Plano de Aceleração';
    template := 'Oi ' || nome_fornecedor || ', tudo certo?

Você está há 75 dias com a gente — ótimo!

Quero marcar uma reunião para revisarmos resultados e traçar um plano para os próximos meses. Pode me confirmar sua disponibilidade?

**Assunto da reunião:** Plano de Aceleração e Consolidação de Resultados';
    
  ELSIF dias_plataforma = 60 THEN
    tipo := 'mensagem';
    titulo := '60 dias - Feedback';
    template := 'Oi ' || nome_fornecedor || ', tudo bem?

Faltam poucos dias para você completar 2 meses na plataforma!

Que tal me contar o que está funcionando bem e o que ainda podemos melhorar juntos?';
    
  ELSIF dias_plataforma = 45 THEN
    tipo := 'mensagem';
    titulo := '45 dias - Coleta de Feedback';
    template := 'Oi ' || nome_fornecedor || ', tudo certo?

Chegando aos 45 dias na plataforma — como tem sido a experiência até agora?

Estamos ajustando o sistema com base no feedback dos fornecedores e sua opinião é super importante pra gente.';
    
  ELSIF dias_plataforma = 30 THEN
    tipo := 'reuniao_online';
    titulo := '30 dias - Primeira Revisão';
    template := 'Oi ' || nome_fornecedor || ', tudo bem?

Você completou 30 dias na plataforma 🎉

Vamos marcar uma reunião rápida para revisar seus resultados, oportunidades abertas e próximos passos?

**Assunto da reunião:** Revisão de Primeiros Resultados e Estratégias de Crescimento';
    link_reuniao := 'https://www.notion.so/Revis-o-de-Primeiros-Resultados-e-Estrat-gias-de-Crescimento-295ed5be158f805b96ecd93b63dec28b';
    
  ELSIF dias_plataforma = 20 THEN
    tipo := 'mensagem';
    titulo := '20 dias - Verificação de Clareza';
    template := 'Oi ' || nome_fornecedor || ', tudo certo?

Vi que você já está com 20 dias de uso.

Está tudo claro sobre as etapas de orçamentos e propostas? Se quiser, posso te mandar um passo a passo ou fazer uma call rápida.';
    
  ELSIF dias_plataforma = 10 THEN
    tipo := 'mensagem';
    titulo := '10 dias - Balanço Rápido';
    template := 'Oi ' || nome_fornecedor || ', tudo bem?

Você está completando 10 dias com a gente 👏

Que tal fazermos um balanço rápido? Quero te ajudar a aproveitar melhor o sistema e gerar mais resultados.';
    
  ELSIF dias_plataforma = 5 THEN
    tipo := 'mensagem';
    titulo := '5 dias - Primeiros Resultados';
    template := 'Oi ' || nome_fornecedor || ', tudo bem?

Parabéns pelos primeiros dias na plataforma! 🎉

Me conta, já conseguiu fazer alguma visita ou enviar proposta? Estamos acompanhando seu progresso!';
    
  ELSIF dias_plataforma = 4 THEN
    tipo := 'mensagem';
    titulo := '4 dias - Velocidade de Resposta';
    template := 'Oi ' || nome_fornecedor || ', tudo bem?

Já fez contato com algum cliente?

Lembrando que quanto mais rápido você responde após a liberação dos dados, maior a chance de conversão. Quer ajuda para montar uma mensagem de abordagem?';
    
  ELSIF dias_plataforma = 3 THEN
    tipo := 'mensagem';
    titulo := '3 dias - Perfil de Cliente';
    template := 'Oi ' || nome_fornecedor || ', tudo bem?

Já conseguiu visualizar algum cliente que se encaixa no seu perfil?

Se quiser, posso te ajudar a entender qual tipo de cliente costuma ter melhor resultado na plataforma.';
    
  ELSIF dias_plataforma = 2 THEN
    tipo := 'mensagem';
    titulo := '2 dias - Exploração do Painel';
    template := 'Oi ' || nome_fornecedor || ', tudo certo?

Você já conseguiu explorar o painel de orçamentos?

Temos algumas dicas rápidas para aumentar suas chances de fechamento — quer que eu te envie?';
    
  ELSIF dias_plataforma = 1 THEN
    tipo := 'mensagem';
    titulo := '1 dia - Boas-vindas';
    template := 'Oi ' || nome_fornecedor || ', tudo bem?

Bem-vindo oficialmente à plataforma! 🚀

Se precisar de ajuda para entender como funciona a liberação de clientes ou o envio de propostas, me avise por aqui.';
    
  ELSIF dias_inativo >= 5 THEN
    tipo := 'mensagem';
    titulo := '5 dias inativo - Check-in Inicial';
    template := 'Oi ' || nome_fornecedor || ', tudo bem?

Notamos que você está há alguns dias sem acessar a plataforma. Está tudo certo por aí?';
    
  ELSIF orc_abertos >= 5 THEN
    tipo := 'mensagem';
    titulo := '5 orçamentos abertos - Experiência Inicial';
    template := 'Oi ' || nome_fornecedor || ', tudo bem?

Vi que você já abriu 5 orçamentos na plataforma! 😊

Como está sendo sua experiência até agora com os clientes? Tem algo que possamos ajustar para te ajudar a converter mais propostas?';
    
  ELSE
    tipo := 'mensagem';
    titulo := 'Fornecedor saudável';
    template := 'Fornecedor engajado e sem gatilhos ativos no momento.';
  END IF;
  
  acao := jsonb_build_object(
    'tipo', tipo,
    'titulo', titulo,
    'template', template,
    'link_reuniao', link_reuniao
  );
  
  RETURN acao;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função principal: Relatório de experiência do fornecedor
CREATE OR REPLACE FUNCTION relatorio_experiencia_fornecedor()
RETURNS TABLE (
  id uuid,
  nome text,
  empresa text,
  email text,
  telefone text,
  data_cadastro timestamptz,
  dias_plataforma integer,
  ultimo_acesso timestamptz,
  dias_inativo integer,
  total_inscricoes bigint,
  orcamentos_abertos bigint,
  propostas_enviadas bigint,
  taxa_conversao numeric,
  data_termino_contrato date,
  dias_restantes_contrato integer,
  status_contrato text,
  nivel_alerta text,
  gatilhos_ativos jsonb,
  acao_sugerida jsonb,
  prioridade integer
) AS $$
BEGIN
  RETURN QUERY
  WITH dados_fornecedor AS (
    SELECT 
      p.id,
      p.nome,
      p.empresa,
      p.email,
      p.telefone,
      p.created_at as data_cadastro,
      EXTRACT(DAY FROM NOW() - p.created_at)::integer as dias_plataforma,
      
      -- Último acesso
      (SELECT MAX(data_acesso) FROM logs_acesso WHERE user_id = p.id) as ultimo_acesso,
      COALESCE(
        EXTRACT(DAY FROM NOW() - (SELECT MAX(data_acesso) FROM logs_acesso WHERE user_id = p.id))::integer,
        999
      ) as dias_inativo,
      
      -- Inscrições e propostas
      (SELECT COUNT(*) FROM candidaturas_fornecedores WHERE fornecedor_id = p.id) as total_inscricoes,
      (SELECT COUNT(*) 
       FROM candidaturas_fornecedores 
       WHERE fornecedor_id = p.id 
       AND proposta_enviada = false 
       AND data_desistencia IS NULL) as orcamentos_abertos,
      (SELECT COUNT(*) 
       FROM candidaturas_fornecedores 
       WHERE fornecedor_id = p.id 
       AND proposta_enviada = true) as propostas_enviadas,
      
      -- Contrato
      p.data_termino_contrato,
      CASE 
        WHEN p.data_termino_contrato IS NULL THEN NULL
        ELSE (p.data_termino_contrato - CURRENT_DATE)::integer
      END as dias_restantes_contrato
      
    FROM profiles p
    WHERE p.tipo_usuario = 'fornecedor'
    AND p.status = 'ativo'
  ),
  fornecedor_com_metricas AS (
    SELECT 
      *,
      CASE 
        WHEN total_inscricoes > 0 
        THEN ROUND((propostas_enviadas::numeric / total_inscricoes::numeric) * 100, 1)
        ELSE 0
      END as taxa_conversao,
      
      CASE
        WHEN dias_restantes_contrato IS NULL THEN 'sem_prazo'
        WHEN dias_restantes_contrato < 0 THEN 'vencido'
        WHEN dias_restantes_contrato <= 30 THEN 'vencendo'
        ELSE 'ativo'
      END as status_contrato
    FROM dados_fornecedor
  )
  SELECT 
    f.id,
    f.nome,
    f.empresa,
    f.email,
    f.telefone,
    f.data_cadastro,
    f.dias_plataforma,
    f.ultimo_acesso,
    f.dias_inativo,
    f.total_inscricoes,
    f.orcamentos_abertos,
    f.propostas_enviadas,
    f.taxa_conversao,
    f.data_termino_contrato,
    f.dias_restantes_contrato,
    f.status_contrato,
    
    -- Calcular nível de alerta
    CASE
      WHEN (f.dias_inativo >= 30 AND f.orcamentos_abertos >= 30) OR f.orcamentos_abertos >= 50 THEN 'critico'
      WHEN f.dias_inativo >= 20 OR f.orcamentos_abertos >= 15 OR f.dias_plataforma IN (30, 75) THEN 'atencao'
      WHEN f.dias_inativo >= 5 OR f.orcamentos_abertos >= 5 OR f.dias_plataforma IN (1,2,3,4,5,10,20,45,60,90) THEN 'marco'
      ELSE 'ok'
    END as nivel_alerta,
    
    -- Gatilhos ativos
    calcular_gatilhos_ativos(f.dias_inativo, f.orcamentos_abertos, f.dias_plataforma) as gatilhos_ativos,
    
    -- Ação sugerida
    definir_acao_sugerida(f.dias_inativo, f.orcamentos_abertos, f.dias_plataforma, f.nome) as acao_sugerida,
    
    -- Prioridade
    calcular_prioridade(f.dias_inativo, f.orcamentos_abertos, f.dias_plataforma, f.status_contrato) as prioridade
    
  FROM fornecedor_com_metricas f
  ORDER BY prioridade DESC, dias_inativo DESC, orcamentos_abertos DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;