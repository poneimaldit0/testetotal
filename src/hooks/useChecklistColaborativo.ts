import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChecklistColaborativo {
  id: string;
  orcamento_id: string;
  status: string;
  data_inicio: string;
  data_primeiro_preenchimento?: string;
  primeiro_contribuidor_id?: string;
  prazo_contribuicao: string;
  data_consolidacao?: string;
  total_fornecedores: number;
  contribuicoes_recebidas: number;
}

export interface ContribuicaoChecklistItem {
  id: string;
  checklist_colaborativo_id: string;
  fornecedor_id: string;
  item_id: string;
  marcado: boolean;
  observacoes?: string;
  data_contribuicao: string;
}

export const useChecklistColaborativo = (orcamentoId?: string) => {
  const [checklistColaborativo, setChecklistColaborativo] = useState<ChecklistColaborativo | null>(null);
  const [minhasContribuicoes, setMinhasContribuicoes] = useState<ContribuicaoChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [tempoRestante, setTempoRestante] = useState<number | null>(null);
  const { toast } = useToast();
  const isConsolidatingRef = useRef(false);
  
  // Refs para controlar canais ativos e evitar subscrições duplicadas
  const activeChannelsRef = useRef<{
    checklistChannel?: any;
    contribuicoesChannel?: any;
    currentChecklistId?: string;
    isSubscribed?: boolean;
  }>({});

  const carregarChecklistColaborativo = useCallback(async () => {
    if (!orcamentoId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('checklist_colaborativo')
        .select('*')
        .eq('orcamento_id', orcamentoId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Se não encontrou checklist colaborativo, verificar se deveria existir
      if (!data) {
        // Verificar quantos candidatos existem para este orçamento
        const { data: candidatos, error: candidatosError } = await supabase
          .from('candidaturas_fornecedores')
          .select('id, fornecedor_id')
          .eq('orcamento_id', orcamentoId)
          .is('data_desistencia', null);

        if (!candidatosError && candidatos && candidatos.length >= 1) {
          // Criar checklist colaborativo automaticamente
          console.log('🔄 Criando checklist colaborativo automaticamente para orçamento:', orcamentoId);
          
          const { data: novoChecklist, error: criarError } = await supabase
            .from('checklist_colaborativo')
            .insert({
              orcamento_id: orcamentoId,
              status: 'fase_colaborativa',  // Usar status válido
              total_fornecedores: candidatos.length,
              contribuicoes_recebidas: 0
            })
            .select()
            .single();

          if (!criarError && novoChecklist) {
            setChecklistColaborativo(novoChecklist);
            
            toast({
              title: "Checklist Colaborativo Ativo",
              description: "O checklist de obra colaborativo foi ativado para este orçamento",
            });
            return;
          }
        }
      }

      setChecklistColaborativo(data);
      
      // Calcular tempo restante se timer estiver ativo
      if (data?.prazo_contribuicao) {
        const agora = new Date();
        const limite = new Date(data.prazo_contribuicao);
        const diferenca = limite.getTime() - agora.getTime();
        setTempoRestante(Math.max(0, diferenca));
      }

      // Detectar se o status mudou para consolidado
      if (data?.status === 'checklist_definido' && checklistColaborativo?.status !== 'checklist_definido') {
        console.log('✅ Checklist foi consolidado automaticamente!');
        toast({
          title: "Checklist Consolidado",
          description: "A fase colaborativa foi finalizada. Você pode prosseguir para o pré-orçamento!",
          variant: "default",
        });
      }

    } catch (error: any) {
      console.error('Erro ao carregar checklist colaborativo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o checklist colaborativo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [orcamentoId, toast, checklistColaborativo?.status]);

  const carregarMinhasContribuicoes = useCallback(async () => {
    if (!checklistColaborativo?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('contribuicoes_checklist')
        .select('*')
        .eq('checklist_colaborativo_id', checklistColaborativo.id);

      if (error) throw error;
      setMinhasContribuicoes(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar contribuições:', error);
    }
  }, [checklistColaborativo?.id]);

  const criarChecklistColaborativo = async (orcamentoId: string, totalFornecedores: number) => {
    try {
      const { data, error } = await supabase
        .from('checklist_colaborativo')
        .insert({
          orcamento_id: orcamentoId,
          total_fornecedores: totalFornecedores,
          status: 'fase_colaborativa'  // Usar status válido
        })
        .select()
        .single();

      if (error) throw error;
      
      setChecklistColaborativo(data);
      return data;
    } catch (error: any) {
      console.error('Erro ao criar checklist colaborativo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o checklist colaborativo",
        variant: "destructive",
      });
      return null;
    }
  };

  // Função para salvar múltiplas contribuições de uma vez
  const salvarContribuicoes = useCallback(async (contribuicoes: Array<{ itemId: string; marcado: boolean; observacoes?: string }>) => {
    if (!checklistColaborativo?.id) return false;
    
    try {
      console.log('💾 Salvando múltiplas contribuições:', contribuicoes);
      
      const user = await supabase.auth.getUser();
      if (!user.data.user?.id) throw new Error('Usuário não autenticado');
      
      const dadosParaSalvar = contribuicoes.map(contrib => ({
        checklist_colaborativo_id: checklistColaborativo.id,
        item_id: contrib.itemId,
        marcado: contrib.marcado,
        observacoes: contrib.observacoes || null,
        fornecedor_id: user.data.user!.id
      }));

      const { error } = await supabase
        .from('contribuicoes_checklist')
        .upsert(dadosParaSalvar, {
          onConflict: 'checklist_colaborativo_id,item_id,fornecedor_id'
        });

      if (error) throw error;
      
      // Reload contributions only if successful
      await carregarMinhasContribuicoes();
      
      toast({
        title: "Sucesso",
        description: `${contribuicoes.length} contribuições salvas com sucesso`,
      });
      
      return true;

    } catch (error: any) {
      console.error('Erro ao salvar contribuições:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar suas contribuições",
        variant: "destructive",
      });
      return false;
    }
  }, [checklistColaborativo?.id, carregarMinhasContribuicoes, toast]);

  const consolidarChecklist = useCallback(async () => {
    if (!checklistColaborativo?.id || isConsolidatingRef.current) return;
    
    isConsolidatingRef.current = true;
    
    try {
      // Por enquanto apenas simulamos consolidação
      // TODO: Implementar RPC function quando estiver disponível
      
      const { error } = await supabase
        .from('checklist_colaborativo')
        .update({ 
          status: 'checklist_definido',
          data_consolidacao: new Date().toISOString()
        })
        .eq('id', checklistColaborativo.id);
        
      if (error) throw error;
      
      toast({
        title: "Checklist Consolidado",
        description: "Checklist foi consolidado com sucesso",
      });
      
      // Atualizar estado local ao invés de recarregar do servidor
      setChecklistColaborativo(prev => prev ? {
        ...prev,
        status: 'checklist_definido',
        data_consolidacao: new Date().toISOString()
      } : null);
      
      return true;
    } catch (error: any) {
      console.error('Erro ao consolidar checklist:', error);
      toast({
        title: "Erro",
        description: "Não foi possível consolidar o checklist",
        variant: "destructive",
      });
      return false;
    } finally {
      isConsolidatingRef.current = false;
    }
  }, [checklistColaborativo?.id, toast]);

  // Timer removido para não interferir no uso do usuário
  // O tempo restante será calculado apenas quando necessário
  useEffect(() => {
    if (checklistColaborativo?.prazo_contribuicao && checklistColaborativo.status !== 'checklist_definido') {
      const agora = new Date();
      const limite = new Date(checklistColaborativo.prazo_contribuicao);
      const diferenca = limite.getTime() - agora.getTime();
      setTempoRestante(Math.max(0, diferenca));
    } else {
      setTempoRestante(null);
    }
  }, [checklistColaborativo?.prazo_contribuicao, checklistColaborativo?.status]);

  // Configurar realtime para escutar mudanças no checklist colaborativo
  useEffect(() => {
    if (!orcamentoId || !checklistColaborativo?.id) {
      return;
    }

    // Evitar re-subscription para o mesmo checklist
    if (activeChannelsRef.current.currentChecklistId === checklistColaborativo.id) {
      return;
    }

    // Cleanup anterior com timeout para evitar race conditions
    const cleanup = async () => {
      if (activeChannelsRef.current.checklistChannel) {
        await supabase.removeChannel(activeChannelsRef.current.checklistChannel);
        await supabase.removeChannel(activeChannelsRef.current.contribuicoesChannel);
        activeChannelsRef.current = {};
      }
      
      // Pequeno delay antes de criar novos canais
      setTimeout(() => {
        setupChannels();
      }, 100);
    };

      const setupChannels = () => {
        // Prevenir múltiplas subscriptions
        if (activeChannelsRef.current.isSubscribed && 
            activeChannelsRef.current.currentChecklistId === checklistColaborativo.id) {
          return;
        }

        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        const checklistChannelName = `checklist-${checklistColaborativo.id}-${timestamp}-${randomId}`;
        const contribuicoesChannelName = `contribuicoes-${checklistColaborativo.id}-${timestamp}-${randomId}`;

        const checklistChannel = supabase
          .channel(checklistChannelName)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'checklist_colaborativo',
              filter: `id=eq.${checklistColaborativo.id}`
            },
            (payload) => {
              const newData = payload.new as ChecklistColaborativo;
              setChecklistColaborativo(newData);
              
              if (newData.status === 'checklist_definido' && checklistColaborativo.status !== 'checklist_definido') {
                toast({
                  title: "🎉 Checklist Consolidado!",
                  description: "A fase colaborativa foi finalizada automaticamente. Você já pode fazer seu pré-orçamento!",
                  variant: "default",
                });
              }
            }
          )
          .subscribe();

        const contribuicoesChannel = supabase
          .channel(contribuicoesChannelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'contribuicoes_checklist',
              filter: `checklist_colaborativo_id=eq.${checklistColaborativo.id}`
            },
            (payload) => {
              carregarChecklistColaborativo();
            }
          )
          .subscribe();

        activeChannelsRef.current = {
          checklistChannel,
          contribuicoesChannel,
          currentChecklistId: checklistColaborativo.id,
          isSubscribed: true
        };
      };

    cleanup();

    return () => {
      if (activeChannelsRef.current.checklistChannel) {
        supabase.removeChannel(activeChannelsRef.current.checklistChannel);
        supabase.removeChannel(activeChannelsRef.current.contribuicoesChannel);
        activeChannelsRef.current = { isSubscribed: false };
      }
    };
  }, [checklistColaborativo?.id, orcamentoId, carregarChecklistColaborativo, toast]);

  // Load initial data
  useEffect(() => {
    if (orcamentoId) {
      carregarChecklistColaborativo();
    }
  }, [orcamentoId, carregarChecklistColaborativo]);

  // Load contributions when checklist changes
  useEffect(() => {
    if (checklistColaborativo?.id) {
      carregarMinhasContribuicoes();
    }
  }, [checklistColaborativo?.id, carregarMinhasContribuicoes]);

  // Cleanup geral quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (activeChannelsRef.current.checklistChannel) {
        supabase.removeChannel(activeChannelsRef.current.checklistChannel);
      }
      if (activeChannelsRef.current.contribuicoesChannel) {
        supabase.removeChannel(activeChannelsRef.current.contribuicoesChannel);
      }
      activeChannelsRef.current = { isSubscribed: false };
    };
  }, []);

  const formatarTempoRestante = (milissegundos: number) => {
    const horas = Math.floor(milissegundos / (1000 * 60 * 60));
    const minutos = Math.floor((milissegundos % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((milissegundos % (1000 * 60)) / 1000);
    
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  };

  return {
    checklistColaborativo,
    minhasContribuicoes,
    loading,
    tempoRestante,
    formatarTempoRestante,
    salvarContribuicoes,
    consolidarChecklist,
    carregarChecklistColaborativo,
  };
};