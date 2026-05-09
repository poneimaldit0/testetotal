import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMaster } from './useIsMaster';
import type { Aviso } from '@/types';

export const useAvisos = () => {
  const queryClient = useQueryClient();
  const isMaster = useIsMaster();

  // Buscar avisos ativos (para todos os usuários autenticados)
  const { data: avisosAtivos, isLoading } = useQuery({
    queryKey: ['avisos-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('avisos_sistema')
        .select('*')
        .eq('ativo', true)
        .or(`data_inicio.is.null,data_inicio.lte.${new Date().toISOString()}`)
        .or(`data_fim.is.null,data_fim.gte.${new Date().toISOString()}`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Aviso[];
    }
  });

  // Buscar todos os avisos (apenas para Master)
  const { data: todosAvisos, isLoading: isLoadingTodos } = useQuery({
    queryKey: ['avisos-todos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('avisos_sistema')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Aviso[];
    },
    enabled: isMaster
  });

  // Criar aviso
  const criarAviso = useMutation({
    mutationFn: async (novoAviso: Omit<Aviso, 'id' | 'created_at' | 'updated_at' | 'criado_por'>) => {
      const { data, error } = await supabase
        .from('avisos_sistema')
        .insert([novoAviso])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avisos-ativos'] });
      queryClient.invalidateQueries({ queryKey: ['avisos-todos'] });
      toast.success('Aviso criado com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar aviso: ${error.message}`);
    }
  });

  // Editar aviso
  const editarAviso = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Aviso> & { id: string }) => {
      const { data, error } = await supabase
        .from('avisos_sistema')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avisos-ativos'] });
      queryClient.invalidateQueries({ queryKey: ['avisos-todos'] });
      toast.success('Aviso atualizado com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar aviso: ${error.message}`);
    }
  });

  // Excluir aviso
  const excluirAviso = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('avisos_sistema')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avisos-ativos'] });
      queryClient.invalidateQueries({ queryKey: ['avisos-todos'] });
      toast.success('Aviso excluído com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir aviso: ${error.message}`);
    }
  });

  // Toggle ativo
  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { data, error } = await supabase
        .from('avisos_sistema')
        .update({ ativo })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avisos-ativos'] });
      queryClient.invalidateQueries({ queryKey: ['avisos-todos'] });
      toast.success('Status do aviso atualizado');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    }
  });

  return {
    avisosAtivos,
    todosAvisos,
    isLoading,
    isLoadingTodos,
    criarAviso,
    editarAviso,
    excluirAviso,
    toggleAtivo
  };
};