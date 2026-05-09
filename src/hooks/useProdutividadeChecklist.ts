import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startOfDay, subDays, format, differenceInDays, parseISO } from 'date-fns';

export interface ProdutividadeConcierge {
  usuarioId: string;
  nome: string;
  itensHoje: number;
  itens7Dias: number;
  itens15Dias: number;
  itens30Dias: number;
  itensPeriodo: number;
  metaDiaria: number;
  metaSemanal: number;
  metaQuinzenal: number;
  metaMensal: number;
  metaPeriodo: number;
  percentualMeta: number;
  percentualMetaSemanal: number;
  percentualMetaQuinzenal: number;
  percentualMetaMensal: number;
  percentualMetaPeriodo: number;
  status: 'acima' | 'ok' | 'medio' | 'baixo';
  clientesCarteira: number;
  taxaProdutividade: number;
  nivelConcierge: string;
}

export interface EvolucaoDiaria {
  data: string;
  [key: string]: number | string;
}

export interface TotaisGerais {
  totalPeriodo: number;
  totalHoje: number;
  total7Dias: number;
  total15Dias: number;
  total30Dias: number;
  mediaDiaria: number;
  percentualMeta: number;
  percentualMetaSemanal: number;
  percentualMetaQuinzenal: number;
  percentualMetaMensal: number;
  percentualMetaPeriodo: number;
  metaTotalSemanal: number;
  metaTotalQuinzenal: number;
  metaTotalMensal: number;
  metaTotalPeriodo: number;
}

export interface MetaConcierge {
  id: string;
  usuario_id: string;
  meta_itens_diarios: number;
  ativo: boolean;
  nivel_concierge?: string;
  taxa_produtividade?: number;
}

export interface ClientesCarteira {
  usuario_id: string;
  nome: string;
  tipo_usuario: string;
  clientes_orcamentos: number;
  clientes_marcenaria: number;
  total_clientes: number;
}

export interface FiltrosProdutividade {
  dias?: number;
  dataInicio?: string;
  dataFim?: string;
}

export const useProdutividadeChecklist = (
  filtro?: FiltrosProdutividade | number,
  tipoCrm?: 'orcamentos' | 'marcenaria'
) => {
  const queryClient = useQueryClient();

  // Normalizar filtro para retrocompatibilidade
  const filtroNormalizado: FiltrosProdutividade = typeof filtro === 'number'
    ? { dias: filtro }
    : filtro || { dias: 14 };

  // Calcular datas baseado no filtro
  const { dataInicioCalculada, dataFimCalculada, diasPeriodo } = (() => {
    if (filtroNormalizado.dataInicio && filtroNormalizado.dataFim) {
      const inicio = parseISO(filtroNormalizado.dataInicio);
      const fim = parseISO(filtroNormalizado.dataFim);
      return {
        dataInicioCalculada: filtroNormalizado.dataInicio,
        dataFimCalculada: filtroNormalizado.dataFim,
        diasPeriodo: differenceInDays(fim, inicio) + 1
      };
    } else {
      const dias = filtroNormalizado.dias || 14;
      const fim = new Date();
      const inicio = startOfDay(subDays(fim, dias - 1));
      return {
        dataInicioCalculada: format(inicio, 'yyyy-MM-dd'),
        dataFimCalculada: format(fim, 'yyyy-MM-dd'),
        diasPeriodo: dias
      };
    }
  })();

  // Buscar gestores de conta ativos
  const { data: gestores, isLoading: loadingGestores } = useQuery({
    queryKey: ['gestores-produtividade'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, email')
        .in('tipo_usuario', ['gestor_conta', 'gestor_marcenaria', 'consultor_marcenaria', 'customer_success'])
        .eq('status', 'ativo')
        .order('nome');

      if (error) throw error;
      return data;
    }
  });

  // Buscar metas configuradas
  const { data: metas, isLoading: loadingMetas } = useQuery({
    queryKey: ['metas-checklist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metas_checklist_concierge')
        .select('*')
        .eq('ativo', true);

      if (error) throw error;
      return data as MetaConcierge[];
    }
  });

  // Buscar clientes em carteira
  const { data: clientesCarteira, isLoading: loadingClientes } = useQuery({
    queryKey: ['clientes-carteira'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_clientes_carteira_concierge')
        .select('*');

      if (error) throw error;
      return data as ClientesCarteira[];
    }
  });

  // Buscar dados de produtividade
  const { data: produtividade, isLoading: loadingProdutividade } = useQuery({
    queryKey: ['produtividade-checklist', dataInicioCalculada, dataFimCalculada, tipoCrm],
    queryFn: async () => {
      let query = supabase
        .from('vw_produtividade_checklist_diaria')
        .select('*')
        .gte('data', `${dataInicioCalculada}T00:00:00`)
        .lte('data', `${dataFimCalculada}T23:59:59`);

      if (tipoCrm) {
        query = query.eq('tipo_crm', tipoCrm);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!gestores
  });

  // Processar dados de produtividade por concierge
  const produtividadePorConcierge: ProdutividadeConcierge[] = (gestores || []).map(gestor => {
    const metaConcierge = metas?.find(m => m.usuario_id === gestor.id);
    const clientesGestor = clientesCarteira?.find(c => c.usuario_id === gestor.id);
    
    const taxaProdutividade = metaConcierge?.taxa_produtividade || 0.59;
    const clientesEmCarteira = clientesGestor?.total_clientes || 0;
    const nivelConcierge = metaConcierge?.nivel_concierge || 'pleno';
    
    // Calcular meta dinamicamente ou usar meta fixa antiga (retrocompatibilidade)
    const metaDiaria = metaConcierge?.taxa_produtividade 
      ? Math.round(clientesEmCarteira * taxaProdutividade)
      : (metaConcierge?.meta_itens_diarios || 15);

    const dadosGestor = produtividade?.filter(p => p.usuario_id === gestor.id) || [];
    
    const hoje = format(new Date(), 'yyyy-MM-dd');
    const seteDiasAtras = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    const quinzeDiasAtras = format(subDays(new Date(), 15), 'yyyy-MM-dd');
    const trintaDiasAtras = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    
    const itensHoje = dadosGestor
      .filter(d => String(d.data).substring(0, 10) === hoje)
      .reduce((sum, d) => sum + d.itens_concluidos, 0);
    
    const itens7Dias = dadosGestor
      .filter(d => String(d.data).substring(0, 10) >= seteDiasAtras)
      .reduce((sum, d) => sum + d.itens_concluidos, 0);
    
    const itens15Dias = dadosGestor
      .filter(d => String(d.data).substring(0, 10) >= quinzeDiasAtras)
      .reduce((sum, d) => sum + d.itens_concluidos, 0);
    
    const itens30Dias = dadosGestor
      .filter(d => String(d.data).substring(0, 10) >= trintaDiasAtras)
      .reduce((sum, d) => sum + d.itens_concluidos, 0);

    // Calcular itens do período selecionado
    const itensPeriodo = dadosGestor
      .filter(d => {
        const dataItem = String(d.data).substring(0, 10);
        return dataItem >= dataInicioCalculada && dataItem <= dataFimCalculada;
      })
      .reduce((sum, d) => sum + d.itens_concluidos, 0);

    const percentualMeta = metaDiaria > 0 ? (itensHoje / metaDiaria) * 100 : 0;
    
    // Calcular metas por período
    const metaSemanal = metaDiaria * 7;
    const metaQuinzenal = metaDiaria * 15;
    const metaMensal = metaDiaria * 30;
    const metaPeriodo = metaDiaria * diasPeriodo;
    
    const percentualMetaSemanal = metaSemanal > 0 ? (itens7Dias / metaSemanal) * 100 : 0;
    const percentualMetaQuinzenal = metaQuinzenal > 0 ? (itens15Dias / metaQuinzenal) * 100 : 0;
    const percentualMetaMensal = metaMensal > 0 ? (itens30Dias / metaMensal) * 100 : 0;
    const percentualMetaPeriodo = metaPeriodo > 0 ? (itensPeriodo / metaPeriodo) * 100 : 0;

    let status: 'acima' | 'ok' | 'medio' | 'baixo' = 'baixo';
    if (percentualMetaPeriodo >= 100) status = 'acima';
    else if (percentualMetaPeriodo >= 80) status = 'ok';
    else if (percentualMetaPeriodo >= 50) status = 'medio';

    return {
      usuarioId: gestor.id,
      nome: gestor.nome || gestor.email || 'Sem nome',
      itensHoje,
      itens7Dias,
      itens15Dias,
      itens30Dias,
      itensPeriodo,
      metaDiaria,
      metaSemanal,
      metaQuinzenal,
      metaMensal,
      metaPeriodo,
      percentualMeta,
      percentualMetaSemanal,
      percentualMetaQuinzenal,
      percentualMetaMensal,
      percentualMetaPeriodo,
      status,
      clientesCarteira: clientesEmCarteira,
      taxaProdutividade,
      nivelConcierge
    };
  });

  // Calcular totais gerais
  const totaisGerais: TotaisGerais = {
    totalPeriodo: produtividadePorConcierge.reduce((sum, p) => sum + p.itensPeriodo, 0),
    totalHoje: produtividadePorConcierge.reduce((sum, p) => sum + p.itensHoje, 0),
    total7Dias: produtividadePorConcierge.reduce((sum, p) => sum + p.itens7Dias, 0),
    total15Dias: produtividadePorConcierge.reduce((sum, p) => sum + p.itens15Dias, 0),
    total30Dias: produtividadePorConcierge.reduce((sum, p) => sum + p.itens30Dias, 0),
    mediaDiaria: produtividadePorConcierge.length > 0
      ? produtividadePorConcierge.reduce((sum, p) => sum + p.itensPeriodo, 0) / (diasPeriodo * produtividadePorConcierge.length)
      : 0,
    percentualMeta: produtividadePorConcierge.length > 0
      ? produtividadePorConcierge.reduce((sum, p) => sum + p.percentualMeta, 0) / produtividadePorConcierge.length
      : 0,
    percentualMetaSemanal: produtividadePorConcierge.length > 0
      ? produtividadePorConcierge.reduce((sum, p) => sum + p.percentualMetaSemanal, 0) / produtividadePorConcierge.length
      : 0,
    percentualMetaQuinzenal: produtividadePorConcierge.length > 0
      ? produtividadePorConcierge.reduce((sum, p) => sum + p.percentualMetaQuinzenal, 0) / produtividadePorConcierge.length
      : 0,
    percentualMetaMensal: produtividadePorConcierge.length > 0
      ? produtividadePorConcierge.reduce((sum, p) => sum + p.percentualMetaMensal, 0) / produtividadePorConcierge.length
      : 0,
    percentualMetaPeriodo: produtividadePorConcierge.length > 0
      ? produtividadePorConcierge.reduce((sum, p) => sum + p.percentualMetaPeriodo, 0) / produtividadePorConcierge.length
      : 0,
    metaTotalSemanal: produtividadePorConcierge.reduce((sum, p) => sum + p.metaSemanal, 0),
    metaTotalQuinzenal: produtividadePorConcierge.reduce((sum, p) => sum + p.metaQuinzenal, 0),
    metaTotalMensal: produtividadePorConcierge.reduce((sum, p) => sum + p.metaMensal, 0),
    metaTotalPeriodo: produtividadePorConcierge.reduce((sum, p) => sum + p.metaPeriodo, 0)
  };

  // Processar evolução diária para o gráfico
  const evolucaoDiaria: EvolucaoDiaria[] = [];
  
  for (let i = diasPeriodo - 1; i >= 0; i--) {
    const dataBase = parseISO(dataFimCalculada);
    const data = format(subDays(dataBase, i), 'yyyy-MM-dd');
    const registro: EvolucaoDiaria = { data };

    produtividadePorConcierge.forEach(concierge => {
      const itensDia = produtividade
        ?.filter(p => 
          p.usuario_id === concierge.usuarioId && 
          String(p.data).substring(0, 10) === data
        )
        .reduce((sum, p) => sum + p.itens_concluidos, 0) || 0;
      
      registro[concierge.nome] = itensDia;
    });

    evolucaoDiaria.push(registro);
  }

  // Mutation para salvar/atualizar meta
  const salvarMeta = useMutation({
    mutationFn: async ({ 
      usuarioId, 
      nivelConcierge, 
      taxaProdutividade 
    }: { 
      usuarioId: string; 
      nivelConcierge: string; 
      taxaProdutividade: number;
    }) => {
      const { error } = await supabase
        .from('metas_checklist_concierge')
        .upsert({
          usuario_id: usuarioId,
          nivel_concierge: nivelConcierge,
          taxa_produtividade: taxaProdutividade,
          meta_itens_diarios: 0, // Mantido para retrocompatibilidade
          ativo: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'usuario_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metas-checklist'] });
      queryClient.invalidateQueries({ queryKey: ['produtividade-checklist'] });
      toast.success('Meta atualizada com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao salvar meta:', error);
      toast.error('Erro ao salvar meta');
    }
  });

  return {
    produtividadePorConcierge,
    evolucaoDiaria,
    totaisGerais,
    metas,
    gestores,
    clientesCarteira,
    isLoading: loadingGestores || loadingMetas || loadingProdutividade || loadingClientes,
    salvarMeta: salvarMeta.mutate,
    isSaving: salvarMeta.isPending
  };
};
