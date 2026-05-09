import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { OrcamentoCRMComChecklist, HistoricoMovimentacao, EtapaCRM, StatusContato, MotivoPerda, MarcarPerdidoPayload, CongelarOrcamentoPayload } from '@/types/crm';
import { Profile } from '@/types/supabase';
import { isFullAccess } from '@/utils/accessControl';

export const useCRMOrcamentos = (profile: Profile | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orcamentos = [], isLoading, refetch } = useQuery({
    queryKey: ['crm-orcamentos', profile?.id, profile?.tipo_usuario],
    queryFn: async () => {
      console.log('🔄 Carregando orçamentos CRM...', {
        profileId: profile?.id,
        tipo: profile?.tipo_usuario
      });

      let query = supabase
        .from('view_orcamentos_crm_com_checklist')
        .select('*')
        // Excluir etapas SDR — lead só entra no CRM após 1 visita/reunião realizada
        .not('etapa_crm', 'in', '(orcamento_postado,contato_agendamento)')
        .not('etapa_crm', 'is', null);

      // Admin/master bypass: full access, no per-user filter applied
      if (!isFullAccess(profile?.tipo_usuario ?? '') && profile?.tipo_usuario === 'gestor_conta' && profile?.id) {
        query = query.eq('concierge_responsavel_id', profile.id);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erro ao carregar orçamentos CRM:', error);
        throw error;
      }

      return (data || []) as unknown as OrcamentoCRMComChecklist[];
    },
    staleTime: 0, // Sempre considerar dados antigos para forçar atualização
    refetchOnMount: 'always', // Sempre recarregar ao montar
    refetchOnWindowFocus: true, // Atualizar ao focar a janela
  });

  const buscarHistorico = async (orcamentoId: string) => {
    const { data, error } = await supabase
      .from('orcamentos_crm_historico')
      .select('*')
      .eq('orcamento_id', orcamentoId)
      .order('data_movimentacao', { ascending: false });

    if (error) throw error;
    return data as HistoricoMovimentacao[];
  };

  const buscarFornecedoresInscritos = async (orcamentoId: string) => {
    const { data: candidaturas, error } = await supabase
      .from('candidaturas_fornecedores')
      .select('id, nome, empresa, email, telefone, data_candidatura, proposta_enviada, status_acompanhamento, status_acompanhamento_concierge, link_reuniao, token_visita, visita_confirmada_em, acessos_reuniao')
      .eq('orcamento_id', orcamentoId)
      .is('data_desistencia', null)
      .order('data_candidatura', { ascending: false });

    if (error) {
      console.error('Erro ao buscar fornecedores inscritos:', error);
      return [];
    }

    if (!candidaturas || candidaturas.length === 0) return [];

    // Buscar arquivos de proposta para cada candidatura
    const candidaturaIds = candidaturas.map(c => c.id);
    const { data: arquivos } = await supabase
      .from('propostas_arquivos')
      .select('id, candidatura_id, nome_arquivo, caminho_storage, tipo_arquivo, tamanho')
      .in('candidatura_id', candidaturaIds);

    // Mapear arquivos para cada fornecedor
    return candidaturas.map(cand => ({
      ...cand,
      arquivos_proposta: arquivos?.filter(a => a.candidatura_id === cand.id) || []
    }));
  };

  const moverEtapa = useMutation({
    mutationFn: async ({ 
      orcamentoId, 
      novaEtapa, 
      observacao 
    }: { 
      orcamentoId: string; 
      novaEtapa: EtapaCRM; 
      observacao?: string 
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      // Buscar etapa atual antes de mover
      const { data: tracking } = await supabase
        .from('orcamentos_crm_tracking')
        .select('etapa_crm')
        .eq('orcamento_id', orcamentoId)
        .single();

      // Se está saindo de uma etapa arquivada, limpar campos de conclusão
      const etapaAtual = tracking?.etapa_crm;
      if (etapaAtual === 'ganho' || etapaAtual === 'perdido') {
        await supabase
          .from('orcamentos_crm_tracking')
          .update({
            data_conclusao: null,
            motivo_perda_id: null,
            justificativa_perda: null
          })
          .eq('orcamento_id', orcamentoId);
      }

      // Mover para nova etapa via RPC
      const { data, error } = await supabase.rpc('mover_orcamento_etapa', {
        p_orcamento_id: orcamentoId,
        p_nova_etapa: novaEtapa,
        p_usuario_id: user.user.id,
        p_observacao: observacao || null
      });

      if (error) throw error;

      // Verificar se a RPC retornou sucesso
      const resultado = data as any;
      if (!resultado || resultado.success !== true) {
        throw new Error(resultado?.message || 'Erro ao mover orçamento');
      }

      return data;
    },
    onSuccess: async () => {
      // Forçar refetch imediato ao invés de apenas invalidar
      await queryClient.refetchQueries({ queryKey: ['crm-orcamentos'] });
      toast({
        title: "Etapa atualizada",
        description: "Orçamento movido com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao mover orçamento",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const atualizarStatusContato = useMutation({
    mutationFn: async ({
      orcamentoId,
      novoStatus
    }: {
      orcamentoId: string;
      novoStatus: StatusContato;
    }) => {
      const { error } = await supabase
        .from('orcamentos_crm_tracking')
        .update({ status_contato: novoStatus })
        .eq('orcamento_id', orcamentoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-orcamentos'] });
    }
  });

  const atualizarObservacoes = useMutation({
    mutationFn: async ({
      orcamentoId,
      observacoes
    }: {
      orcamentoId: string;
      observacoes: string;
    }) => {
      const { error } = await supabase
        .from('orcamentos_crm_tracking')
        .update({ observacoes_internas: observacoes })
        .eq('orcamento_id', orcamentoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-orcamentos'] });
      toast({
        title: "Observações salvas",
      });
    }
  });

  const registrarFeedback = useMutation({
    mutationFn: async ({
      orcamentoId,
      nota,
      comentario
    }: {
      orcamentoId: string;
      nota: number;
      comentario?: string;
    }) => {
      const { error } = await supabase
        .from('orcamentos_crm_tracking')
        .update({
          feedback_cliente_nota: nota,
          feedback_cliente_comentario: comentario || null
        })
        .eq('orcamento_id', orcamentoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-orcamentos'] });
      toast({
        title: "Feedback registrado",
      });
    }
  });

  const atualizarValorLead = useMutation({
    mutationFn: async ({
      orcamentoId,
      valor
    }: {
      orcamentoId: string;
      valor: number | null;
    }) => {
      const { error } = await supabase
        .from('orcamentos_crm_tracking')
        .update({ 
          valor_lead_estimado: valor,
          updated_at: new Date().toISOString()
        })
        .eq('orcamento_id', orcamentoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-orcamentos'] });
      toast({
        title: "Valor do lead atualizado",
      });
    }
  });

  const moverEtapaEmMassa = useMutation({
    mutationFn: async ({
      orcamentosIds,
      novaEtapa,
      observacao
    }: {
      orcamentosIds: string[];
      novaEtapa: EtapaCRM;
      observacao?: string;
    }) => {
      console.log(`🔄 Movendo ${orcamentosIds.length} orçamentos para ${novaEtapa}`);
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const BATCH_SIZE = 10;
      const resultados = {
        sucesso: 0,
        erro: 0,
        erros: [] as Array<{ id: string; mensagem: string }>
      };

      for (let i = 0; i < orcamentosIds.length; i += BATCH_SIZE) {
        const lote = orcamentosIds.slice(i, i + BATCH_SIZE);
        
        const promessas = lote.map(async (id) => {
          try {
            const { data, error } = await supabase.rpc('mover_orcamento_etapa', {
              p_orcamento_id: id,
              p_nova_etapa: novaEtapa,
              p_usuario_id: user.user.id,
              p_observacao: observacao || null
            });

            if (error) throw error;

            // Verificar se a RPC retornou sucesso
            const resultado = data as any;
            if (!resultado || resultado.success !== true) {
              throw new Error(resultado?.message || 'Erro ao mover orçamento');
            }

            resultados.sucesso++;
          } catch (error: any) {
            console.error(`❌ Erro ao mover orçamento ${id}:`, error);
            resultados.erro++;
            resultados.erros.push({
              id,
              mensagem: error.message || 'Erro desconhecido'
            });
          }
        });

        await Promise.all(promessas);
      }

      return resultados;
    },
    onSuccess: (resultados) => {
      queryClient.invalidateQueries({ queryKey: ['crm-orcamentos'] });
      
      if (resultados.erro === 0) {
        toast({
          title: "✅ Movimentação concluída",
          description: `${resultados.sucesso} orçamento(s) movido(s) com sucesso!`,
        });
      } else {
        toast({
          title: "⚠️ Movimentação parcial",
          description: `${resultados.sucesso} movidos com sucesso, ${resultados.erro} com erro.`,
          variant: "destructive",
        });
        console.log('📋 Erros detalhados:', resultados.erros);
      }
    },
    onError: (error) => {
      console.error('❌ Erro na movimentação em massa:', error);
      toast({
        title: "Erro ao mover orçamentos",
        description: "Ocorreu um erro durante a movimentação em massa",
        variant: "destructive",
      });
    }
  });

  // Query para motivos de perda
  const { data: motivosPerda = [] } = useQuery({
    queryKey: ['motivos-perda-crm'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('motivos_perda_crm')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as MotivoPerda[];
    }
  });

  // Mutation para marcar como ganho
  const marcarComoGanho = useMutation({
    mutationFn: async ({ orcamentoId }: { orcamentoId: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      // Atualizar orçamento
      const { error } = await supabase
        .from('orcamentos_crm_tracking')
        .update({
          etapa_crm: 'ganho',
          data_conclusao: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('orcamento_id', orcamentoId);

      if (error) throw error;

      // Registrar no histórico via RPC
      await supabase.rpc('mover_orcamento_etapa', {
        p_orcamento_id: orcamentoId,
        p_nova_etapa: 'ganho' as EtapaCRM,
        p_usuario_id: user.user.id,
        p_observacao: 'Orçamento marcado como ganho'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-orcamentos'] });
      toast({
        title: "🎉 Orçamento marcado como GANHO!",
        description: "O orçamento foi movido para a coluna de ganhos",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao marcar como ganho",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation para marcar como perdido
  const marcarComoPerdido = useMutation({
    mutationFn: async ({ orcamentoId, motivoPerdaId, justificativa }: MarcarPerdidoPayload) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      // Atualizar orçamento
      const { error } = await supabase
        .from('orcamentos_crm_tracking')
        .update({
          etapa_crm: 'perdido',
          motivo_perda_id: motivoPerdaId,
          justificativa_perda: justificativa || null,
          data_conclusao: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('orcamento_id', orcamentoId);

      if (error) throw error;

      // Registrar no histórico via RPC
      await supabase.rpc('mover_orcamento_etapa', {
        p_orcamento_id: orcamentoId,
        p_nova_etapa: 'perdido' as EtapaCRM,
        p_usuario_id: user.user.id,
        p_observacao: `Marcado como perdido: ${justificativa || 'Sem justificativa'}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-orcamentos'] });
      toast({
        title: "Orçamento marcado como PERDIDO",
        description: "O orçamento foi movido para a coluna de perdidos",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao marcar como perdido",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation para apropriar orçamento
  const apropriarOrcamento = useMutation({
    mutationFn: async ({
      orcamentoId,
      gestorId
    }: {
      orcamentoId: string;
      gestorId: string | null;
    }) => {
      // 1. Atualizar a tabela de tracking do CRM (usada pelo CRM Kanban)
      const { error: errorTracking } = await supabase
        .from('orcamentos_crm_tracking')
        .update({ 
          concierge_responsavel_id: gestorId,
          updated_at: new Date().toISOString()
        })
        .eq('orcamento_id', orcamentoId);

      if (errorTracking) throw errorTracking;

      // 2. Sincronizar com a tabela principal de orçamentos (usada por Gerenciar Orçamentos)
      const { error: errorOrcamento } = await supabase
        .from('orcamentos')
        .update({ 
          gestor_conta_id: gestorId,
          updated_at: new Date().toISOString()
        })
        .eq('id', orcamentoId);

      if (errorOrcamento) throw errorOrcamento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-orcamentos'] });
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      toast({
        title: "Orçamento apropriado",
        description: "Gestor responsável atualizado com sucesso em todas as telas",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao apropriar orçamento",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return {
    orcamentos,
    isLoading,
    refetch,
    buscarHistorico,
    buscarFornecedoresInscritos,
    moverEtapa: moverEtapa.mutate,
    atualizarStatusContato: (orcamentoId: string, novoStatus: StatusContato) => 
      atualizarStatusContato.mutate({ orcamentoId, novoStatus }),
    atualizarObservacoes: (orcamentoId: string, observacoes: string) => 
      atualizarObservacoes.mutate({ orcamentoId, observacoes }),
    registrarFeedback: registrarFeedback.mutate,
    moverEtapaEmMassa: moverEtapaEmMassa.mutate,
    isMovendoEmMassa: moverEtapaEmMassa.isPending,
    atualizarValorLead: (orcamentoId: string, valor: number | null) =>
      atualizarValorLead.mutate({ orcamentoId, valor }),
    motivosPerda,
    marcarComoGanho: marcarComoGanho.mutate,
    marcarComoPerdido: marcarComoPerdido.mutate,
    isProcessando: marcarComoGanho.isPending || marcarComoPerdido.isPending,
    apropriarOrcamento: apropriarOrcamento.mutate,
    isApropriando: apropriarOrcamento.isPending,
  };
};

// Hook separado para congelar/descongelar orçamentos
export const useCongelarOrcamento = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const congelarOrcamento = useMutation({
    mutationFn: async ({ 
      orcamentoId, 
      dataReativacao, 
      motivo,
      tarefa 
    }: CongelarOrcamentoPayload) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", user.user.id)
        .single();

      // 1. Congelar orçamento
      const { error: errorCongelar } = await supabase
        .from('orcamentos_crm_tracking')
        .update({
          congelado: true,
          data_congelamento: new Date().toISOString(),
          data_reativacao_prevista: dataReativacao,
          motivo_congelamento: motivo || null,
          updated_at: new Date().toISOString()
        })
        .eq('orcamento_id', orcamentoId);

      if (errorCongelar) throw errorCongelar;

      // 2. Criar tarefa de reativação obrigatória
      const { error: errorTarefa } = await supabase
        .from('crm_orcamentos_tarefas')
        .insert({
          orcamento_id: orcamentoId,
          titulo: tarefa.titulo,
          descricao: tarefa.descricao || 'Lead congelado aguardando retorno do cliente',
          data_vencimento: dataReativacao,
          criado_por_id: user.user.id,
          criado_por_nome: profile?.nome || user.user.email
        });

      if (errorTarefa) throw errorTarefa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-orcamentos'] });
      toast({ 
        title: "❄️ Lead congelado", 
        description: "Tarefa de reativação criada com sucesso" 
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao congelar lead",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const descongelarOrcamento = useMutation({
    mutationFn: async ({ orcamentoId }: { orcamentoId: string }) => {
      const { error } = await supabase
        .from('orcamentos_crm_tracking')
        .update({
          congelado: false,
          data_congelamento: null,
          data_reativacao_prevista: null,
          motivo_congelamento: null,
          updated_at: new Date().toISOString()
        })
        .eq('orcamento_id', orcamentoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-orcamentos'] });
      toast({ 
        title: "🔥 Lead reativado", 
        description: "O lead voltou ao fluxo normal" 
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao reativar lead",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return {
    congelarOrcamento: congelarOrcamento.mutate,
    descongelarOrcamento: descongelarOrcamento.mutate,
    isCongelando: congelarOrcamento.isPending,
    isDescongelando: descongelarOrcamento.isPending,
  };
};
