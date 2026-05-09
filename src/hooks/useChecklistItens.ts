import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChecklistItem {
  id: string;
  categoria: string;
  nome: string;
  descricao?: string;
  ordem: number;
  ativo: boolean;
}

export interface ChecklistItemsByCategory {
  [categoria: string]: ChecklistItem[];
}

export const useChecklistItens = () => {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [itemsByCategory, setItemsByCategory] = useState<ChecklistItemsByCategory>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const carregarItens = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('checklist_itens')
        .select('*')
        .eq('ativo', true)
        .order('ordem');

      if (error) throw error;

      setItems(data || []);
      
      // Organizar por categoria
      const organized = (data || []).reduce((acc: ChecklistItemsByCategory, item) => {
        if (!acc[item.categoria]) {
          acc[item.categoria] = [];
        }
        acc[item.categoria].push(item);
        return acc;
      }, {});
      
      setItemsByCategory(organized);
    } catch (error: any) {
      console.error('Erro ao carregar itens do checklist:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os itens do checklist",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarItens();
  }, []);

  return {
    items,
    itemsByCategory,
    loading,
    recarregar: carregarItens,
  };
};