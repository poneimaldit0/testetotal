import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProgressoChecklistItem } from '@/types/crm';
import { toast } from 'sonner';

export const useChecklistCRM = (orcamentoId: string | undefined) => {
  const queryClient = useQueryClient();

  // Query: buscar progresso do checklist
  const { data: progresso, isLoading } = useQuery({
    queryKey: ['crm-checklist', orcamentoId],
    queryFn: async () => {
      if (!orcamentoId) return [];

      console.log('🔍 Checklist CRM - orcamentoId:', orcamentoId);

      const { data, error } = await supabase
        .from('crm_checklist_progresso')
        .select(`
          *,
          item:crm_checklist_etapas(*)
        `)
        .eq('orcamento_id', orcamentoId);

      console.log('📊 Checklist CRM - data:', data);
      console.log('❌ Checklist CRM - error:', error);

      if (error) {
        console.error('Erro ao buscar checklist:', error);
        toast.error(`Erro ao carregar checklist: ${error.message}`);
        return [];
      }

      // Ordenar manualmente por item.ordem
      const sorted = (data as unknown as ProgressoChecklistItem[])
        .sort((a, b) => (a.item?.ordem || 0) - (b.item?.ordem || 0));

      console.log('✅ Checklist CRM - sorted:', sorted);
      return sorted;
    },
    enabled: !!orcamentoId
  });

  // Mutation: concluir item
  const concluirItem = useMutation({
    mutationFn: async ({ 
      itemId, 
      observacao 
    }: { 
      itemId: string; 
      observacao?: string 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('nome')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('crm_checklist_progresso')
        .update({
          concluido: true,
          concluido_por_id: user.id,
          concluido_por_nome: profile?.nome || user.email || 'Usuário',
          data_conclusao: new Date().toISOString(),
          observacao
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-checklist', orcamentoId] });
      queryClient.invalidateQueries({ queryKey: ['crm-orcamentos'] });
      queryClient.invalidateQueries({ queryKey: ['produtividade-checklist'] });
      toast.success('Item marcado como concluído');
    },
    onError: (error) => {
      console.error('Erro ao concluir item:', error);
      toast.error('Erro ao concluir item do checklist');
    }
  });

  // Mutation: desfazer item
  const desfazerItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('crm_checklist_progresso')
        .update({
          concluido: false,
          concluido_por_id: null,
          concluido_por_nome: null,
          data_conclusao: null,
          observacao: null
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-checklist', orcamentoId] });
      queryClient.invalidateQueries({ queryKey: ['crm-orcamentos'] });
      queryClient.invalidateQueries({ queryKey: ['produtividade-checklist'] });
      toast.success('Item desmarcado');
    },
    onError: (error) => {
      console.error('Erro ao desfazer item:', error);
      toast.error('Erro ao desfazer item do checklist');
    }
  });

  return {
    progresso: progresso || [],
    isLoading,
    concluirItem: concluirItem.mutate,
    desfazerItem: desfazerItem.mutate,
    isPending: concluirItem.isPending || desfazerItem.isPending
  };
};
