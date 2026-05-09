import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OrcamentoChecklistItem {
  id: string;
  orcamento_id: string;
  item_id: string;
  obrigatorio: boolean;
  item?: {
    id: string;
    categoria: string;
    nome: string;
    descricao?: string;
    ordem: number;
  };
}

export const useOrcamentoChecklist = (orcamentoId?: string) => {
  const [checklistItems, setChecklistItems] = useState<OrcamentoChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const carregarChecklistOrcamento = async () => {
    if (!orcamentoId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('orcamentos_checklist_itens')
        .select(`
          *,
          item:checklist_itens(*)
        `)
        .eq('orcamento_id', orcamentoId)
        .order('ordem', { foreignTable: 'checklist_itens' });

      if (error) throw error;

      setChecklistItems(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar checklist do orçamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o checklist do orçamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const salvarChecklistOrcamento = async (orcamentoId: string, selectedItems: Array<{ itemId: string; obrigatorio: boolean }>) => {
    try {
      setLoading(true);

      // Remover itens existentes
      await supabase
        .from('orcamentos_checklist_itens')
        .delete()
        .eq('orcamento_id', orcamentoId);

      // Inserir novos itens
      if (selectedItems.length > 0) {
        const itemsToInsert = selectedItems.map(item => ({
          orcamento_id: orcamentoId,
          item_id: item.itemId,
          obrigatorio: item.obrigatorio
        }));

        const { error } = await supabase
          .from('orcamentos_checklist_itens')
          .insert(itemsToInsert);

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Checklist do orçamento salvo com sucesso",
      });

      await carregarChecklistOrcamento();
    } catch (error: any) {
      console.error('Erro ao salvar checklist do orçamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o checklist do orçamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarChecklistOrcamento();
  }, [orcamentoId]);

  return {
    checklistItems,
    loading,
    carregarChecklistOrcamento,
    salvarChecklistOrcamento,
  };
};