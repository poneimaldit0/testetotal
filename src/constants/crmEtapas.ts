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
    titulo: 'Em Orçamento',
    descricao: 'Fornecedores elaborando propostas',
    cor: 'bg-orange-500',
    icone: '🟧'
  },
  {
    valor: 'propostas_enviadas',
    titulo: 'Propostas Enviadas',
    descricao: 'Propostas recebidas aguardando análise',
    cor: 'bg-purple-500',
    icone: '🟪'
  },
  {
    valor: 'compatibilizacao',
    titulo: 'Compatibilização',
    descricao: 'Cliente analisando comparativo',
    cor: 'bg-amber-700',
    icone: '🟫'
  },
  {
    valor: 'fechamento_contrato',
    titulo: 'Fechamento / Contrato',
    descricao: 'Cliente escolheu fornecedor',
    cor: 'bg-red-500',
    icone: '🟥'
  },
  {
    valor: 'pos_venda_feedback',
    titulo: 'Pós-venda / Feedback',
    descricao: 'Coleta de satisfação e reputação',
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
