import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseISO } from 'date-fns';

export interface AtividadeDetalhada {
  id: string;
  tipo: 'orcamentos' | 'marcenaria';
  tipoAtividade: 'checklist' | 'tarefa';
  itemTitulo: string;
  clienteNome: string;
  codigo: string;
  etapa: string;
  dataConclusao: string;
  observacao?: string;
}

export const useDetalhesAtividadesConcierge = (
  usuarioId: string | null, 
  dataInicio: string,
  dataFim: string,
  tipoCrm?: 'orcamentos' | 'marcenaria'
) => {
  return useQuery({
    queryKey: ['detalhes-atividades-concierge', usuarioId, dataInicio, dataFim, tipoCrm],
    queryFn: async () => {
      if (!usuarioId) return [];

      const dataInicioISO = `${dataInicio}T00:00:00`;
      const dataFimISO = `${dataFim}T23:59:59`;
      const atividades: AtividadeDetalhada[] = [];

      // Buscar atividades de CRM Orçamentos
      if (!tipoCrm || tipoCrm === 'orcamentos') {
        // 1. Buscar progresso de checklist
        const { data: progressoOrc, error: errorOrc } = await supabase
          .from('crm_checklist_progresso')
          .select('id, data_conclusao, observacao, item_checklist_id, orcamento_id')
          .eq('concluido', true)
          .eq('concluido_por_id', usuarioId)
          .gte('data_conclusao', dataInicioISO)
          .lte('data_conclusao', dataFimISO)
          .order('data_conclusao', { ascending: false });

        if (errorOrc) throw errorOrc;

        if (progressoOrc && progressoOrc.length > 0) {
          // 2. Buscar dados dos itens de checklist
          const itemIds = progressoOrc.map(p => p.item_checklist_id);
          const { data: itensChecklist } = await supabase
            .from('crm_checklist_etapas')
            .select('id, titulo, etapa_crm')
            .in('id', itemIds);

          // 3. Buscar dados dos orçamentos
          const orcamentoIds = progressoOrc.map(p => p.orcamento_id);
          const { data: orcamentos } = await supabase
            .from('orcamentos')
            .select('id, codigo_orcamento, dados_contato')
            .in('id', orcamentoIds);

          // 4. Criar mapas para lookup rápido
          const itensMap = new Map(itensChecklist?.map(i => [i.id, i]) || []);
          const orcamentosMap = new Map(orcamentos?.map(o => [o.id, o]) || []);

          // 5. Montar as atividades
          progressoOrc.forEach(item => {
            const checklistItem = itensMap.get(item.item_checklist_id);
            const orcamento = orcamentosMap.get(item.orcamento_id);

            atividades.push({
              id: item.id,
              tipo: 'orcamentos',
              tipoAtividade: 'checklist',
              itemTitulo: checklistItem?.titulo || 'Item não encontrado',
              clienteNome: (orcamento?.dados_contato as any)?.nome || 'Cliente não informado',
              codigo: orcamento?.codigo_orcamento || 'Sem código',
              etapa: checklistItem?.etapa_crm || 'N/A',
              dataConclusao: item.data_conclusao,
              observacao: item.observacao
            });
          });
        }

        // Buscar tarefas concluídas de CRM Orçamentos
        const { data: tarefasOrc, error: errorTarefasOrc } = await supabase
          .from('crm_orcamentos_tarefas')
          .select('id, data_conclusao, titulo, descricao, orcamento_id')
          .eq('concluida', true)
          .eq('concluida_por_id', usuarioId)
          .gte('data_conclusao', dataInicioISO)
          .lte('data_conclusao', dataFimISO)
          .order('data_conclusao', { ascending: false });

        if (errorTarefasOrc) throw errorTarefasOrc;

        if (tarefasOrc && tarefasOrc.length > 0) {
          // Buscar dados dos orçamentos para tarefas
          const orcamentoIdsTarefas = tarefasOrc.map(t => t.orcamento_id);
          const { data: orcamentosTarefas } = await supabase
            .from('orcamentos')
            .select('id, codigo_orcamento, dados_contato')
            .in('id', orcamentoIdsTarefas);

          // Buscar etapa CRM dos orçamentos
          const { data: trackingData } = await supabase
            .from('orcamentos_crm_tracking')
            .select('orcamento_id, etapa_crm')
            .in('orcamento_id', orcamentoIdsTarefas);

          const orcamentosMapTarefas = new Map(orcamentosTarefas?.map(o => [o.id, o]) || []);
          const trackingMap = new Map(trackingData?.map(t => [t.orcamento_id, t.etapa_crm]) || []);

          tarefasOrc.forEach(item => {
            const orcamento = orcamentosMapTarefas.get(item.orcamento_id);
            const etapa = trackingMap.get(item.orcamento_id);

            atividades.push({
              id: item.id,
              tipo: 'orcamentos',
              tipoAtividade: 'tarefa',
              itemTitulo: item.titulo,
              clienteNome: (orcamento?.dados_contato as any)?.nome || 'Cliente não informado',
              codigo: orcamento?.codigo_orcamento || 'Sem código',
              etapa: etapa || 'N/A',
              dataConclusao: item.data_conclusao,
              observacao: item.descricao
            });
          });
        }
      }

      // Buscar atividades de CRM Marcenaria
      if (!tipoCrm || tipoCrm === 'marcenaria') {
        // 1. Buscar progresso de checklist de marcenaria
        const { data: progressoMarc, error: errorMarc } = await supabase
          .from('crm_marcenaria_checklist_progresso')
          .select('id, data_conclusao, observacao, item_checklist_id, lead_id')
          .eq('concluido', true)
          .eq('concluido_por_id', usuarioId)
          .gte('data_conclusao', dataInicioISO)
          .lte('data_conclusao', dataFimISO)
          .order('data_conclusao', { ascending: false });

        if (errorMarc) throw errorMarc;

        if (progressoMarc && progressoMarc.length > 0) {
          // 2. Buscar dados dos itens de checklist
          const itemIds = progressoMarc.map(p => p.item_checklist_id);
          const { data: itensChecklist } = await supabase
            .from('crm_marcenaria_checklist_etapas')
            .select('id, titulo, etapa_marcenaria')
            .in('id', itemIds);

          // 3. Buscar dados dos leads
          const leadIds = progressoMarc.map(p => p.lead_id);
          const { data: leads } = await supabase
            .from('crm_marcenaria_leads')
            .select('id, cliente_nome, codigo_orcamento')
            .in('id', leadIds);

          // 4. Criar mapas para lookup rápido
          const itensMap = new Map(itensChecklist?.map(i => [i.id, i]) || []);
          const leadsMap = new Map(leads?.map(l => [l.id, l]) || []);

          // 5. Montar as atividades
          progressoMarc.forEach(item => {
            const checklistItem = itensMap.get(item.item_checklist_id);
            const lead = leadsMap.get(item.lead_id);

            atividades.push({
              id: item.id,
              tipo: 'marcenaria',
              tipoAtividade: 'checklist',
              itemTitulo: checklistItem?.titulo || 'Item não encontrado',
              clienteNome: lead?.cliente_nome || 'Cliente não informado',
              codigo: lead?.codigo_orcamento || 'Sem código',
              etapa: checklistItem?.etapa_marcenaria || 'N/A',
              dataConclusao: item.data_conclusao,
              observacao: item.observacao
            });
          });
        }

        // Buscar tarefas concluídas de CRM Marcenaria
        const { data: tarefasMarc, error: errorTarefasMarc } = await supabase
          .from('crm_marcenaria_tarefas')
          .select('id, data_conclusao, titulo, descricao, lead_id')
          .eq('concluida', true)
          .eq('concluida_por_id', usuarioId)
          .gte('data_conclusao', dataInicioISO)
          .lte('data_conclusao', dataFimISO)
          .order('data_conclusao', { ascending: false });

        if (errorTarefasMarc) throw errorTarefasMarc;

        if (tarefasMarc && tarefasMarc.length > 0) {
          // Buscar dados dos leads para tarefas
          const leadIdsTarefas = tarefasMarc.map(t => t.lead_id);
          const { data: leadsTarefas } = await supabase
            .from('crm_marcenaria_leads')
            .select('id, cliente_nome, codigo_orcamento, etapa_marcenaria')
            .in('id', leadIdsTarefas);

          const leadsMapTarefas = new Map(leadsTarefas?.map(l => [l.id, l]) || []);

          tarefasMarc.forEach(item => {
            const lead = leadsMapTarefas.get(item.lead_id);

            atividades.push({
              id: item.id,
              tipo: 'marcenaria',
              tipoAtividade: 'tarefa',
              itemTitulo: item.titulo,
              clienteNome: lead?.cliente_nome || 'Cliente não informado',
              codigo: lead?.codigo_orcamento || 'Sem código',
              etapa: lead?.etapa_marcenaria || 'N/A',
              dataConclusao: item.data_conclusao,
              observacao: item.descricao
            });
          });
        }
      }

      // Ordenar por data mais recente
      atividades.sort((a, b) => 
        new Date(b.dataConclusao).getTime() - new Date(a.dataConclusao).getTime()
      );

      return atividades;
    },
    enabled: !!usuarioId
  });
};
