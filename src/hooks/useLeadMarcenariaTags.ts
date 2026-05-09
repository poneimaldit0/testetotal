import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export function useLeadMarcenariaTags(leadId: string) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  // Adicionar tag ao lead
  const adicionarTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      console.log('🏷️ [useLeadMarcenariaTags] Adicionando tag:', { 
        leadId, 
        tagId, 
        profile: {
          id: profile?.id,
          nome: profile?.nome,
          tipo_usuario: profile?.tipo_usuario,
          status: profile?.status
        }
      });
      
      const { data, error } = await supabase
        .from('crm_marcenaria_leads_tags')
        .insert({
          lead_id: leadId,
          tag_id: tagId,
          adicionada_por_id: profile?.id,
          adicionada_por_nome: profile?.nome
        })
        .select();
      
      console.log('🏷️ [useLeadMarcenariaTags] Resultado:', { data, error });
      
      if (error) {
        console.error('❌ [useLeadMarcenariaTags] Erro detalhado:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        if (error.code === '23505') {
          console.log('⚠️ Tag já estava adicionada, ignorando...');
          return; // Tag já adicionada, ignorar silenciosamente
        }
        throw error;
      }
      
      console.log('✅ [useLeadMarcenariaTags] Tag adicionada com sucesso!');
      return data;
    },
    onSuccess: () => {
      console.log('🔄 [useLeadMarcenariaTags] Invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['crm-marcenaria'] });
      queryClient.invalidateQueries({ queryKey: ['crm-marcenaria-tags'] });
      toast({ title: 'Tag adicionada' });
    },
    onError: (error: Error) => {
      console.error('❌ [useLeadMarcenariaTags] onError:', error);
      toast({
        title: 'Erro ao adicionar tag',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Remover tag do lead
  const removerTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      console.log('🏷️ [useLeadMarcenariaTags] Removendo tag:', { leadId, tagId });
      
      const { error } = await supabase
        .from('crm_marcenaria_leads_tags')
        .delete()
        .eq('lead_id', leadId)
        .eq('tag_id', tagId);
      
      if (error) {
        console.error('❌ [useLeadMarcenariaTags] Erro ao remover:', error);
        throw error;
      }
      
      console.log('✅ [useLeadMarcenariaTags] Tag removida com sucesso!');
    },
    onSuccess: () => {
      console.log('🔄 [useLeadMarcenariaTags] Invalidando queries após remoção...');
      queryClient.invalidateQueries({ queryKey: ['crm-marcenaria'] });
      queryClient.invalidateQueries({ queryKey: ['crm-marcenaria-tags'] });
      toast({ title: 'Tag removida' });
    },
    onError: (error: Error) => {
      console.error('❌ [useLeadMarcenariaTags] onError na remoção:', error);
      toast({
        title: 'Erro ao remover tag',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  return {
    adicionarTag: adicionarTagMutation.mutate,
    removerTag: removerTagMutation.mutate,
    isPending: adicionarTagMutation.isPending || removerTagMutation.isPending
  };
}
