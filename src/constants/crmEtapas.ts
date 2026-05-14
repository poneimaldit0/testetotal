import { ConfiguracaoEtapa } from '@/types/crm';

export const ETAPAS_CRM: ConfiguracaoEtapa[] = [
  {
    valor: 'orcamento_postado',
    titulo: 'Orçamento Postado',
    descricao: 'Orçamento criado e publicado pelo SDR',
    cor: 'bg-blue-500',
    icone: '🟦'
  },
  {
    valor: 'contato_agendamento',
    titulo: 'Contato / Agendamento',
    descricao: 'Fornecedor fez contato e marcou visita',
    cor: 'bg-yellow-500',
    icone: '🟨'
  },
  {
    valor: 'em_orcamento',
    titulo: 'Agendar compatibilização',
    descricao: 'Propostas recebidas; agendar apresentação ao cliente',
    cor: 'bg-orange-500',
    icone: '🟧'
  },
  // propostas_enviadas mantém ID interno mas no Kanban operacional é fundido
  // visualmente em "Agendar compatibilização" (mesma coluna). Label aqui é
  // usado em telas auxiliares (checklist config, BarraAcoesMassa, etc.).
  {
    valor: 'propostas_enviadas',
    titulo: 'Agendar compatibilização',
    descricao: 'Propostas recebidas aguardando agendamento da compatibilização',
    cor: 'bg-orange-500',
    icone: '🟧'
  },
  {
    valor: 'compatibilizacao',
    titulo: 'Compatibilização realizada',
    descricao: 'Compatibilização concluída — Reforma100 conduzindo',
    cor: 'bg-amber-700',
    icone: '🟫'
  },
  {
    valor: 'fechamento_contrato',
    titulo: 'Grupo criado',
    descricao: 'Cliente escolheu fornecedor — grupo operacional formado',
    cor: 'bg-red-500',
    icone: '🟥'
  },
  // pos_venda_feedback reaproveitado como "Contrato" (decisão da nova esteira)
  {
    valor: 'pos_venda_feedback',
    titulo: 'Contrato',
    descricao: 'Contrato assinado e em execução',
    cor: 'bg-gray-500',
    icone: '⚫'
  }
];

export const ETAPAS_ARQUIVADAS: ConfiguracaoEtapa[] = [
  {
    valor: 'ganho',
    titulo: '✅ Ganho',
    descricao: 'Orçamento fechado com sucesso',
    cor: 'bg-green-600',
    icone: '🎉'
  },
  {
    valor: 'perdido',
    titulo: '❌ Perdido',
    descricao: 'Orçamento não fechado',
    cor: 'bg-red-600',
    icone: '❌'
  }
];

export const isEtapaArquivada = (etapa: string): boolean => {
  return etapa === 'ganho' || etapa === 'perdido';
};

export const STATUS_CONTATO = [
  { valor: 'sem_contato', label: 'Sem contato' },
  { valor: 'em_contato', label: 'Em contato' },
  { valor: 'visita_agendada', label: 'Visita agendada' },
  { valor: 'visita_realizada', label: 'Visita realizada' }
];
