
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatusAcompanhamento } from '@/hooks/useStatusAcompanhamento';

export interface CandidaturaOrcamento {
  id: string;
  necessidade: string;
  categorias: string[];
  local: string;
  tamanhoImovel: number;
  dataPublicacao: Date;
  dataInicio: Date | string;
  prazoInicioTexto?: string;
  status: 'aberto' | 'fechado';
  quantidadeEmpresas: number;
  dadosContato?: {
    nome: string;
    telefone: string;
    email: string;
  };
  conciergeResponsavel?: {
    nome: string;
  } | null;
  // Dados da candidatura
  candidaturaId: string;
  statusAcompanhamento: StatusAcompanhamento | null;
  observacoesAcompanhamento?: string | null;
  dataCandidatura: Date;
  dataAtualizacao: Date;
  // Horário de visita agendado
  horarioVisitaAgendado?: string | null;
  // Campos operacionais pós-inscrição
  tokenVisita?: string | null;
  linkReuniao?: string | null;
  visitaConfirmadaEm?: string | null;
  preConfirmadoEm?: string | null;
  // Adicionar campos de arquivos
  arquivos?: Array<{
    id: string;
    nome_arquivo: string;
    tipo_arquivo: string;
    tamanho: number;
    url_arquivo: string;
  }>;
  fotos?: Array<{
    id: string;
    nome_arquivo: string;
    tipo_arquivo: string;
    tamanho: number;
    url_arquivo: string;
  }>;
}

export const useMeusCandidaturas = (userId?: string) => {
  const [candidaturas, setCandidaturas] = useState<CandidaturaOrcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarCandidaturas = async () => {
    if (!userId) {
      console.log('❌ useMeusCandidaturas: userId não fornecido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 useMeusCandidaturas: Iniciando busca para userId:', userId);

      // Verificar autenticação
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('👤 useMeusCandidaturas: Usuário autenticado:', user?.id);
      
      if (authError || !user) {
        console.error('❌ useMeusCandidaturas: Erro de autenticação:', authError);
        setError('Erro de autenticação');
        setLoading(false);
        return;
      }

      // Buscar candidaturas com dados do orçamento - INCLUINDO FECHADOS
      console.log('📡 useMeusCandidaturas: Fazendo consulta à tabela candidaturas_fornecedores...');
      
      console.log('🔍 useMeusCandidaturas: Buscando candidaturas com orçamentos e arquivos para user_id:', userId);
      const { data: candidaturasData, error: candidaturasError } = await supabase
        .from('candidaturas_fornecedores')
        .select(`
          id,
          data_candidatura,
          updated_at,
          status_acompanhamento,
          observacoes_acompanhamento,
          token_visita,
          link_reuniao,
          visita_confirmada_em,
          pre_confirmado_em,
          orcamentos (
            id,
            necessidade,
            categorias,
            local,
            tamanho_imovel,
            data_publicacao,
            data_inicio,
            prazo_inicio_texto,
            status,
            dados_contato,
            arquivos_orcamento (
              id,
              nome_arquivo,
              tipo_arquivo,
              tamanho,
              url_arquivo
            )
          ),
          horarios_visita_orcamento!left (
            data_hora
          )
        `)
        .eq('fornecedor_id', userId)
        .order('data_candidatura', { ascending: false });

      console.log('📊 useMeusCandidaturas: Resultado da consulta:', {
        data: candidaturasData,
        error: candidaturasError,
        count: candidaturasData?.length || 0
      });

      if (candidaturasError) {
        console.error('❌ useMeusCandidaturas: Erro ao buscar candidaturas:', candidaturasError);
        setError(`Erro ao carregar candidaturas: ${candidaturasError.message}`);
        setLoading(false);
        return;
      }

      if (!candidaturasData || candidaturasData.length === 0) {
        console.log('ℹ️ useMeusCandidaturas: Nenhuma candidatura encontrada');
        setCandidaturas([]);
        setLoading(false);
        return;
      }

      // Log detalhado das candidaturas encontradas
      candidaturasData.forEach((candidatura, index) => {
        console.log(`📋 Candidatura ${index + 1}:`, {
          id: candidatura.id,
          orcamento_id: candidatura.orcamentos?.id,
          status_orcamento: candidatura.orcamentos?.status,
          necessidade: candidatura.orcamentos?.necessidade?.substring(0, 50) + '...',
          tem_dados_contato: !!candidatura.orcamentos?.dados_contato
        });
      });

      // VERSÃO SIMPLIFICADA - Extrair IDs únicos de orçamentos com logs detalhados
      console.log('🚀 [VERSÃO SIMPLIFICADA] Iniciando processamento');
      const orcamentoIds: string[] = [];
      
      candidaturasData.forEach((candidatura, index) => {
        if (candidatura.orcamentos?.id) {
          orcamentoIds.push(candidatura.orcamentos.id);
          console.log(`✅ [${index + 1}] ID extraído:`, candidatura.orcamentos.id);
        } else {
          console.warn(`⚠️ [${index + 1}] Candidatura sem orçamento:`, candidatura.id);
        }
      });
      
      const orcamentoIdsUnicos = [...new Set(orcamentoIds)];
      console.log('📋 IDs únicos extraídos:', {
        total: orcamentoIdsUnicos.length,
        ids: orcamentoIdsUnicos
      });
      
      // Buscar concierge via função RPC segura (SECURITY DEFINER)
      const conciergesMap = new Map<string, { nome: string }>();

      if (orcamentoIdsUnicos.length > 0) {
        console.log('🔍 Buscando concierges via RPC para', orcamentoIdsUnicos.length, 'orçamentos');
        
        // Buscar todos os concierges em paralelo para melhor performance
        const conciergePromises = orcamentoIdsUnicos.map(async (orcamentoId) => {
          try {
            const { data: conciergeNome, error } = await supabase
              .rpc('get_concierge_para_fornecedor', { p_orcamento_id: orcamentoId });
            
            if (error) {
              console.error(`❌ Erro RPC para orçamento ${orcamentoId}:`, error);
              return { orcamentoId, nome: null };
            }
            
            return { orcamentoId, nome: conciergeNome };
          } catch (err) {
            console.error(`💥 Erro inesperado RPC para orçamento ${orcamentoId}:`, err);
            return { orcamentoId, nome: null };
          }
        });

        const conciergeResults = await Promise.all(conciergePromises);
        
        conciergeResults.forEach(({ orcamentoId, nome }) => {
          if (nome) {
            conciergesMap.set(orcamentoId, { nome });
            console.log(`✅ Concierge mapeado: ${nome} para orçamento ${orcamentoId}`);
          }
        });

        console.log('🎯 MAPEAMENTO FINAL DE CONCIERGES:', {
          total: conciergesMap.size,
          orcamentos: Array.from(conciergesMap.keys()),
          concierges: Array.from(conciergesMap.values())
        });
      } else {
        console.warn('⚠️ Nenhum ID de orçamento para buscar concierges');
      }

      // Buscar contagem de empresas para cada orçamento (reutilizando orcamentoIds)
      console.log('🔢 useMeusCandidaturas: IDs dos orçamentos para contagem:', orcamentoIds);

      let contagemPorOrcamento: Record<string, number> = {};
      
      if (orcamentoIds.length > 0) {
        const { data: contagemEmpresas, error: contagemError } = await supabase
          .from('candidaturas_fornecedores')
          .select('orcamento_id')
          .in('orcamento_id', orcamentoIds);

        if (contagemError) {
          console.error('❌ useMeusCandidaturas: Erro ao contar empresas:', contagemError);
        } else {
          console.log('📊 useMeusCandidaturas: Contagem de empresas:', contagemEmpresas?.length);
          
          // Contar empresas por orçamento
          if (contagemEmpresas) {
            contagemEmpresas.forEach(item => {
              contagemPorOrcamento[item.orcamento_id] = (contagemPorOrcamento[item.orcamento_id] || 0) + 1;
            });
          }
        }
      }

      console.log('📈 useMeusCandidaturas: Contagem por orçamento:', contagemPorOrcamento);

      // Processar candidaturas - INCLUINDO ORÇAMENTOS FECHADOS
      const candidaturasProcessadas: CandidaturaOrcamento[] = candidaturasData
        .filter(candidatura => {
          const temOrcamento = !!candidatura.orcamentos;
          if (!temOrcamento) {
            console.log(`⚠️ Candidatura ${candidatura.id}: orçamento não encontrado - pode ter sido deletado`);
          }
          return temOrcamento;
        })
        .map(candidatura => {
          const orcamento = candidatura.orcamentos as any;
          
          console.log(`🔄 Processando candidatura ${candidatura.id}:`, {
            orcamento_id: orcamento.id,
            status: orcamento.status,
            necessidade: orcamento.necessidade?.substring(0, 30) + '...',
            tem_dados_contato: !!orcamento.dados_contato
          });
          
          
          // Processar arquivos
          const arquivos = Array.isArray(orcamento.arquivos_orcamento) ? orcamento.arquivos_orcamento : [];
          console.log(`📂 useMeusCandidaturas: Orçamento ${orcamento.id}: ${arquivos.length} arquivos brutos`, arquivos);
          
          const documentos = arquivos.filter((arquivo: any) => 
            arquivo.tipo_arquivo !== 'image/jpeg' && 
            arquivo.tipo_arquivo !== 'image/png' && 
            arquivo.tipo_arquivo !== 'image/gif'
          );
          const fotos = arquivos.filter((arquivo: any) => 
            arquivo.tipo_arquivo === 'image/jpeg' || 
            arquivo.tipo_arquivo === 'image/png' || 
            arquivo.tipo_arquivo === 'image/gif'
          );
          
          console.log(`📄 useMeusCandidaturas: Orçamento ${orcamento.id}: ${documentos.length} documentos, ${fotos.length} fotos`);
          
          // Converter dados_contato do tipo Json para o tipo esperado
          let dadosContato: { nome: string; telefone: string; email: string; } | undefined;
          
          if (orcamento.dados_contato && typeof orcamento.dados_contato === 'object') {
            const dados = orcamento.dados_contato as any;
            if (dados.nome && dados.telefone && dados.email) {
              dadosContato = {
                nome: dados.nome,
                telefone: dados.telefone,
                email: dados.email
              };
              console.log(`📞 Dados de contato encontrados para orçamento ${orcamento.id}`);
            }
          }

          // Buscar concierge responsável de forma simples
          const conciergeResponsavel = conciergesMap.get(orcamento.id) || null;
          console.log(`👤 Concierge para orçamento ${orcamento.id}:`, conciergeResponsavel?.nome || 'Nenhum');

          // Processar prazo de início - priorizar texto se disponível
          const prazoInicioTexto = orcamento.prazo_inicio_texto || undefined;
          const dataInicio = prazoInicioTexto 
            ? prazoInicioTexto 
            : (orcamento.data_inicio ? new Date(orcamento.data_inicio) : new Date());

          // Processar horário de visita agendado
          const horarioVisita = Array.isArray((candidatura as any).horarios_visita_orcamento) 
            ? (candidatura as any).horarios_visita_orcamento[0]
            : null;

          return {
            id: orcamento.id,
            necessidade: orcamento.necessidade || '',
            categorias: orcamento.categorias || [],
            local: orcamento.local || '',
            tamanhoImovel: Number(orcamento.tamanho_imovel) || 0,
            dataPublicacao: new Date(orcamento.data_publicacao),
            dataInicio,
            prazoInicioTexto,
            status: orcamento.status as 'aberto' | 'fechado',
            quantidadeEmpresas: contagemPorOrcamento[orcamento.id] || 0,
            dadosContato,
            conciergeResponsavel,
            candidaturaId: candidatura.id,
            statusAcompanhamento: candidatura.status_acompanhamento as StatusAcompanhamento | null,
            observacoesAcompanhamento: candidatura.observacoes_acompanhamento,
            dataCandidatura: new Date(candidatura.data_candidatura),
            dataAtualizacao: new Date((candidatura as any).updated_at || candidatura.data_candidatura),
            horarioVisitaAgendado: horarioVisita?.data_hora || null,
            tokenVisita: (candidatura as any).token_visita || null,
            linkReuniao: (candidatura as any).link_reuniao || null,
            visitaConfirmadaEm: (candidatura as any).visita_confirmada_em || null,
            preConfirmadoEm: (candidatura as any).pre_confirmado_em || null,
            arquivos: documentos,
            fotos: fotos
          };
        });

      console.log('✅ useMeusCandidaturas: Processamento concluído!');
      console.log('📊 Total de candidaturas processadas:', candidaturasProcessadas.length);
      
      // Log do status de cada candidatura processada
      candidaturasProcessadas.forEach((candidatura, index) => {
        console.log(`📋 Candidatura processada ${index + 1}:`, {
          id: candidatura.id.slice(-8),
          status: candidatura.status,
          temDadosContato: !!candidatura.dadosContato,
          necessidade: candidatura.necessidade.substring(0, 30) + '...'
        });
      });

      // Separar por status para log detalhado
      const abertas = candidaturasProcessadas.filter(c => c.status === 'aberto');
      const fechadas = candidaturasProcessadas.filter(c => c.status === 'fechado');
      
      console.log('📊 useMeusCandidaturas: Resumo final por status:', {
        total: candidaturasProcessadas.length,
        abertas: abertas.length,
        fechadas: fechadas.length
      });
      
      setCandidaturas(candidaturasProcessadas);
      setLoading(false);

    } catch (error) {
      console.error('💥 useMeusCandidaturas: Erro geral:', error);
      setError(`Erro inesperado ao carregar candidaturas: ${error}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🚀 useMeusCandidaturas: Hook iniciado/atualizado - userId:', userId);
    carregarCandidaturas();
  }, [userId]);

  // Atualizar status localmente (otimista) sem refresh
  const atualizarStatusLocal = (candidaturaId: string, novoStatus: StatusAcompanhamento) => {
    setCandidaturas(prev => 
      prev.map(c => 
        c.candidaturaId === candidaturaId 
          ? { ...c, statusAcompanhamento: novoStatus }
          : c
      )
    );
  };

  // Recarregar silenciosamente (sem loading spinner)
  const recarregarSilencioso = async () => {
    if (!userId) return;
    
    try {
      // Não seta loading = true para não desmontar a lista
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return;

      const { data: candidaturasData } = await supabase
        .from('candidaturas_fornecedores')
        .select(`
          id,
          data_candidatura,
          status_acompanhamento,
          observacoes_acompanhamento,
          orcamentos (
            id,
            necessidade,
            categorias,
            local,
            tamanho_imovel,
            data_publicacao,
            data_inicio,
            prazo_inicio_texto,
            status,
            dados_contato,
            arquivos_orcamento (
              id,
              nome_arquivo,
              tipo_arquivo,
              tamanho,
              url_arquivo
            )
          )
        `)
        .eq('fornecedor_id', userId)
        .order('data_candidatura', { ascending: false });

      if (candidaturasData) {
        // Atualiza apenas os status sem reprocessar tudo
        setCandidaturas(prev => {
          return prev.map(c => {
            const updated = candidaturasData.find(cd => cd.id === c.candidaturaId);
            if (updated) {
              return {
                ...c,
                statusAcompanhamento: updated.status_acompanhamento as StatusAcompanhamento | null,
                observacoesAcompanhamento: updated.observacoes_acompanhamento
              };
            }
            return c;
          });
        });
      }
    } catch (error) {
      console.error('Erro no refresh silencioso:', error);
    }
  };

  return {
    candidaturas,
    loading,
    error,
    recarregar: carregarCandidaturas,
    atualizarStatusLocal,
    recarregarSilencioso
  };
};
