import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface CronogramaItem {
  id: string;
  contrato_id: string;
  fornecedor_id: string;
  item_checklist: string;
  categoria: string;
  data_inicio_prevista: string | null;
  data_fim_prevista: string | null;
  data_inicio_real: string | null;
  data_fim_real: string | null;
  porcentagem_conclusao: number;
  status: string;
  observacoes: string | null;
  ordem: number;
}

export const useCronogramaObra = (contratoId?: string) => {
  const [cronograma, setCronograma] = useState<CronogramaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const carregarCronograma = async () => {
    if (!contratoId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cronograma_obra')
        .select('*')
        .eq('contrato_id', contratoId)
        .order('ordem', { ascending: true });

      if (error) throw error;
      setCronograma(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar cronograma:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar cronograma da obra",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const atualizarItemCronograma = async (itemId: string, updates: Partial<CronogramaItem>) => {
    try {
      const { error } = await supabase
        .from('cronograma_obra')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;
      
      await carregarCronograma();
      toast({
        title: "Sucesso",
        description: "Item do cronograma atualizado com sucesso",
      });
    } catch (error: any) {
      console.error('Erro ao atualizar cronograma:', error);
      toast({
        title: "Erro", 
        description: "Erro ao atualizar item do cronograma",
        variant: "destructive",
      });
    }
  };

  const adicionarItemCronograma = async (novoItem: Omit<CronogramaItem, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('cronograma_obra')
        .insert([novoItem]);

      if (error) throw error;
      
      await carregarCronograma();
      toast({
        title: "Sucesso",
        description: "Item adicionado ao cronograma",
      });
    } catch (error: any) {
      console.error('Erro ao adicionar item:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar item ao cronograma", 
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    carregarCronograma();
  }, [contratoId]);

  return {
    cronograma,
    loading,
    carregarCronograma,
    atualizarItemCronograma,
    adicionarItemCronograma,
  };
};