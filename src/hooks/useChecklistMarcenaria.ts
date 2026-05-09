import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ProgressoChecklistMarcenaria } from '@/types/crmMarcenaria';

export function useChecklistMarcenaria(leadId: string) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query: buscar progresso do checklist
  const { data: progresso, isLoading } = useQuery({
    queryKey: ['checklist-marcenaria-progresso', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_marcenaria_checklist_progresso')
        .select(`
          *,
          crm_marcenaria_checklist_etapas(*)
        `)
        .eq('lead_id', leadId)
        .order('crm_marcenaria_checklist_etapas(ordem)', { ascending: true });
      
      if (error) {
        console.error('Erro ao buscar progresso do checklist:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o checklist",
          variant: "destructive"
        });
        throw error;
      }
      
      return data as ProgressoChecklistMarcenaria[];
    },
    enabled: !!leadId
  });

  // Mutation: concluir item
  const concluirItem = useMutation({
    mutationFn: async ({ itemId, observacao }: { itemId: string; observacao?: string }) => {
      const { error } = await supabase
        .from('crm_marcenaria_checklist_progresso')
        .update({
          concluido: true,
          concluido_por_id: profile?.id,
          concluido_por_nome: profile?.nome,
          data_conclusao: new Date().toISOString(),
          observacao
        })
        .eq('id', itemId);
      
      if (error) {
        console.error('Erro ao concluir item:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-marcenaria-progresso', leadId] });
      queryClient.invalidateQueries({ queryKey: ['crm-marcenaria-leads'] });
      queryClient.invalidateQueries({ queryKey: ['produtividade-checklist'] });
      toast({
        title: "Sucesso",
        description: "Item concluído!",
      });
    },
    onError: (error) => {
      console.error('Erro ao concluir item:', error);
      toast({
        title: "Erro",
        description: "Não foi possível concluir o item",
        variant: "destructive"
      });
    }
  });

  // Mutation: desfazer item
  const desfazerItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('crm_marcenaria_checklist_progresso')
        .update({
          concluido: false,
          concluido_por_id: null,
          concluido_por_nome: null,
          data_conclusao: null,
          observacao: null
        })
        .eq('id', itemId);
      
      if (error) {
        console.error('Erro ao desfazer item:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-marcenaria-progresso', leadId] });
      queryClient.invalidateQueries({ queryKey: ['crm-marcenaria-leads'] });
      queryClient.invalidateQueries({ queryKey: ['produtividade-checklist'] });
      toast({
        title: "Sucesso",
        description: "Item desmarcado!",
      });
    },
    onError: (error) => {
      console.error('Erro ao desfazer item:', error);
      toast({
        title: "Erro",
        description: "Não foi possível desmarcar o item",
        variant: "destructive"
      });
    }
  });

  return {
    progresso: progresso || [],
    isLoading,
    concluirItem: concluirItem.mutate,
    desfazerItem: desfazerItem.mutate,
    isPending: concluirItem.isPending || desfazerItem.isPending
  };
}
