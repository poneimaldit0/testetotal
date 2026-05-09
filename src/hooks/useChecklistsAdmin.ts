import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type TipoCRM = 'orcamentos' | 'marcenaria';

export interface ChecklistItemCRM {
  id: string;
  etapa_crm: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  dias_para_alerta: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItemMarcenaria {
  id: string;
  etapa_marcenaria: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  dias_para_alerta: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type ChecklistItem = ChecklistItemCRM | ChecklistItemMarcenaria;

export interface CreateChecklistPayload {
  titulo: string;
  descricao?: string;
  etapa: string;
  dias_para_alerta: number;
  ordem: number;
  ativo: boolean;
}

export interface UpdateChecklistPayload {
  titulo?: string;
  descricao?: string;
  etapa?: string;
  dias_para_alerta?: number;
  ordem?: number;
  ativo?: boolean;
}

export interface ChecklistStatistics {
  total: number;
  ativos: number;
  inativos: number;
  porEtapa: Record<string, number>;
  mediaDiasAlerta: number;
}

export const useChecklistsAdmin = (tipo: TipoCRM) => {
  const queryClient = useQueryClient();
  const tableName = tipo === 'orcamentos' ? 'crm_checklist_etapas' : 'crm_marcenaria_checklist_etapas';
  const etapaField = tipo === 'orcamentos' ? 'etapa_crm' : 'etapa_marcenaria';

  // Query: buscar itens
  const { data: items, isLoading } = useQuery({
    queryKey: ['checklist-admin', tipo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('ordem');

      if (error) throw error;
      return data as ChecklistItem[];
    }
  });

  // Query: estatísticas
  const { data: statistics } = useQuery({
    queryKey: ['checklist-statistics', tipo],
    queryFn: async () => {
      const items = await queryClient.getQueryData<ChecklistItem[]>(['checklist-admin', tipo]);
      if (!items) return null;

      const stats: ChecklistStatistics = {
        total: items.length,
        ativos: items.filter(i => i.ativo).length,
        inativos: items.filter(i => !i.ativo).length,
        porEtapa: {},
        mediaDiasAlerta: 0
      };

      items.forEach(item => {
        const etapa = tipo === 'orcamentos' 
          ? (item as ChecklistItemCRM).etapa_crm 
          : (item as ChecklistItemMarcenaria).etapa_marcenaria;
        stats.porEtapa[etapa] = (stats.porEtapa[etapa] || 0) + 1;
      });

      const somaDias = items.reduce((acc, item) => acc + item.dias_para_alerta, 0);
      stats.mediaDiasAlerta = items.length > 0 ? Math.round(somaDias / items.length) : 0;

      return stats;
    },
    enabled: !!items
  });

  // Mutation: criar item
  const createItem = useMutation({
    mutationFn: async (payload: CreateChecklistPayload) => {
      const insertData: any = tipo === 'orcamentos' 
        ? {
            etapa_crm: payload.etapa as any,
            titulo: payload.titulo,
            descricao: payload.descricao || null,
            ordem: payload.ordem,
            dias_para_alerta: payload.dias_para_alerta,
            ativo: payload.ativo
          }
        : {
            etapa_marcenaria: payload.etapa,
            titulo: payload.titulo,
            descricao: payload.descricao || null,
            ordem: payload.ordem,
            dias_para_alerta: payload.dias_para_alerta,
            ativo: payload.ativo
          };

      const { error } = await supabase
        .from(tableName as any)
        .insert([insertData]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-admin', tipo] });
      toast.success('Item de checklist criado com sucesso');
    },
    onError: (error: any) => {
      console.error('Erro ao criar item:', error);
      toast.error('Erro ao criar item de checklist');
    }
  });

  // Mutation: atualizar item
  const updateItem = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateChecklistPayload }) => {
      const updateData: any = {
        ...(payload.titulo && { titulo: payload.titulo }),
        ...(payload.descricao !== undefined && { descricao: payload.descricao || null }),
        ...(payload.dias_para_alerta !== undefined && { dias_para_alerta: payload.dias_para_alerta }),
        ...(payload.ordem !== undefined && { ordem: payload.ordem }),
        ...(payload.ativo !== undefined && { ativo: payload.ativo })
      };

      if (payload.etapa) {
        if (tipo === 'orcamentos') {
          updateData.etapa_crm = payload.etapa;
        } else {
          updateData.etapa_marcenaria = payload.etapa;
        }
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-admin', tipo] });
      toast.success('Item atualizado com sucesso');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar item:', error);
      toast.error('Erro ao atualizar item');
    }
  });

  // Mutation: deletar item
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-admin', tipo] });
      toast.success('Item excluído com sucesso');
    },
    onError: (error: any) => {
      console.error('Erro ao excluir item:', error);
      toast.error('Erro ao excluir item');
    }
  });

  // Mutation: toggle ativo
  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from(tableName)
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-admin', tipo] });
      toast.success('Status atualizado com sucesso');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  });

  // Mutation: reordenar itens
  const reorderItems = useMutation({
    mutationFn: async (reorderedItems: Array<{ id: string; ordem: number }>) => {
      const updates = reorderedItems.map(item =>
        supabase
          .from(tableName)
          .update({ ordem: item.ordem })
          .eq('id', item.id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-admin', tipo] });
      toast.success('Ordem atualizada com sucesso');
    },
    onError: (error: any) => {
      console.error('Erro ao reordenar:', error);
      toast.error('Erro ao reordenar itens');
    }
  });

  return {
    items: items || [],
    statistics,
    isLoading,
    createItem: createItem.mutate,
    updateItem: updateItem.mutate,
    deleteItem: deleteItem.mutate,
    toggleAtivo: toggleAtivo.mutate,
    reorderItems: reorderItems.mutate,
    isPending: createItem.isPending || updateItem.isPending || deleteItem.isPending || toggleAtivo.isPending || reorderItems.isPending
  };
};
