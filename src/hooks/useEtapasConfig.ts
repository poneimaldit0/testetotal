import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type TipoEtapa = 'orcamentos' | 'marcenaria';

export interface EtapaConfig {
  id: string;
  valor: string;
  titulo: string;
  descricao: string | null;
  cor: string;
  icone: string;
  ordem: number;
  ativo: boolean;
  tipo: string;
  bloqueado?: boolean;
  dias_limite: number | null;
  cor_atraso: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateEtapaData {
  titulo?: string;
  descricao?: string | null;
  cor?: string;
  icone?: string;
  ativo?: boolean;
  dias_limite?: number | null;
  cor_atraso?: string | null;
}

export interface ReorderItem {
  id: string;
  ordem: number;
}

export const useEtapasConfig = (tipo: TipoEtapa) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tabela = tipo === 'orcamentos' ? 'crm_etapas_config' : 'crm_marcenaria_etapas_config';
  const queryKey = ['etapas-config', tipo];

  // Buscar etapas
  const { data: etapas = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tabela)
        .select('*')
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as EtapaConfig[];
    }
  });

  // Buscar apenas etapas ativas
  const { data: etapasAtivas = [] } = useQuery({
    queryKey: ['etapas-config-ativas', tipo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tabela)
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as EtapaConfig[];
    }
  });

  // Atualizar etapa
  const updateEtapa = useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: UpdateEtapaData }) => {
      const { data, error } = await supabase
        .from(tabela)
        .update({ ...dados, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['etapas-config-ativas', tipo] });
      toast({
        title: 'Etapa atualizada',
        description: 'As alterações foram salvas com sucesso.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar etapa',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Reordenar etapas
  const reorderEtapas = useMutation({
    mutationFn: async (items: ReorderItem[]) => {
      const promises = items.map(item =>
        supabase
          .from(tabela)
          .update({ ordem: item.ordem, updated_at: new Date().toISOString() })
          .eq('id', item.id)
      );

      const results = await Promise.all(promises);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['etapas-config-ativas', tipo] });
      toast({
        title: 'Ordem atualizada',
        description: 'As etapas foram reordenadas com sucesso.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao reordenar etapas',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Toggle ativo
  const toggleAtivo = useMutation({
    mutationFn: async (id: string) => {
      const etapa = etapas.find(e => e.id === id);
      if (!etapa) throw new Error('Etapa não encontrada');

      const { error } = await supabase
        .from(tabela)
        .update({ ativo: !etapa.ativo, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['etapas-config-ativas', tipo] });
      toast({
        title: 'Status alterado',
        description: 'O status da etapa foi atualizado.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao alterar status',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    etapas,
    etapasAtivas,
    isLoading,
    updateEtapa: updateEtapa.mutate,
    reorderEtapas: reorderEtapas.mutate,
    toggleAtivo: toggleAtivo.mutate,
    isPending: updateEtapa.isPending || reorderEtapas.isPending || toggleAtivo.isPending
  };
};