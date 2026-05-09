import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface TagMarcenaria {
  id: string;
  nome: string;
  cor: string;
  ativo: boolean;
  visivel_para_todos: boolean;
  criado_por_id?: string;
  criado_por_nome?: string;
  created_at: string;
}

export function useTagsMarcenaria() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  // Listar tags de marcenaria: próprias + globais
  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['crm-marcenaria-tags', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      console.log('🏷️ [useTagsMarcenaria] Buscando tags de marcenaria...');
      const { data, error } = await supabase
        .from('crm_marcenaria_tags')
        .select('*')
        .eq('ativo', true)
        .or(`criado_por_id.eq.${profile.id},visivel_para_todos.eq.true`)
        .order('nome', { ascending: true });
      
      if (error) {
        console.error('❌ [useTagsMarcenaria] Erro ao buscar tags:', error);
        throw error;
      }
      
      console.log('✅ [useTagsMarcenaria] Tags carregadas:', data.length);
      return data as TagMarcenaria[];
    },
    enabled: !!profile?.id
  });
  
  // Criar nova tag de marcenaria (com opção de global para admins)
  const criarTagMutation = useMutation({
    mutationFn: async ({ nome, cor, global = false }: { nome: string; cor: string; global?: boolean }) => {
      console.log('🏷️ [useTagsMarcenaria] Criando tag:', { nome, cor, global, profile });
      
      const isAdmin = ['admin', 'master'].includes(profile?.tipo_usuario || '');
      
      const { data, error } = await supabase
        .from('crm_marcenaria_tags')
        .insert([{
          nome: nome.trim(),
          cor,
          criado_por_id: profile?.id,
          criado_por_nome: profile?.nome,
          visivel_para_todos: isAdmin && global
        }])
        .select()
        .single();
      
      if (error) {
        console.error('❌ [useTagsMarcenaria] Erro ao criar tag:', error);
        if (error.code === '23505') {
          throw new Error('Já existe uma tag com este nome');
        }
        throw error;
      }
      
      console.log('✅ [useTagsMarcenaria] Tag criada:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('🔄 [useTagsMarcenaria] Invalidando queries após criar tag');
      queryClient.invalidateQueries({ queryKey: ['crm-marcenaria-tags'] });
      queryClient.invalidateQueries({ queryKey: ['crm-marcenaria-leads'] });
      toast({ title: 'Tag de marcenaria criada!' });
    },
    onError: (error: Error) => {
      console.error('❌ [useTagsMarcenaria] Erro na mutation de criar:', error);
      toast({
        title: 'Erro ao criar tag',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Atualizar tag
  const atualizarTagMutation = useMutation({
    mutationFn: async ({ id, nome, cor }: { id: string; nome: string; cor: string }) => {
      console.log('🏷️ [useTagsMarcenaria] Atualizando tag:', { id, nome, cor });
      
      const { error } = await supabase
        .from('crm_marcenaria_tags')
        .update({ nome: nome.trim(), cor })
        .eq('id', id);
      
      if (error) {
        console.error('❌ [useTagsMarcenaria] Erro ao atualizar tag:', error);
        throw error;
      }
      
      console.log('✅ [useTagsMarcenaria] Tag atualizada');
    },
    onSuccess: () => {
      console.log('🔄 [useTagsMarcenaria] Invalidando queries após atualizar tag');
      queryClient.invalidateQueries({ queryKey: ['crm-marcenaria-tags'] });
      queryClient.invalidateQueries({ queryKey: ['crm-marcenaria-leads'] });
      toast({ title: 'Tag atualizada!' });
    },
    onError: (error: Error) => {
      console.error('❌ [useTagsMarcenaria] Erro na mutation de atualizar:', error);
      toast({
        title: 'Erro ao atualizar tag',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Excluir tag
  const excluirTagMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('🏷️ [useTagsMarcenaria] Excluindo tag:', id);
      
      const { error } = await supabase
        .from('crm_marcenaria_tags')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('❌ [useTagsMarcenaria] Erro ao excluir tag:', error);
        throw error;
      }
      
      console.log('✅ [useTagsMarcenaria] Tag excluída');
    },
    onSuccess: () => {
      console.log('🔄 [useTagsMarcenaria] Invalidando queries após excluir tag');
      queryClient.invalidateQueries({ queryKey: ['crm-marcenaria-tags'] });
      queryClient.invalidateQueries({ queryKey: ['crm-marcenaria-leads'] });
      toast({ title: 'Tag excluída!' });
    },
    onError: (error: Error) => {
      console.error('❌ [useTagsMarcenaria] Erro na mutation de excluir:', error);
      toast({
        title: 'Erro ao excluir tag',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  return {
    tags,
    isLoading,
    criarTag: criarTagMutation.mutate,
    isCriando: criarTagMutation.isPending,
    atualizarTag: atualizarTagMutation.mutate,
    isAtualizando: atualizarTagMutation.isPending,
    excluirTag: excluirTagMutation.mutate,
    isExcluindo: excluirTagMutation.isPending
  };
}
