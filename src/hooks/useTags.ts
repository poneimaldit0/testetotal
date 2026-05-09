import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import type { CRMTag } from '@/types/tags';

export function useTags() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  // Listar tags: próprias + globais
  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['crm-tags', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('crm_tags')
        .select('*')
        .eq('ativo', true)
        .or(`criado_por_id.eq.${profile.id},visivel_para_todos.eq.true`)
        .order('nome', { ascending: true });
      
      if (error) throw error;
      return data as CRMTag[];
    },
    enabled: !!profile?.id
  });
  
  // Criar nova tag (com opção de global para admins)
  const criarTagMutation = useMutation({
    mutationFn: async ({ nome, cor, global = false }: { nome: string; cor: string; global?: boolean }) => {
      console.log('🏷️ [useTags] Criando tag:', { 
        nome, 
        cor,
        global,
        profile: {
          id: profile?.id,
          nome: profile?.nome,
          tipo_usuario: profile?.tipo_usuario
        }
      });
      
      const isAdmin = ['admin', 'master'].includes(profile?.tipo_usuario || '');
      
      const { data, error } = await supabase
        .from('crm_tags')
        .insert([{
          nome: nome.trim(),
          cor,
          criado_por_id: profile?.id,
          criado_por_nome: profile?.nome,
          visivel_para_todos: isAdmin && global
        }])
        .select()
        .single();
      
      console.log('🏷️ [useTags] Resultado:', { data, error });
      
      if (error) {
        console.error('❌ [useTags] Erro detalhado:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        if (error.code === '23505') {
          throw new Error('Já existe uma tag com este nome');
        }
        throw error;
      }
      
      console.log('✅ [useTags] Tag criada:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('🔄 [useTags] Invalidando queries, tag criada:', data);
      queryClient.invalidateQueries({ queryKey: ['crm-tags'] });
      toast({ title: 'Tag criada com sucesso!' });
    },
    onError: (error: Error) => {
      console.error('❌ [useTags] onError:', error);
      toast({
        title: 'Erro ao criar tag',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  return {
    tags,
    isLoading,
    criarTag: criarTagMutation.mutate,
    isCriando: criarTagMutation.isPending
  };
}
