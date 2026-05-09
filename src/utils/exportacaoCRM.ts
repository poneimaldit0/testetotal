import * as XLSX from 'xlsx';
import { OrcamentoCRMComChecklist } from '@/types/crm';
import { ETAPAS_CRM, ETAPAS_ARQUIVADAS } from '@/constants/crmEtapas';
import { STATUS_CONTATO } from '@/constants/crmEtapas';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';

const obterLabelEtapa = (valor: string): string => {
  const todas = [...ETAPAS_CRM, ...ETAPAS_ARQUIVADAS];
  return todas.find(e => e.valor === valor)?.titulo || valor;
};

const obterLabelStatusContato = (valor?: string): string => {
  if (!valor) return '';
  return STATUS_CONTATO.find(s => s.valor === valor)?.label || valor;
};

export const exportarLeadsCRMExcel = async (orcamentos: OrcamentoCRMComChecklist[]) => {
  // Buscar tarefas pendentes de todos os leads
  const ids = orcamentos.map(o => o.id);
  let tarefasPorOrcamento: Record<string, { titulo: string; data_vencimento: string }[]> = {};

  if (ids.length > 0) {
    const { data: tarefas } = await supabase
      .from('crm_orcamentos_tarefas')
      .select('orcamento_id, titulo, data_vencimento')
      .eq('concluida', false)
      .in('orcamento_id', ids)
      .order('data_vencimento', { ascending: true });

    if (tarefas) {
      for (const t of tarefas) {
        if (!tarefasPorOrcamento[t.orcamento_id]) {
          tarefasPorOrcamento[t.orcamento_id] = [];
        }
        tarefasPorOrcamento[t.orcamento_id].push(t);
      }
    }
  }

  const cabecalhos = [
    'Código',
    'Nome do Lead',
    'Telefone',
    'Email',
    'Local',
    'Etapa CRM',
    'Status Contato',
    'Concierge',
    'Tarefas Pendentes',
    'Tarefas Atrasadas',
    'Tarefas Hoje',
    'Descrição Tarefas',
  ];

  const linhas = orcamentos.map(orc => {
    const pendentes = (orc.total_tarefas || 0) - (orc.tarefas_concluidas || 0);
    const tarefasLead = tarefasPorOrcamento[orc.id] || [];
    const descricaoTarefas = tarefasLead
      .map((t, i) => {
        const dataFormatada = format(parseISO(t.data_vencimento), 'dd/MM/yyyy');
        return `${i + 1}) ${t.titulo} (${dataFormatada})`;
      })
      .join('; ');

    return [
      orc.codigo_orcamento || '',
      orc.dados_contato?.nome || '',
      orc.dados_contato?.telefone || '',
      orc.dados_contato?.email || '',
      orc.local || '',
      obterLabelEtapa(orc.etapa_crm),
      obterLabelStatusContato(orc.status_contato),
      orc.concierge_nome || '',
      pendentes > 0 ? pendentes : 0,
      orc.tarefas_atrasadas || 0,
      orc.tarefas_hoje || 0,
      descricaoTarefas,
    ];
  });

  const dados = [cabecalhos, ...linhas];
  const ws = XLSX.utils.aoa_to_sheet(dados);

  ws['!cols'] = [
    { wch: 15 },
    { wch: 30 },
    { wch: 18 },
    { wch: 30 },
    { wch: 25 },
    { wch: 22 },
    { wch: 18 },
    { wch: 25 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 50 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads CRM');

  const dataAtual = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `leads-crm-${dataAtual}.xlsx`);
};
