-- Popular checklist de marcenaria com itens por etapa

-- Etapa 2: Abordagem Inicial
INSERT INTO crm_marcenaria_checklist_etapas (etapa_marcenaria, titulo, descricao, ordem, dias_para_alerta, permite_whatsapp, modelo_mensagem_key) VALUES
('abordagem_inicial', 'Enviar Mensagem 1', 'Apresentação da consultoria gratuita', 1, 1, true, 'mensagem_1'),
('abordagem_inicial', 'Enviar Mensagem 2', 'Follow-up leve (se não responder)', 2, 2, true, 'mensagem_2'),
('abordagem_inicial', 'Enviar Mensagem 3', 'Escassez e reforço de valor', 3, 3, true, 'mensagem_3'),
('abordagem_inicial', 'Registrar resposta do cliente', 'Marcar se houve resposta positiva', 4, 4, false, null);

-- Etapa 3: Qualificação & Briefing
INSERT INTO crm_marcenaria_checklist_etapas (etapa_marcenaria, titulo, descricao, ordem, dias_para_alerta, permite_whatsapp, modelo_mensagem_key) VALUES
('qualificacao_briefing', 'Perguntar ambientes a mobiliar', 'Cozinha, sala, quarto, etc', 1, 1, true, 'perguntar_ambientes'),
('qualificacao_briefing', 'Verificar se tem planta/medidas/fotos', 'Documentação do espaço', 2, 1, false, null),
('qualificacao_briefing', 'Identificar estilo preferido', 'Moderno, clássico, minimalista', 3, 1, false, null),
('qualificacao_briefing', 'Preencher briefing no CRM', 'Registrar todas as informações', 4, 2, false, null),
('qualificacao_briefing', 'Encaminhar para parceiro técnico', 'Enviar briefing completo', 5, 3, false, null);

-- Etapa 4: Desenvolvimento do Projeto
INSERT INTO crm_marcenaria_checklist_etapas (etapa_marcenaria, titulo, descricao, ordem, dias_para_alerta, permite_whatsapp, modelo_mensagem_key) VALUES
('desenvolvimento_projeto', 'Acompanhar status com parceiro', 'Verificar andamento do projeto', 1, 3, false, null),
('desenvolvimento_projeto', 'Verificar layout/render', 'Conferir se projeto está pronto', 2, 5, false, null),
('desenvolvimento_projeto', 'Validar estimativa de investimento', 'Revisar faixa de valor sugerida', 3, 5, false, null),
('desenvolvimento_projeto', 'Fazer upload do projeto no CRM', 'Anexar PDF/link do projeto', 4, 6, false, null);

-- Etapa 5: Apresentação do Projeto
INSERT INTO crm_marcenaria_checklist_etapas (etapa_marcenaria, titulo, descricao, ordem, dias_para_alerta, permite_whatsapp, modelo_mensagem_key) VALUES
('apresentacao_projeto', 'Enviar projeto ao cliente', 'Mensagem com link/PDF', 1, 1, true, 'enviar_projeto'),
('apresentacao_projeto', 'Confirmar recebimento', 'Cliente visualizou o projeto', 2, 2, false, null),
('apresentacao_projeto', 'Oferecer reunião de 15min', 'Agendar apresentação', 3, 2, true, 'agendar_reuniao'),
('apresentacao_projeto', 'Registrar data/hora agendada', 'Marcar no CRM', 4, 3, false, null);

-- Etapa 6: Reunião de Apresentação
INSERT INTO crm_marcenaria_checklist_etapas (etapa_marcenaria, titulo, descricao, ordem, dias_para_alerta, permite_whatsapp, modelo_mensagem_key) VALUES
('reuniao_apresentacao', 'Enviar lembrete 1 dia antes', 'Confirmar presença na reunião', 1, 0, true, 'lembrete_reuniao'),
('reuniao_apresentacao', 'Realizar reunião de apresentação', 'Apresentar conceito e materiais', 2, 1, false, null),
('reuniao_apresentacao', 'Tirar dúvidas do cliente', 'Responder questionamentos', 3, 1, false, null),
('reuniao_apresentacao', 'Enviar resumo pós-reunião', 'Reforçar pontos principais', 4, 1, true, 'resumo_reuniao'),
('reuniao_apresentacao', 'Registrar feedback inicial', 'Marcar interesse/objeções', 5, 2, false, null);

-- Etapa 7: Fechamento & Contrato
INSERT INTO crm_marcenaria_checklist_etapas (etapa_marcenaria, titulo, descricao, ordem, dias_para_alerta, permite_whatsapp, modelo_mensagem_key) VALUES
('fechamento_contrato', 'Negociar termos e valores', 'Ajustes de escopo/prazo', 1, 3, false, null),
('fechamento_contrato', 'Preparar proposta formal', 'Via ReformaCash ou contrato digital', 2, 3, false, null),
('fechamento_contrato', 'Enviar contrato para assinatura', 'Link de assinatura digital', 3, 5, true, 'enviar_contrato'),
('fechamento_contrato', 'Acompanhar status da assinatura', 'Verificar se cliente assinou', 4, 7, false, null),
('fechamento_contrato', 'Agendar visita técnica', 'Coleta de medidas in loco', 5, 7, true, 'agendar_visita');

-- Etapa 8: Pós-venda & Feedback
INSERT INTO crm_marcenaria_checklist_etapas (etapa_marcenaria, titulo, descricao, ordem, dias_para_alerta, permite_whatsapp, modelo_mensagem_key) VALUES
('pos_venda_feedback', 'Aguardar 30 dias após contratação', 'Prazo para execução do projeto', 1, 30, false, null),
('pos_venda_feedback', 'Enviar mensagem de acompanhamento', 'Perguntar sobre andamento', 2, 30, true, 'acompanhamento_obra'),
('pos_venda_feedback', 'Solicitar feedback sobre a consultoria', 'Avaliação da experiência', 3, 32, false, null),
('pos_venda_feedback', 'Registrar nível de satisfação', 'NPS ou escala de 1-10', 4, 35, false, null),
('pos_venda_feedback', 'Solicitar indicação se satisfeito', 'Pedir referência de outros clientes', 5, 35, true, 'solicitar_indicacao');