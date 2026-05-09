import { useState, useMemo, useEffect } from 'react';
import { FiltrosMarcenaria, LeadMarcenariaComChecklist, EtapaMarcenaria } from '@/types/crmMarcenaria';
import { startOfMonth, endOfMonth, subDays, subMonths, startOfDay, endOfDay, parseISO } from 'date-fns';

const STORAGE_KEY = 'reforma100_filtros_marcenaria';

export function useMarcemariaFilters(
  leads: LeadMarcenariaComChecklist[],
  userId?: string
) {
  const [filtros, setFiltros] = useState<FiltrosMarcenaria>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : { consultor: 'todos' };
    } catch {
      return { consultor: 'todos' };
    }
  });

  // Salvar filtros no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtros));
    } catch (error) {
      console.error('Erro ao salvar filtros:', error);
    }
  }, [filtros]);

  // Calcular datas baseado no tipo de período
  const calcularPeriodo = useMemo(() => {
    if (!filtros.periodo || filtros.periodo.tipo === 'todos') {
      return null;
    }

    const now = new Date();

    switch (filtros.periodo.tipo) {
      case 'ultimos_7_dias':
        return {
          inicio: startOfDay(subDays(now, 7)),
          fim: endOfDay(now)
        };
      case 'ultimos_30_dias':
        return {
          inicio: startOfDay(subDays(now, 30)),
          fim: endOfDay(now)
        };
      case 'mes_atual':
        return {
          inicio: startOfMonth(now),
          fim: endOfMonth(now)
        };
      case 'mes_anterior':
        const mesAnterior = subMonths(now, 1);
        return {
          inicio: startOfMonth(mesAnterior),
          fim: endOfMonth(mesAnterior)
        };
      case 'personalizado':
        if (filtros.periodo.inicio && filtros.periodo.fim) {
          return {
            inicio: startOfDay(parseISO(filtros.periodo.inicio)),
            fim: endOfDay(parseISO(filtros.periodo.fim))
          };
        }
        return null;
      default:
        return null;
    }
  }, [filtros.periodo]);

  // Aplicar filtros aos leads
  const leadsFiltrados = useMemo(() => {
    let resultado = [...leads];

    // Filtro de busca por texto
    if (filtros.busca && filtros.busca.trim() !== '') {
      const termo = filtros.busca.toLowerCase().trim();
      resultado = resultado.filter(lead => 
        lead.cliente_nome?.toLowerCase().includes(termo) ||
        lead.cliente_email?.toLowerCase().includes(termo) ||
        lead.cliente_telefone?.toLowerCase().includes(termo) ||
        lead.codigo_orcamento?.toLowerCase().includes(termo) ||
        lead.necessidade?.toLowerCase().includes(termo) ||
        lead.local?.toLowerCase().includes(termo)
      );
    }

    // Filtro de consultor
    if (filtros.consultor && filtros.consultor !== 'todos') {
      if (filtros.consultor === 'meus') {
        resultado = resultado.filter(lead => lead.consultor_responsavel_id === userId);
      } else {
        resultado = resultado.filter(lead => lead.consultor_responsavel_id === filtros.consultor);
      }
    }

    // Filtro de categorias
    if (filtros.categorias && filtros.categorias.length > 0) {
      resultado = resultado.filter(lead => 
        lead.categorias && lead.categorias.some(cat => 
          filtros.categorias!.includes(cat)
        )
      );
    }

    // Filtro de período
    if (calcularPeriodo) {
      resultado = resultado.filter(lead => {
        const dataCriacao = parseISO(lead.created_at);
        return dataCriacao >= calcularPeriodo.inicio && dataCriacao <= calcularPeriodo.fim;
      });
    }

    // Filtro de etapas
    if (filtros.etapas && filtros.etapas.length > 0) {
      resultado = resultado.filter(lead => 
        filtros.etapas!.includes(lead.etapa_marcenaria)
      );
    }

    // Filtro de estilo preferido
    if (filtros.estiloPreferido && filtros.estiloPreferido.length > 0) {
      resultado = resultado.filter(lead => 
        lead.estilo_preferido && filtros.estiloPreferido!.includes(lead.estilo_preferido)
      );
    }

    // Filtro de briefing
    if (filtros.briefing) {
      if (filtros.briefing.temPlanta !== undefined) {
        resultado = resultado.filter(lead => lead.tem_planta === filtros.briefing!.temPlanta);
      }
      if (filtros.briefing.temMedidas !== undefined) {
        resultado = resultado.filter(lead => lead.tem_medidas === filtros.briefing!.temMedidas);
      }
      if (filtros.briefing.temFotos !== undefined) {
        resultado = resultado.filter(lead => lead.tem_fotos === filtros.briefing!.temFotos);
      }
    }

    // Filtro de projeto
    if (filtros.projeto && filtros.projeto !== 'todos') {
      if (filtros.projeto === 'enviado') {
        resultado = resultado.filter(lead => lead.projeto_url !== null);
      } else if (filtros.projeto === 'nao_enviado') {
        resultado = resultado.filter(lead => lead.projeto_url === null);
      }
    }

    // Filtro de reunião
    if (filtros.reuniao && filtros.reuniao !== 'todos') {
      if (filtros.reuniao === 'agendada') {
        resultado = resultado.filter(lead => 
          lead.reuniao_agendada_para !== null && lead.reuniao_realizada_em === null
        );
      } else if (filtros.reuniao === 'realizada') {
        resultado = resultado.filter(lead => lead.reuniao_realizada_em !== null);
      } else if (filtros.reuniao === 'pendente') {
        resultado = resultado.filter(lead => 
          lead.reuniao_agendada_para === null && lead.reuniao_realizada_em === null
        );
      }
    }

    // Filtro de valor estimado
    if (filtros.valorEstimado) {
      resultado = resultado.filter(lead => {
        if (!lead.valor_estimado) return false;
        const min = filtros.valorEstimado!.min;
        const max = filtros.valorEstimado!.max;
        if (min !== undefined && lead.valor_estimado < min) return false;
        if (max !== undefined && lead.valor_estimado > max) return false;
        return true;
      });
    }

    // Filtro de alerta de checklist
    if (filtros.temAlertaChecklist !== undefined) {
      resultado = resultado.filter(lead => 
        lead.tem_alerta_checklist === filtros.temAlertaChecklist
      );
    }

    // Filtro de notas
    if (filtros.comNotas !== undefined) {
      resultado = resultado.filter(lead => 
        filtros.comNotas ? lead.total_notas > 0 : lead.total_notas === 0
      );
    }

    // Filtro de dias na etapa
    if (filtros.diasNaEtapa) {
      resultado = resultado.filter(lead => {
        const dias = lead.dias_na_etapa_atual;
        const min = filtros.diasNaEtapa!.min;
        const max = filtros.diasNaEtapa!.max;
        if (min !== undefined && dias < min) return false;
        if (max !== undefined && dias > max) return false;
        return true;
      });
    }

    // Filtro de tarefas
    if (filtros.semTarefas) {
      resultado = resultado.filter(lead => lead.total_tarefas === 0);
    }
    
    if (filtros.tarefasAtrasadas) {
      resultado = resultado.filter(lead => (lead.tarefas_atrasadas || 0) > 0);
    }
    
    if (filtros.tarefasHoje) {
      resultado = resultado.filter(lead => (lead.tarefas_hoje || 0) > 0);
    }

    return resultado;
  }, [leads, filtros, userId, calcularPeriodo]);

  // Contar filtros ativos
  const filtrosAtivos = useMemo(() => {
    let count = 0;
    if (filtros.busca && filtros.busca.trim() !== '') count++;
    if (filtros.consultor && filtros.consultor !== 'todos') count++;
    if (filtros.categorias && filtros.categorias.length > 0) count++;
    if (filtros.periodo && filtros.periodo.tipo !== 'todos') count++;
    if (filtros.etapas && filtros.etapas.length > 0) count++;
    if (filtros.estiloPreferido && filtros.estiloPreferido.length > 0) count++;
    if (filtros.briefing && Object.values(filtros.briefing).some(v => v !== undefined)) count++;
    if (filtros.projeto && filtros.projeto !== 'todos') count++;
    if (filtros.reuniao && filtros.reuniao !== 'todos') count++;
    if (filtros.valorEstimado && (filtros.valorEstimado.min !== undefined || filtros.valorEstimado.max !== undefined)) count++;
    if (filtros.temAlertaChecklist !== undefined) count++;
    if (filtros.comNotas !== undefined) count++;
    if (filtros.diasNaEtapa && (filtros.diasNaEtapa.min !== undefined || filtros.diasNaEtapa.max !== undefined)) count++;
    if (filtros.semTarefas) count++;
    if (filtros.tarefasAtrasadas) count++;
    if (filtros.tarefasHoje) count++;
    return count;
  }, [filtros]);

  const limparFiltros = () => {
    setFiltros({ consultor: 'todos' });
  };

  return {
    filtros,
    setFiltros,
    leadsFiltrados,
    filtrosAtivos,
    limparFiltros
  };
}
