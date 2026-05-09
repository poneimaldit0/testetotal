
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type StatusAcompanhamento =
  | '1_contato_realizado'
  | '2_contato_realizado'
  | '3_contato_realizado'
  | '4_contato_realizado'
  | '5_contato_realizado'
  | 'cliente_respondeu_nao_agendou'
  | 'visita_agendada'
  | 'visita_realizada'
  | 'reuniao_agendada'
  | 'reuniao_realizada'
  | 'em_orcamento'
  | 'orcamento_enviado'
  | 'negocio_fechado'
  | 'negocio_perdido'
  | 'nao_respondeu_mensagens';

export const STATUS_LABELS: Record<StatusAcompanhamento, string> = {
  '1_contato_realizado': '1º Contato Realizado',
  '2_contato_realizado': '2º Contato Realizado',
  '3_contato_realizado': '3º Contato Realizado',
  '4_contato_realizado': '4º Contato Realizado',
  '5_contato_realizado': '5º Contato Realizado',
  'cliente_respondeu_nao_agendou': 'Cliente Respondeu mas Não Agendou',
  'visita_agendada': 'Visita Agendada',
  'visita_realizada': 'Visita Realizada',
  'reuniao_agendada': 'Reunião Online Agendada',
  'reuniao_realizada': 'Reunião Online Realizada',
  'em_orcamento': 'Em Orçamento',
  'orcamento_enviado': 'Orçamento Enviado',
  'negocio_fechado': 'Negócio Fechado',
  'negocio_perdido': 'Negócio Perdido',
  'nao_respondeu_mensagens': 'Não Respondeu as Mensagens'
};

export const STATUS_CATEGORIES = {
  'Contatos Iniciais': [
    '1_contato_realizado',
    '2_contato_realizado',
    '3_contato_realizado',
    '4_contato_realizado',
    '5_contato_realizado'
  ] as StatusAcompanhamento[],
  'Resposta do Cliente': [
    'cliente_respondeu_nao_agendou',
    'nao_respondeu_mensagens'
  ] as StatusAcompanhamento[],
  'Visitas e Reuniões': [
    'visita_agendada',
    'visita_realizada',
    'reuniao_agendada',
    'reuniao_realizada'
  ] as StatusAcompanhamento[],
  'Proposta': [
    'em_orcamento',
    'orcamento_enviado'
  ] as StatusAcompanhamento[],
  'Finalização': [
    'negocio_fechado',
    'negocio_perdido'
  ] as StatusAcompanhamento[]
};

export const STATUS_COLORS: Record<StatusAcompanhamento, string> = {
  '1_contato_realizado': 'bg-blue-100 text-blue-800',
  '2_contato_realizado': 'bg-blue-100 text-blue-800',
  '3_contato_realizado': 'bg-blue-100 text-blue-800',
  '4_contato_realizado': 'bg-blue-100 text-blue-800',
  '5_contato_realizado': 'bg-blue-100 text-blue-800',
  'cliente_respondeu_nao_agendou': 'bg-yellow-100 text-yellow-800',
  'visita_agendada': 'bg-purple-100 text-purple-800',
  'visita_realizada': 'bg-purple-100 text-purple-800',
  'reuniao_agendada': 'bg-indigo-100 text-indigo-800',
  'reuniao_realizada': 'bg-indigo-100 text-indigo-800',
  'em_orcamento': 'bg-amber-100 text-amber-800',
  'orcamento_enviado': 'bg-orange-100 text-orange-800',
  'negocio_fechado': 'bg-green-100 text-green-800',
  'negocio_perdido': 'bg-red-100 text-red-800',
  'nao_respondeu_mensagens': 'bg-gray-100 text-gray-800'
};

// Ordem das etapas para ordenação (mais avançadas = maior número)
export const ORDEM_ETAPAS: Record<StatusAcompanhamento | 'null', number> = {
  'null': 0,
  '1_contato_realizado': 1,
  '2_contato_realizado': 2,
  '3_contato_realizado': 3,
  '4_contato_realizado': 4,
  '5_contato_realizado': 5,
  'nao_respondeu_mensagens': 6,
  'cliente_respondeu_nao_agendou': 7,
  'visita_agendada': 8,
  'visita_realizada': 9,
  'reuniao_agendada': 10,
  'reuniao_realizada': 11,
  'em_orcamento': 12,
  'orcamento_enviado': 13,
  'negocio_fechado': 14,
  'negocio_perdido': 15,
};

interface RpcResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export const useStatusAcompanhamento = () => {
  const { toast } = useToast();

  const atualizarStatus = useCallback(async (
    inscricaoId: string, 
    novoStatus: StatusAcompanhamento
  ): Promise<boolean> => {
    try {
      console.log('Atualizando status:', { inscricaoId, novoStatus });

      const { data: resultado, error: rpcError } = await supabase.rpc('atualizar_status_acompanhamento', {
        p_inscricao_id: inscricaoId,
        p_novo_status: novoStatus,
      });

      if (rpcError) {
        console.error('Erro ao chamar função RPC:', rpcError);
        toast({
          title: "Erro",
          description: "Erro interno do sistema. Tente novamente mais tarde.",
          variant: "destructive",
        });
        return false;
      }

      console.log('Resultado da função RPC:', resultado);

      const response = resultado as unknown as RpcResponse;

      if (!response?.success) {
        let mensagem = "Erro desconhecido ao atualizar status";
        
        switch (response?.error) {
          case 'inscription_not_found':
            mensagem = "Inscrição não encontrada ou você não tem permissão para alterá-la";
            break;
          case 'database_error':
            mensagem = response?.message || "Erro interno do sistema";
            break;
          default:
            mensagem = response?.message || "Erro inesperado ao atualizar status";
        }

        console.log('Erro ao atualizar status:', mensagem);
        toast({
          title: "Não foi possível atualizar o status",
          description: mensagem,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Status atualizado!",
        description: `Status alterado para: ${STATUS_LABELS[novoStatus]}`,
      });

      console.log('Status atualizado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro geral ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado do sistema. Tente novamente mais tarde.",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const atualizarObservacoes = useCallback(async (
    inscricaoId: string,
    observacoes: string
  ): Promise<boolean> => {
    try {
      console.log('Atualizando observações:', { inscricaoId, observacoes: observacoes.substring(0, 50) });

      const { data: resultado, error: rpcError } = await supabase.rpc('atualizar_observacoes_acompanhamento', {
        p_inscricao_id: inscricaoId,
        p_observacoes: observacoes,
      });

      if (rpcError) {
        console.error('Erro ao chamar função RPC de observações:', rpcError);
        toast({
          title: "Erro",
          description: "Erro ao salvar observações. Tente novamente.",
          variant: "destructive",
        });
        return false;
      }

      const response = resultado as unknown as RpcResponse;

      if (!response?.success) {
        toast({
          title: "Erro",
          description: "Não foi possível salvar as observações.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Observações salvas!",
        description: "Suas observações foram atualizadas com sucesso.",
      });

      return true;
    } catch (error) {
      console.error('Erro geral ao atualizar observações:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  return { atualizarStatus, atualizarObservacoes };
};
