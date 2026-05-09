import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type StatusAcompanhamentoConcierge = 
  | 'aguardando_contato'
  | 'em_negociacao'
  | 'aguardando_proposta'
  | 'proposta_recebida'
  | 'aprovado'
  | 'reprovado'
  | 'nao_responde';

export const STATUS_CONCIERGE_LABELS: Record<StatusAcompanhamentoConcierge, string> = {
  'aguardando_contato': 'Aguardando Contato',
  'em_negociacao': 'Em Negociação',
  'aguardando_proposta': 'Aguardando Proposta',
  'proposta_recebida': 'Proposta Recebida',
  'aprovado': 'Aprovado',
  'reprovado': 'Reprovado',
  'nao_responde': 'Não Responde'
};

export const STATUS_CONCIERGE_COLORS: Record<StatusAcompanhamentoConcierge, string> = {
  'aguardando_contato': 'bg-slate-100 text-slate-800',
  'em_negociacao': 'bg-blue-100 text-blue-800',
  'aguardando_proposta': 'bg-amber-100 text-amber-800',
  'proposta_recebida': 'bg-purple-100 text-purple-800',
  'aprovado': 'bg-green-100 text-green-800',
  'reprovado': 'bg-red-100 text-red-800',
  'nao_responde': 'bg-gray-100 text-gray-800'
};

export const STATUS_CONCIERGE_OPTIONS = Object.entries(STATUS_CONCIERGE_LABELS).map(([valor, label]) => ({
  valor: valor as StatusAcompanhamentoConcierge,
  label
}));

export const useStatusAcompanhamentoConcierge = () => {
  const { toast } = useToast();

  const atualizarStatusConcierge = async (
    candidaturaId: string,
    novoStatus: StatusAcompanhamentoConcierge | null
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('candidaturas_fornecedores')
        .update({ status_acompanhamento_concierge: novoStatus })
        .eq('id', candidaturaId);

      if (error) {
        console.error('Erro ao atualizar status do concierge:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o status do acompanhamento",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Status atualizado!",
        description: novoStatus 
          ? `Status alterado para: ${STATUS_CONCIERGE_LABELS[novoStatus]}`
          : "Status removido",
      });

      return true;
    } catch (error) {
      console.error('Erro ao atualizar status do concierge:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao atualizar status",
        variant: "destructive",
      });
      return false;
    }
  };

  return { atualizarStatusConcierge };
};
