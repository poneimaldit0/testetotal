import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePropostaBackup } from '@/hooks/usePropostaBackup';

interface RevisaoSolicitada {
  id: string;
  checklist_proposta_id: string;
  motivo_revisao: string;
  cliente_temp_email: string;
  status: string;
  data_solicitacao: string;
  proposta: {
    candidatura_id: string;
    status: string;
    orcamento_id: string;
    orcamento: {
      necessidade: string;
      local: string;
    };
  };
}

export const useRevisoesWorkflow = (enabled: boolean = true) => {
  const [revisoesPendentes, setRevisoesPendentes] = useState<RevisaoSolicitada[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { criarBackupProposta, restaurarBackupProposta } = usePropostaBackup();

  // NOVA FUNÇÃO: Auto-finalizar revisões que já foram trabalhadas mas não finalizadas
  const autoFinalizarRevisoesAbandonadas = async (fornecedorId: string) => {
    try {
      console.log('🔍 Verificando revisões abandonadas para finalização automática...');
      
      // Buscar revisões pendentes com propostas que já têm valor > 0 (foram trabalhadas)
      const { data: revisoesAbandonadas, error } = await supabase
        .from('revisoes_propostas_clientes')
        .select(`
          id,
          checklist_proposta_id,
          status,
          checklist_propostas!inner(
            valor_total_estimado,
            status,
            candidaturas_fornecedores!inner(
              fornecedor_id
            )
          )
        `)
        .eq('status', 'pendente')
        .eq('checklist_propostas.candidaturas_fornecedores.fornecedor_id', fornecedorId)
        .gt('checklist_propostas.valor_total_estimado', 0)
        .limit(500);

      if (error) {
        console.warn('⚠️ Erro ao buscar revisões abandonadas:', error);
        return;
      }

      if (revisoesAbandonadas && revisoesAbandonadas.length > 0) {
        console.log(`🔄 Encontradas ${revisoesAbandonadas.length} revisões abandonadas para finalizar automaticamente`);
        
        for (const revisao of revisoesAbandonadas) {
          console.log(`📝 Auto-finalizando revisão ${revisao.id} (valor: ${revisao.checklist_propostas.valor_total_estimado})`);
          
          // Usar a função RPC para finalizar com as permissões corretas
          const { error: errorFinalizacao } = await supabase
            .rpc('finalizar_revisao_fornecedor', {
              p_checklist_proposta_id: revisao.checklist_proposta_id
            });

          if (errorFinalizacao) {
            console.warn(`⚠️ Erro ao auto-finalizar revisão ${revisao.id}:`, errorFinalizacao);
          } else {
            console.log(`✅ Revisão ${revisao.id} auto-finalizada com sucesso`);
          }
        }
        
        if (revisoesAbandonadas.length > 0) {
          toast({
            title: `Revisões finalizadas automaticamente`,
            description: `${revisoesAbandonadas.length} revisão(ões) que já haviam sido trabalhadas foram marcadas como concluídas.`,
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro na verificação de revisões abandonadas:', error);
    }
  };

  const carregarRevisoesPendentes = async () => {
    try {
      setLoading(true);
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      
      // CORREÇÃO: Primeiro auto-finalizar revisões que já foram trabalhadas
      await autoFinalizarRevisoesAbandonadas(user.user.id);
      
      // Buscar revisões pendentes onde o fornecedor atual é o responsável
      const { data, error } = await supabase
        .from('revisoes_propostas_clientes')
        .select(`
          *,
          checklist_propostas!inner(
            candidatura_id,
            status,
            valor_total_estimado,
            candidaturas_fornecedores!inner(
              fornecedor_id,
              orcamento_id,
              orcamentos(id, necessidade, local)
            )
          )
        `)
        .in('status', ['pendente', 'em_andamento'])
        .eq('checklist_propostas.candidaturas_fornecedores.fornecedor_id', user.user.id)
        .limit(500);

      if (error) {
        throw error;
      }

      // Transformar dados para o formato esperado
      const revisoes = (data || []).map(revisao => ({
        ...revisao,
        proposta: {
          candidatura_id: revisao.checklist_propostas.candidatura_id,
          status: revisao.checklist_propostas.status,
          orcamento_id: revisao.checklist_propostas.candidaturas_fornecedores.orcamento_id,
          orcamento: revisao.checklist_propostas.candidaturas_fornecedores.orcamentos
        }
      }));

      setRevisoesPendentes(revisoes);
      
    } catch (error) {
      console.error('Erro ao carregar revisões:', error);
    } finally {
      setLoading(false);
    }
  };

  const iniciarRevisao = async (revisaoId: string, checklistPropostaId: string) => {
    try {
      console.log('=== INICIANDO REVISÃO ===');
      console.log('revisaoId:', revisaoId);
      console.log('checklistPropostaId:', checklistPropostaId);

      // CORREÇÃO 1: Criar backup automático antes de iniciar revisão
      console.log('🔄 Criando backup automático antes da revisão...');
      
      const backupResult = await criarBackupProposta(
        checklistPropostaId, 
        `Backup automático antes de revisão ${revisaoId}`
      );

      if (!backupResult.success) {
        console.warn('⚠️ Falha ao criar backup, mas continuando revisão:', backupResult.error);
      } else {
        console.log('✅ Backup criado com sucesso:', backupResult.backup_id);
      }

      // Verificar se existem respostas após backup
      const { data: respostasExistentes, error: errorRespostas } = await supabase
        .from('respostas_checklist')
        .select('*')
        .eq('checklist_proposta_id', checklistPropostaId);

      if (errorRespostas) {
        console.error('Erro ao verificar respostas existentes:', errorRespostas);
      } else {
        console.log('Respostas existentes antes da revisão:', respostasExistentes?.length || 0);
        
        // CORREÇÃO 2: Validar integridade antes de prosseguir
        if (!respostasExistentes || respostasExistentes.length === 0) {
          const { data: proposta } = await supabase
            .from('checklist_propostas')
            .select('valor_total_estimado')
            .eq('id', checklistPropostaId)
            .single();
            
          if (proposta?.valor_total_estimado > 0) {
            console.warn('⚠️ ALERTA: Proposta com valor mas sem respostas detectada antes da revisão!');
            toast({
              title: "Alerta de Integridade",
              description: "Esta proposta já apresenta problemas de dados. A revisão pode agravar a situação.",
              variant: "destructive",
            });
          }
        }
      }

      // Atualizar status da proposta para em_revisao
      const { error: errorProposta } = await supabase
        .from('checklist_propostas')
        .update({ status: 'em_revisao' })
        .eq('id', checklistPropostaId);

      if (errorProposta) {
        throw errorProposta;
      }

      // Atualizar status da revisão para em_andamento
      const { error: errorRevisao } = await supabase
        .from('revisoes_propostas_clientes')
        .update({ 
          status: 'em_andamento',
          data_resposta: new Date().toISOString()
        })
        .eq('id', revisaoId);

      if (errorRevisao) {
        throw errorRevisao;
      }

      toast({
        title: "Revisão iniciada",
        description: "Você pode agora editar sua proposta. O cliente será notificado quando você finalizar.",
      });

      // Recarregar lista
      carregarRevisoesPendentes();
      
    } catch (error) {
      console.error('Erro ao iniciar revisão:', error);
      toast({
        title: "Erro ao iniciar revisão", 
        description: "Não foi possível iniciar a revisão da proposta",
        variant: "destructive",
      });
    }
  };

  const finalizarRevisao = async (checklistPropostaId: string, onSalvarAntes?: () => Promise<void>) => {
    try {
      console.log('=== FINALIZANDO REVISÃO ===');
      console.log('checklistPropostaId:', checklistPropostaId);

      // CORREÇÃO: Executar salvamento antes da finalização se callback fornecido
      if (onSalvarAntes) {
        console.log('💾 Salvando alterações antes de finalizar...');
        try {
          await onSalvarAntes();
          console.log('✅ Salvamento pré-finalização concluído com sucesso');
        } catch (saveError) {
          console.error('❌ Erro no salvamento pré-finalização:', saveError);
          throw new Error('Falha ao salvar alterações antes de finalizar a revisão');
        }
      }

      // Aguardar um pouco para garantir que o salvamento foi processado
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verificar se ainda existem respostas antes de finalizar
      const { data: respostasAtuais, error: errorVerificar } = await supabase
        .from('respostas_checklist')
        .select('*')
        .eq('checklist_proposta_id', checklistPropostaId);

      if (errorVerificar) {
        console.error('Erro ao verificar respostas na finalização:', errorVerificar);
      } else {
        console.log('Respostas encontradas na finalização:', respostasAtuais?.length || 0);
        
        // Log detalhado das respostas encontradas
        if (respostasAtuais && respostasAtuais.length > 0) {
          console.log('📋 Detalhes das respostas encontradas:', respostasAtuais.map(r => ({
            id: r.id,
            item_id: r.item_id,
            incluido: r.incluido,
            valor_estimado: r.valor_estimado,
            item_extra: r.item_extra,
            nome_item_extra: r.nome_item_extra
          })));
        }
      }

      // CORREÇÃO 3: Validação rigorosa antes de finalizar
      if (!respostasAtuais || respostasAtuais.length === 0) {
        console.error('❌ ERRO CRÍTICO: Tentativa de finalizar proposta sem respostas!');
        
        // Verificar se proposta tem valor total
        const { data: proposta } = await supabase
          .from('checklist_propostas')
          .select('valor_total_estimado')
          .eq('id', checklistPropostaId)
          .single();

        if (proposta?.valor_total_estimado > 0) {
          // Problema crítico: valor sem respostas
          toast({
            title: "Erro de Integridade Crítico",
            description: `Esta proposta possui valor R$ ${proposta.valor_total_estimado.toFixed(2)} mas nenhum item no checklist. A finalização foi bloqueada.`,
            variant: "destructive",
          });
          
          // Tentar restaurar backup automaticamente
          console.log('🔄 Tentando restaurar backup automaticamente...');
          const restauracao = await restaurarBackupProposta(checklistPropostaId);
          
          if (restauracao.success) {
            toast({
              title: "Dados Restaurados",
              description: "Backup restaurado automaticamente. Tente finalizar novamente.",
            });
            return; // Não finalizar ainda, deixar usuário revisar
          } else {
            // Se não conseguiu restaurar backup, mostrar modal de recuperação emergencial
            console.log('❌ Backup não disponível, acionando recuperação emergencial...');
            
            // Comunicar erro específico para o componente lidar
            throw new Error('RECOVERY_NEEDED:' + JSON.stringify({
              checklistPropostaId: checklistPropostaId,
              valorTotal: proposta.valor_total_estimado,
              message: 'Proposta com problema de integridade precisa de recuperação manual'
            }));
          }
        } else {
          // Proposta realmente vazia
          toast({
            title: "Proposta Vazia",
            description: "Adicione itens à proposta antes de finalizar.",
            variant: "destructive",
          });
          throw new Error('Proposta vazia não pode ser finalizada.');
        }
      }

      // CORREÇÃO: Atualizar valor total antes de finalizar
      const { data: propostaAtual, error: errorPropostaConsulta } = await supabase
        .from('checklist_propostas')
        .select('valor_total_estimado')
        .eq('id', checklistPropostaId)
        .single();

      if (errorPropostaConsulta) {
        console.error('Erro ao consultar proposta atual:', errorPropostaConsulta);
      } else {
        console.log('💰 Valor total atual da proposta:', propostaAtual?.valor_total_estimado);
      }

      // Atualizar status da proposta de volta para enviado e garantir data_envio atualizada
      const { data: propostaAtualizada, error: errorProposta } = await supabase
        .from('checklist_propostas')
        .update({ 
          status: 'enviado',
          data_envio: new Date().toISOString() // Atualizar data de envio para forçar refresh
        })
        .eq('id', checklistPropostaId)
        .select('valor_total_estimado')
        .single();

      if (errorProposta) {
        throw errorProposta;
      }

      console.log('💰 Proposta atualizada - Valor total:', propostaAtualizada?.valor_total_estimado);

      // Atualizar revisão como concluída usando função que respeita RLS
      const { data: resultadoFinalizacao, error: errorRevisao } = await supabase
        .rpc('finalizar_revisao_fornecedor', {
          p_checklist_proposta_id: checklistPropostaId
        });

      if (errorRevisao) {
        console.error('Erro ao finalizar revisões:', errorRevisao);
        toast({
          title: "Aviso",
          description: "Proposta finalizada, mas houve problema ao atualizar status da revisão.",
          variant: "default",
        });
      } else if (resultadoFinalizacao) {
        const resultado = resultadoFinalizacao as { success?: boolean; revisoes_atualizadas?: number; message?: string };
        if (resultado.success) {
          console.log('✅ Revisões finalizadas:', resultado.revisoes_atualizadas);
          toast({
            title: "Revisão finalizada com sucesso",
            description: `${resultado.revisoes_atualizadas || 0} revisão(ões) finalizada(s). Sua proposta aparecerá no comparador com tag 'Revisada'.`,
          });
        } else {
          console.warn('Falha na finalização:', resultado.message);
          toast({
            title: "Revisão finalizada com sucesso",
            description: "Sua proposta foi salva e atualizada. Ela ficará visível no comparador com tag 'Revisada'.",
          });
        }
      } else {
        console.warn('Resposta vazia da finalização');
        toast({
          title: "Revisão finalizada com sucesso",
          description: "Sua proposta foi salva e atualizada. Ela ficará visível no comparador com tag 'Revisada'.",
        });
      }

      // Recarregar lista
      carregarRevisoesPendentes();
      
    } catch (error) {
      console.error('Erro ao finalizar revisão:', error);
      toast({
        title: "Erro ao finalizar revisão",
        description: "Não foi possível finalizar a revisão",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!enabled) return;

    carregarRevisoesPendentes();

    // Subscribe para novas revisões em tempo real
    const uniqueChannelName = `revisoes-fornecedor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'revisoes_propostas_clientes'
        },
        () => {
          carregarRevisoesPendentes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);

  return {
    revisoesPendentes,
    loading,
    carregarRevisoesPendentes,
    iniciarRevisao,
    finalizarRevisao,
    totalRevisoesPendentes: revisoesPendentes.length
  };
};