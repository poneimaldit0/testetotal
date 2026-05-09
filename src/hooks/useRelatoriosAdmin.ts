
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const BRASILIA_TZ = 'America/Sao_Paulo';

export interface RelatorioAcessosUnicos {
  data: string;
  acessos_unicos: number;
}

export interface RelatorioInscricoesFornecedor {
  inscricao_id: string;
  orcamento_id: string;
  codigo_orcamento: string;
  necessidade: string;
  local: string;
  data_inscricao: string;
  status_orcamento: string;
  status_acompanhamento: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_telefone: string;
  tamanho_imovel: number;
  observacoes_acompanhamento: string | null;
  data_ultima_atualizacao: string | null;
}

export interface RelatorioStatusOrcamentos {
  status_acompanhamento: string;
  quantidade: number;
  percentual: number;
}

export interface RelatorioOrcamentosPostados {
  data: string;
  quantidade_postados: number;
}

export interface Fornecedor {
  id: string;
  nome: string;
  email: string;
  empresa: string;
  status: string;
}

export interface FornecedorInscrito {
  id: string;
  fornecedor_id: string;
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  data_candidatura: string;
  status_acompanhamento: string | null;
}

export interface RelatorioClientesMes {
  orcamento_id: string;
  codigo_orcamento: string;
  data_publicacao: string;
  necessidade: string;
  categorias: string[];
  local: string;
  tamanho_imovel: number;
  status_orcamento: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_telefone: string;
  gestor_conta_nome: string;
  gestor_conta_email: string;
  total_fornecedores_inscritos: number;
  fornecedores_inscritos: FornecedorInscrito[];
}

export interface RelatorioLoginFornecedor {
  fornecedor_id: string;
  nome: string;
  empresa: string;
  email: string;
  data_inicio_contrato: string;
  data_termino_contrato: string | null;
  status_contrato: string;
  total_logins_desde_inicio: number;
  total_logins_periodo: number;
  ultimo_login: string | null;
  dias_sem_login: number | null;
  media_logins_mes: number;
  dias_contrato_total: number | null;
  dias_contrato_restantes: number | null;
}

export interface TopCategoriaOrcamento {
  categoria: string;
  quantidade: number;
  percentual: number;
}

export interface RelatorioPerfilOrcamentos {
  total_orcamentos: number;
  tamanho_medio: number;
  tamanho_mediano: number;
  // Distribuição por faixas de tamanho
  faixa_0_10: number;
  faixa_10_30: number;
  faixa_30_60: number;
  faixa_60_100: number;
  faixa_100_150: number;
  faixa_acima_150: number;
  // Percentuais das faixas
  perc_0_10: number;
  perc_10_30: number;
  perc_30_60: number;
  perc_60_100: number;
  perc_100_150: number;
  perc_acima_150: number;
  // Distribuição por prazo
  prazo_imediato: number;
  prazo_3_meses: number;
  prazo_6_meses: number;
  prazo_9_meses: number;
  prazo_12_meses: number;
  prazo_flexivel: number;
  // Percentuais dos prazos
  perc_prazo_imediato: number;
  perc_prazo_3_meses: number;
  perc_prazo_6_meses: number;
  perc_prazo_9_meses: number;
  perc_prazo_12_meses: number;
  perc_prazo_flexivel: number;
  // Status
  status_abertos: number;
  status_fechados: number;
  perc_abertos: number;
  perc_fechados: number;
  // Top categorias
  top_categorias: TopCategoriaOrcamento[];
}

export interface RelatorioOrcamentosConcierge {
  mes: string;
  gestor_conta_id: string;
  gestor_nome: string;
  total_orcamentos: number;
}

export interface RelatorioFornecedorCompleto {
  id: string;
  nome: string;
  email: string;
  empresa: string;
  telefone: string;
  whatsapp: string;
  endereco: string;
  site_url: string;
  status: string;
  status_contrato: string;
  data_criacao: string;
  data_termino_contrato: string | null;
  dias_restantes_contrato: number | null;
  limite_acessos_diarios: number;
  limite_acessos_mensais: number;
  limite_propostas_abertas: number | null;
  acessos_diarios: number;
  acessos_mensais: number;
  ultimo_login: string | null;
  dias_sem_login: number | null;
  penalidades_ativas: number;
  bloqueado_ate: string | null;
  total_candidaturas: number;
  candidaturas_ativas: number;
  media_logins_mes: number;
}

export interface FiltrosFornecedores {
  status_filtro?: string[];
  data_inicio?: string;
  data_fim?: string;
  vencimento_proximo_dias?: number;
  busca_texto?: string;
}

export interface FornecedorAtivoData {
  id: string;
  nome: string;
  email: string;
  empresa: string;
  telefone: string;
  data_criacao: string;
  data_termino_contrato: string | null;
  dias_restantes_contrato: number | null;
  status_contrato: 'sem_prazo' | 'vencendo' | 'ativo' | 'indefinido';
}

export interface RelatorioFornecedoresAtivos {
  total_ativos: number;
  novos_mes_atual: number;
  contratos_vencendo_30_dias: number;
  sem_data_termino: number;
  fornecedores: FornecedorAtivoData[];
}

export interface RelatorioConversaoOrcamentos {
  data: string;
  quantidade_postados: number;
  quantidade_fechados: number;
  taxa_conversao: number;
}

export const useRelatoriosAdmin = () => {
  const [loading, setLoading] = useState(false);

  const buscarAcessosUnicos = useCallback(async (dataInicio: string, dataFim: string): Promise<RelatorioAcessosUnicos[]> => {
    setLoading(true);
    try {
      console.log('🔍 Buscando acessos únicos:', { dataInicio, dataFim });
      
      const { data, error } = await supabase.rpc('relatorio_acessos_unicos_diarios', {
        p_data_inicio: dataInicio,
        p_data_fim: dataFim
      });

      if (error) {
        console.error('❌ Erro na função relatorio_acessos_unicos_diarios:', error);
        throw error;
      }
      
      console.log('✅ Dados de acessos únicos recebidos:', data);
      return data || [];
    } catch (error: any) {
      console.error('❌ Erro ao buscar acessos únicos:', error);
      toast.error('Erro ao carregar relatório de acessos únicos');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const buscarInscricoesFornecedor = useCallback(async (fornecedorId: string, dataInicio: string, dataFim: string): Promise<RelatorioInscricoesFornecedor[]> => {
    setLoading(true);
    try {
      console.log('🔍 Buscando inscrições do fornecedor:', { fornecedorId, dataInicio, dataFim });
      
      const { data, error } = await supabase.rpc('relatorio_inscricoes_fornecedor', {
        p_fornecedor_id: fornecedorId,
        p_data_inicio: dataInicio,
        p_data_fim: dataFim
      });

      if (error) {
        console.error('❌ Erro na função relatorio_inscricoes_fornecedor:', error);
        throw error;
      }
      
      console.log('✅ Dados de inscrições recebidos:', data);
      return (data || []) as unknown as RelatorioInscricoesFornecedor[];
    } catch (error: any) {
      console.error('❌ Erro ao buscar inscrições do fornecedor:', error);
      toast.error('Erro ao carregar relatório de inscrições');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const buscarStatusOrcamentos = useCallback(async (fornecedorId: string, dataInicio: string, dataFim: string): Promise<RelatorioStatusOrcamentos[]> => {
    setLoading(true);
    try {
      console.log('🔍 Buscando status dos orçamentos:', { fornecedorId, dataInicio, dataFim });
      
      const { data, error } = await supabase.rpc('relatorio_status_orcamentos_fornecedor', {
        p_fornecedor_id: fornecedorId,
        p_data_inicio: dataInicio,
        p_data_fim: dataFim
      });

      if (error) {
        console.error('❌ Erro na função relatorio_status_orcamentos_fornecedor:', error);
        throw error;
      }
      
      console.log('✅ Dados de status recebidos:', data);
      return data || [];
    } catch (error: any) {
      console.error('❌ Erro ao buscar status dos orçamentos:', error);
      toast.error('Erro ao carregar relatório de status');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const buscarOrcamentosPostados = useCallback(async (dataInicio: string, dataFim: string): Promise<RelatorioOrcamentosPostados[]> => {
    if (!dataInicio || !dataFim) {
      console.log('⚠️ Datas não fornecidas para busca de orçamentos postados');
      return [];
    }

    setLoading(true);
    try {
      console.log('🔍 Buscando orçamentos postados:', { dataInicio, dataFim });
      
      const { data, error } = await supabase.rpc('relatorio_orcamentos_postados_diarios', {
        p_data_inicio: dataInicio,
        p_data_fim: dataFim
      });

      if (error) {
        console.error('❌ Erro na função relatorio_orcamentos_postados_diarios:', error);
        throw error;
      }
      
      console.log('✅ Dados de orçamentos postados recebidos:', data);
      return data || [];
    } catch (error: any) {
      console.error('❌ Erro ao buscar orçamentos postados:', error);
      toast.error('Erro ao carregar relatório de orçamentos postados');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const buscarFornecedores = useCallback(async (): Promise<Fornecedor[]> => {
    try {
      console.log('🔍 Buscando lista de fornecedores');
      
      const { data, error } = await supabase.rpc('listar_fornecedores_para_relatorio');

      if (error) {
        console.error('❌ Erro na função listar_fornecedores_para_relatorio:', error);
        throw error;
      }
      
      console.log('✅ Fornecedores recebidos:', data);
      return data || [];
    } catch (error: any) {
      console.error('❌ Erro ao buscar fornecedores:', error);
      toast.error('Erro ao carregar lista de fornecedores');
      throw error;
    }
  }, []);

  const buscarClientesMes = useCallback(async (dataInicio: string, dataFim: string): Promise<RelatorioClientesMes[]> => {
    setLoading(true);
    try {
      console.log('🔍 Buscando clientes do mês:', { dataInicio, dataFim });
      
      const { data, error } = await supabase.rpc('relatorio_clientes_postados_mes', {
        p_data_inicio: dataInicio,
        p_data_fim: dataFim
      });

      if (error) {
        console.error('❌ Erro na função relatorio_clientes_postados_mes:', error);
        throw error;
      }
      
      console.log('✅ Dados de clientes recebidos:', data);
      
      // Processar os dados para garantir que fornecedores_inscritos seja um array
      const processedData = (data || []).map((item: any) => ({
        ...item,
        fornecedores_inscritos: Array.isArray(item.fornecedores_inscritos) 
          ? item.fornecedores_inscritos 
          : JSON.parse(item.fornecedores_inscritos || '[]')
      }));
      
      return processedData;
    } catch (error: any) {
      console.error('❌ Erro ao buscar clientes do mês:', error);
      toast.error('Erro ao carregar relatório de clientes');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const buscarLoginsFornecedor = useCallback(async (fornecedorId?: string, dataInicio?: string, dataFim?: string): Promise<RelatorioLoginFornecedor[]> => {
    setLoading(true);
    try {
      console.log('🔍 Buscando logins dos fornecedores:', { fornecedorId, dataInicio, dataFim });
      
      const { data, error } = await supabase.rpc('relatorio_logins_fornecedor', {
        p_fornecedor_id: fornecedorId || null,
        p_data_inicio: dataInicio || null,
        p_data_fim: dataFim || null
      });

      if (error) {
        console.error('❌ Erro na função relatorio_logins_fornecedor:', error);
        throw error;
      }
      
      console.log('✅ Dados de logins recebidos:', data);
      return (data || []) as unknown as RelatorioLoginFornecedor[];
    } catch (error: any) {
      console.error('❌ Erro ao buscar logins dos fornecedores:', error);
      toast.error('Erro ao carregar relatório de logins');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const buscarPerfilOrcamentos = useCallback(async (dataInicio: string, dataFim: string): Promise<RelatorioPerfilOrcamentos[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('relatorio_perfil_orcamentos', {
        p_data_inicio: dataInicio,
        p_data_fim: dataFim
      });

      if (error) {
        console.error('Erro ao buscar perfil de orçamentos:', error);
        throw error;
      }

      // Processar os dados e converter top_categorias de JSON para array
      const processedData = (data || []).map((item: any) => ({
        ...item,
        top_categorias: typeof item.top_categorias === 'string' 
          ? JSON.parse(item.top_categorias) 
          : Array.isArray(item.top_categorias) 
          ? item.top_categorias 
          : []
      }));

      return processedData;
    } catch (error) {
      console.error('Erro ao buscar perfil de orçamentos:', error);
      toast.error('Erro ao carregar relatório de perfil de orçamentos');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const buscarRelatorioFornecedores = useCallback(async (filtros: FiltrosFornecedores): Promise<RelatorioFornecedorCompleto[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('relatorio_fornecedores_completo', {
        p_status_filtro: filtros.status_filtro || null,
        p_data_inicio: filtros.data_inicio || null,
        p_data_fim: filtros.data_fim || null,
        p_vencimento_proximo_dias: filtros.vencimento_proximo_dias || null,
        p_busca_texto: filtros.busca_texto || null
      });

      if (error) {
        console.error('Erro ao buscar relatório de fornecedores:', error);
        toast.error('Erro ao buscar dados dos fornecedores');
        return [];
      }

      return (data || []) as unknown as RelatorioFornecedorCompleto[];
    } catch (error) {
      console.error('Erro ao buscar relatório de fornecedores:', error);
      toast.error('Erro ao buscar dados dos fornecedores');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const buscarFornecedoresAtivos = useCallback(async (dataConsulta: string): Promise<RelatorioFornecedoresAtivos | null> => {
    if (!loading) setLoading(true);

    try {
      const { data, error } = await supabase.rpc('relatorio_fornecedores_ativos_por_data', {
        p_data_consulta: dataConsulta
      });

      if (error) {
        console.error('Erro ao buscar fornecedores ativos:', error);
        toast.error("Erro ao carregar relatório de fornecedores ativos");
        return null;
      }

      if (!data || data.length === 0) {
        return {
          total_ativos: 0,
          novos_mes_atual: 0,
          contratos_vencendo_30_dias: 0,
          sem_data_termino: 0,
          fornecedores: []
        };
      }

      const resultado = data[0];
      return {
        total_ativos: resultado.total_ativos,
        novos_mes_atual: resultado.novos_no_mes ?? 0,
        contratos_vencendo_30_dias: resultado.vencendo_30_dias ?? 0,
        sem_data_termino: resultado.sem_prazo ?? 0,
        fornecedores: Array.isArray(resultado.fornecedores) 
          ? resultado.fornecedores 
          : JSON.parse(resultado.fornecedores as string || '[]')
      };
    } catch (error) {
      console.error('Erro inesperado ao buscar fornecedores ativos:', error);
      toast.error("Erro inesperado ao carregar relatório");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const buscarInscricoesHoje = useCallback(async (dataParam?: string): Promise<any[]> => {
    setLoading(true);
    try {
      const dataConsulta = dataParam || formatInTimeZone(new Date(), BRASILIA_TZ, 'yyyy-MM-dd');
      console.log('🔍 Buscando inscrições para a data (Brasília):', dataConsulta);
      
      // Converter os limites para UTC para a query
      const inicioDiaBrasilia = new Date(`${dataConsulta}T00:00:00-03:00`);
      const fimDiaBrasilia = new Date(`${dataConsulta}T23:59:59-03:00`);
      
      const { data, error } = await supabase
        .from('candidaturas_fornecedores')
        .select(`
          fornecedor_id,
          data_candidatura,
          orcamento_id,
          profiles!candidaturas_fornecedores_fornecedor_id_fkey (
            nome,
            empresa
          ),
          orcamentos!candidaturas_fornecedores_orcamento_id_fkey (
            codigo_orcamento,
            necessidade,
            local,
            status
          )
        `)
        .gte('data_candidatura', inicioDiaBrasilia.toISOString())
        .lte('data_candidatura', fimDiaBrasilia.toISOString())
        .is('data_desistencia', null)
        .order('data_candidatura', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar inscrições de hoje:', error);
        throw error;
      }

      // Agrupar por fornecedor
      const grouped = (data || []).reduce((acc: any, item: any) => {
        const fornecedorId = item.fornecedor_id;
        
        if (!acc[fornecedorId]) {
          acc[fornecedorId] = {
            fornecedor_id: fornecedorId,
            fornecedor_nome: item.profiles?.nome || 'Sem nome',
            empresa: item.profiles?.empresa || 'Sem empresa',
            total_inscricoes: 0,
            orcamentos: []
          };
        }

        acc[fornecedorId].total_inscricoes += 1;
        acc[fornecedorId].orcamentos.push({
          orcamento_id: item.orcamento_id,
          codigo_orcamento: item.orcamentos?.codigo_orcamento || 'N/A',
          necessidade: item.orcamentos?.necessidade || '',
          local: item.orcamentos?.local || '',
          data_candidatura: item.data_candidatura,
          status: item.orcamentos?.status || ''
        });

        return acc;
      }, {});

      const resultado = Object.values(grouped).sort((a: any, b: any) => 
        b.total_inscricoes - a.total_inscricoes
      );

      console.log('✅ Inscrições de hoje agrupadas:', resultado);
      return resultado;
    } catch (error: any) {
      console.error('❌ Erro ao buscar inscrições de hoje:', error);
      toast.error('Erro ao carregar inscrições de hoje');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const buscarConversaoOrcamentos = useCallback(async (dataInicio: string, dataFim: string): Promise<RelatorioConversaoOrcamentos[]> => {
    if (!dataInicio || !dataFim) {
      console.log('⚠️ Datas não fornecidas para busca de conversão');
      return [];
    }

    setLoading(true);
    try {
      console.log('🔍 Buscando conversão de orçamentos:', { dataInicio, dataFim });
      
      const { data, error } = await supabase.rpc('relatorio_conversao_orcamentos_diarios', {
        p_data_inicio: dataInicio,
        p_data_fim: dataFim
      });

      if (error) {
        console.error('❌ Erro na função relatorio_conversao_orcamentos_diarios:', error);
        throw error;
      }
      
      console.log('✅ Dados de conversão recebidos:', data);
      return data || [];
    } catch (error: any) {
      console.error('❌ Erro ao buscar conversão de orçamentos:', error);
      toast.error('Erro ao carregar relatório de conversão');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const buscarExperienciaFornecedores = useCallback(async () => {
    if (!loading) setLoading(true);

    try {
      const { data, error } = await supabase.rpc('relatorio_experiencia_fornecedor');

      if (error) {
        console.error('Erro ao buscar experiência dos fornecedores:', error);
        toast.error("Erro ao carregar relatório de experiência");
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro inesperado ao buscar experiência dos fornecedores:', error);
      toast.error("Erro inesperado ao carregar relatório");
      return [];
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const buscarHistoricoInscricoesFornecedor = useCallback(async (
    fornecedorId: string,
    dataInicio: string,
    dataFim: string
  ): Promise<any[]> => {
    try {
      setLoading(true);
      console.log('🔍 Buscando histórico de inscrições do fornecedor:', { fornecedorId, dataInicio, dataFim });

      // Converter os limites para UTC para a query
      const inicioUTC = new Date(`${dataInicio}T00:00:00-03:00`).toISOString();
      const fimUTC = new Date(`${dataFim}T23:59:59-03:00`).toISOString();

      const { data, error } = await supabase
        .from('candidaturas_fornecedores')
        .select(`
          id,
          data_candidatura,
          fornecedor_id,
          nome,
          empresa,
          orcamento_id,
          orcamentos!inner (
            codigo_orcamento,
            local,
            necessidade
          )
        `)
        .eq('fornecedor_id', fornecedorId)
        .gte('data_candidatura', inicioUTC)
        .lte('data_candidatura', fimUTC)
        .order('data_candidatura', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar histórico:', error);
        toast.error("Erro ao carregar histórico de inscrições");
        return [];
      }

      // Agrupar por data (convertendo para horário de Brasília)
      const historicoMap = new Map<string, any>();
      
      data?.forEach((candidatura: any) => {
        // Converter UTC para horário de Brasília antes de agrupar
        const dataStr = formatInTimeZone(new Date(candidatura.data_candidatura), BRASILIA_TZ, 'yyyy-MM-dd');
        
        if (!historicoMap.has(dataStr)) {
          historicoMap.set(dataStr, {
            data: dataStr,
            total_inscricoes: 0,
            orcamentos: []
          });
        }
        
        const dia = historicoMap.get(dataStr);
        dia.total_inscricoes++;
        dia.orcamentos.push({
          orcamento_id: candidatura.orcamento_id,
          codigo_orcamento: candidatura.orcamentos?.codigo_orcamento || 'N/A',
          local: candidatura.orcamentos?.local || 'N/A',
          necessidade: candidatura.orcamentos?.necessidade || 'N/A',
          data_candidatura: candidatura.data_candidatura
        });
      });

      // Converter para array e preencher dias sem inscrições
      const resultado: any[] = [];
      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);
      
      for (let d = new Date(fim); d >= inicio; d.setDate(d.getDate() - 1)) {
        const dataStr = format(d, 'yyyy-MM-dd');
        resultado.push(historicoMap.get(dataStr) || {
          data: dataStr,
          total_inscricoes: 0,
          orcamentos: []
        });
      }

      console.log('✅ Histórico carregado:', resultado.length, 'dias');
      return resultado;
    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error);
      toast.error("Erro inesperado ao carregar histórico");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    buscarAcessosUnicos,
    buscarInscricoesFornecedor,
    buscarInscricoesHoje,
    buscarStatusOrcamentos,
    buscarOrcamentosPostados,
    buscarConversaoOrcamentos,
    buscarFornecedores,
    buscarClientesMes,
    buscarLoginsFornecedor,
    buscarPerfilOrcamentos,
    buscarRelatorioFornecedores,
    buscarFornecedoresAtivos,
    buscarExperienciaFornecedores,
    buscarHistoricoInscricoesFornecedor
  };
};
