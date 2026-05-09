import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  data_criacao: string;
  referencia_id?: string;
  tipo_referencia?: string;
  dados_extras?: any;
}

export const useNotificacoesFornecedor = () => {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [naoLidas, setNaoLidas] = useState(0);
  const { toast } = useToast();

  const carregarNotificacoes = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('notificacoes_sistema')
        .select('*')
        .order('data_criacao', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      setNotificacoes(data || []);
      setNaoLidas((data || []).filter(n => !n.lida).length);
      
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      toast({
        title: "Erro ao carregar notificações",
        description: "Não foi possível carregar suas notificações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLida = async (notificacaoId: string) => {
    try {
      const { error } = await supabase
        .from('notificacoes_sistema')
        .update({ lida: true })
        .eq('id', notificacaoId);

      if (error) {
        throw error;
      }

      // Atualizar local
      setNotificacoes(prev => 
        prev.map(n => 
          n.id === notificacaoId 
            ? { ...n, lida: true }
            : n
        )
      );
      
      setNaoLidas(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const marcarTodasComoLidas = async () => {
    try {
      const { error } = await supabase
        .from('notificacoes_sistema')
        .update({ lida: true })
        .eq('lida', false);

      if (error) {
        throw error;
      }

      // Atualizar local
      setNotificacoes(prev => 
        prev.map(n => ({ ...n, lida: true }))
      );
      
      setNaoLidas(0);
      
      toast({
        title: "Notificações marcadas como lidas",
        description: "Todas as notificações foram marcadas como lidas",
      });
      
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar as notificações como lidas",
        variant: "destructive",
      });
    }
  };

  // Setup realtime subscription
  useEffect(() => {
    carregarNotificacoes();

    // Subscribe to new notifications with unique channel name
    const uniqueChannelName = `notificacoes-fornecedor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes_sistema'
        },
        (payload) => {
          const novaNotificacao = payload.new as Notificacao;
          
          // Adicionar nova notificação ao topo
          setNotificacoes(prev => [novaNotificacao, ...prev]);
          setNaoLidas(prev => prev + 1);
          
          // Mostrar toast para notificações importantes
          if (['proposta_aceita', 'revisao_solicitada', 'crm_movimentacao_automatica', 'crm_atividade_orcamento_arquivado'].includes(novaNotificacao.tipo)) {
            toast({
              title: novaNotificacao.titulo,
              description: novaNotificacao.mensagem,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    notificacoes,
    loading,
    naoLidas,
    carregarNotificacoes,
    marcarComoLida,
    marcarTodasComoLidas,
  };
};