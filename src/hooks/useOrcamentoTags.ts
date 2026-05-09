import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export function useOrcamentoTags(orcamentoId: string) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  // Adicionar tag ao orçamento
  const adicionarTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      console.log('🏷️ [useOrcamentoTags] Adicionando tag:', { 
        orcamentoId, 
        tagId, 
        profile: {
          id: profile?.id,
          nome: profile?.nome,
          tipo_usuario: profile?.tipo_usuario
        }
      });
      
      const { data, error } = await supabase
        .from('crm_orcamentos_tags')
        .insert({
          orcamento_id: orcamentoId,
          tag_id: tagId,
          adicionada_por_id: profile?.id,
          adicionada_por_nome: profile?.nome
        })
        .select();
      
      console.log('🏷️ [useOrcamentoTags] Resultado:', { data, error });
      
      if (error) {
        console.error('❌ [useOrcamentoTags] Erro detalhado:', {
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
      
      console.log('✅ [useOrcamentoTags] Tag adicionada com sucesso!');
      return data;
    },
    onSuccess: () => {
      console.log('🔄 [useOrcamentoTags] Invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['crm-orcamentos'] });
      toast({ title: 'Tag adicionada' });
    },
    onError: (error: Error) => {
      console.error('❌ [useOrcamentoTags] onError:', error);
      toast({
        title: 'Erro ao adicionar tag',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Remover tag do orçamento
  const removerTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      console.log('🏷️ [useOrcamentoTags] Removendo tag:', { orcamentoId, tagId });
      
      const { error } = await supabase
        .from('crm_orcamentos_tags')
        .delete()
        .eq('orcamento_id', orcamentoId)
        .eq('tag_id', tagId);
      
      if (error) {
        console.error('❌ [useOrcamentoTags] Erro ao remover:', error);
        throw error;
      }
      
      console.log('✅ [useOrcamentoTags] Tag removida com sucesso!');
    },
    onSuccess: () => {
      console.log('🔄 [useOrcamentoTags] Invalidando queries após remoção...');
      queryClient.invalidateQueries({ queryKey: ['crm-orcamentos'] });
      toast({ title: 'Tag removida' });
    },
    onError: (error: Error) => {
      console.error('❌ [useOrcamentoTags] onError na remoção:', error);
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
