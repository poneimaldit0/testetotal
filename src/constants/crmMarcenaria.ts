import { ConfiguracaoEtapaMarcenaria } from '@/types/crmMarcenaria';

export const ETAPAS_MARCENARIA: ConfiguracaoEtapaMarcenaria[] = [
  {
    valor: 'identificacao_automatica',
    titulo: '🔒 Identificação Automática',
    descricao: 'Aguardando D+7 para desbloqueio',
    cor: 'bg-slate-400',
    icone: '🔒',
    bloqueado: true
  },
  {
    valor: 'abordagem_inicial',
    titulo: '📩 Abordagem Inicial',
    descricao: 'Envio de mensagens (D+7, D+8, D+10)',
    cor: 'bg-blue-500',
    icone: '📩',
    bloqueado: false
  },
  {
    valor: 'qualificacao_briefing',
    titulo: '📋 Qualificação & Briefing',
    descricao: 'Coleta de informações do projeto',
    cor: 'bg-yellow-500',
    icone: '📋',
    bloqueado: false
  },
  {
    valor: 'desenvolvimento_projeto',
    titulo: '🛠️ Desenvolvimento do Projeto',
    descricao: 'Projeto em criação (3-5 dias)',
    cor: 'bg-orange-500',
    icone: '🛠️',
    bloqueado: false
  },
  {
    valor: 'apresentacao_projeto',
    titulo: '📤 Apresentação do Projeto',
    descricao: 'Projeto pronto para envio',
    cor: 'bg-purple-500',
    icone: '📤',
    bloqueado: false
  },
  {
    valor: 'reuniao_apresentacao',
    titulo: '🎥 Reunião de Apresentação',
    descricao: 'Explicação do projeto (15min)',
    cor: 'bg-pink-500',
    icone: '🎥',
    bloqueado: false
  },
  {
    valor: 'fechamento_contrato',
    titulo: '📝 Fechamento & Contrato',
    descricao: 'Negociação e formalização',
    cor: 'bg-red-500',
    icone: '📝',
    bloqueado: false
  },
  {
    valor: 'pos_venda_feedback',
    titulo: '💬 Pós-venda & Feedback',
    descricao: 'Coleta de satisfação (D+30)',
    cor: 'bg-gray-500',
    icone: '💬',
    bloqueado: false
  }
];

export const ETAPAS_MARCENARIA_ARQUIVADAS: ConfiguracaoEtapaMarcenaria[] = [
  {
    valor: 'ganho',
    titulo: '✅ Contratado',
    descricao: 'Marcenaria contratada com sucesso',
    cor: 'bg-green-600',
    icone: '🎉'
  },
  {
    valor: 'perdido',
    titulo: '❌ Perdido',
    descricao: 'Lead não converteu',
    cor: 'bg-red-600',
    icone: '❌'
  }
];

export const MODELOS_MENSAGEM_MARCENARIA = {
  mensagem_1: (nomeCliente: string, nomeConsultor: string) => `
Oi ${nomeCliente}, tudo bem? 😊
Aqui é ${nomeConsultor} da Consultoria de Marcenaria da Reforma100.

Acompanhamos sua reforma e vimos que esse é um ótimo momento pra começar a planejar os móveis sob medida do seu espaço.

Oferecemos uma consultoria gratuita, onde nossa equipe analisa o ambiente e desenvolve um projeto completo de marcenaria, com soluções inteligentes adaptadas ao seu estilo e orçamento.

Quer que eu te mostre como funciona?
  `.trim(),
  
  mensagem_2: (nomeCliente: string) => `
Oi ${nomeCliente}, tudo bem?

Só lembrando: nossa consultoria gratuita de marcenaria ajuda você a planejar seus móveis antes da obra avançar — é uma forma de evitar retrabalho e já prever investimentos com segurança.

Posso te mostrar um exemplo de como funciona?
  `.trim(),
  
  mensagem_3: (nomeCliente: string) => `
Oi ${nomeCliente}! 👋

Estamos finalizando a agenda dessa semana das consultorias gratuitas.

Quer que eu reserve um horário pra te explicar como funciona e ver se faz sentido pro seu projeto?
  `.trim(),
  
  perguntar_ambientes: (nomeCliente: string, nomeConsultor: string) => `
Perfeito, ${nomeCliente}! 🙌

Pra nossa equipe montar o projeto certinho, me conta rapidinho:

1️⃣ Quais ambientes você pretende mobiliar?
2️⃣ Já tem planta, medidas ou fotos?
3️⃣ Gosta de um estilo mais moderno, clássico ou minimalista?
  `.trim(),
  
  enviar_projeto: (nomeCliente: string) => `
${nomeCliente}, finalizamos o seu projeto gratuito de marcenaria 👇

Ele traz sugestões de layout, acabamentos e uma estimativa de investimento pra você ter clareza sobre as possibilidades do seu espaço.

Posso te mostrar agora?
  `.trim(),
  
  agendar_reuniao: (nomeCliente: string) => `
Oi ${nomeCliente}! 

Vou reservar 15 minutos na agenda pra te apresentar o projeto e tirar todas as suas dúvidas.

Quando seria melhor pra você: manhã ou tarde?
  `.trim(),
  
  lembrete_reuniao: (nomeCliente: string) => `
Oi ${nomeCliente}! 

Só lembrando que nossa reunião está confirmada para hoje.

Te espero! 😊
  `.trim(),
  
  resumo_reuniao: (nomeCliente: string) => `
Oi ${nomeCliente}!

Foi um prazer te apresentar o projeto hoje! 

Envio aqui um resumo do que conversamos: [inserir principais pontos]

Fico à disposição pra qualquer dúvida! 
  `.trim(),
  
  enviar_contrato: (nomeCliente: string) => `
Oi ${nomeCliente}!

Segue o link do contrato digital pra você assinar: [inserir link]

Qualquer dúvida, é só chamar!
  `.trim(),
  
  agendar_visita: (nomeCliente: string) => `
Oi ${nomeCliente}!

Vamos agendar a visita técnica pra coleta de medidas?

Quando seria melhor pra você?
  `.trim(),
  
  acompanhamento_obra: (nomeCliente: string) => `
Oi ${nomeCliente}, tudo bem?

Queria saber como está o andamento da sua marcenaria!

Ficou satisfeito com o resultado?
  `.trim(),
  
  solicitar_indicacao: (nomeCliente: string) => `
Oi ${nomeCliente}!

Que bom que ficou satisfeito! 😊

Conhece alguém que também está reformando e poderia se interessar pela nossa consultoria de marcenaria?
  `.trim()
};

export const isEtapaArquivada = (etapa: string): boolean => {
  return etapa === 'ganho' || etapa === 'perdido';
};
