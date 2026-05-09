import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useOrcamentoActions = (onSuccess?: () => Promise<void>) => {
  const [isLoading, setIsLoading] = useState(false);

  const pausarOrcamento = useCallback(async (orcamentoId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log('⏸️ Pausando orçamento:', orcamentoId);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('orcamentos')
        .update({
          status: 'pausado',
          data_fechamento_manual: new Date().toISOString(),
          fechado_por_id: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orcamentoId);

      if (error) {
        console.error('❌ Erro ao pausar orçamento:', error);
        toast({
          title: "Erro ao pausar",
          description: "Não foi possível pausar o orçamento. Tente novamente.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Orçamento pausado",
        description: "O orçamento foi pausado e não aceitará novas inscrições.",
      });

      if (onSuccess) await onSuccess();
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao pausar:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess]);

  const reabrirOrcamento = useCallback(async (orcamentoId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log('▶️ Reabrindo orçamento:', orcamentoId);
      
      const { error } = await supabase
        .from('orcamentos')
        .update({
          status: 'aberto',
          data_fechamento_manual: null,
          fechado_por_id: null,
          motivo_fechamento_manual: null,
          fechado_manualmente: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orcamentoId);

      if (error) {
        console.error('❌ Erro ao reabrir orçamento:', error);
        toast({
          title: "Erro ao reabrir",
          description: "Não foi possível reabrir o orçamento. Tente novamente.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Orçamento reaberto",
        description: "O orçamento está novamente aberto para inscrições.",
      });

      if (onSuccess) await onSuccess();
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao reabrir:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess]);

  const fecharOrcamentoManualmente = useCallback(async (
    orcamentoId: string, 
    motivo?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log('🔒 Fechando orçamento manualmente:', orcamentoId);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('orcamentos')
        .update({
          status: 'fechado',
          fechado_manualmente: true,
          motivo_fechamento_manual: motivo || null,
          data_fechamento_manual: new Date().toISOString(),
          fechado_por_id: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orcamentoId);

      if (error) {
        console.error('❌ Erro ao fechar orçamento:', error);
        toast({
          title: "Erro ao fechar",
          description: "Não foi possível fechar o orçamento. Tente novamente.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Orçamento fechado",
        description: "O orçamento foi fechado manualmente. Os dados de contato foram liberados.",
      });

      if (onSuccess) await onSuccess();
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao fechar:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess]);

  return {
    pausarOrcamento,
    reabrirOrcamento,
    fecharOrcamentoManualmente,
    isLoading,
  };
};
