import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GestorConta } from '@/types/orcamento';
import { useToast } from '@/hooks/use-toast';

export const useGestorConta = () => {
  const [gestores, setGestores] = useState<GestorConta[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const carregarGestores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('listar_gestores_conta');
      
      if (error) {
        console.error('Erro ao carregar gestores:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar gestores de conta",
          variant: "destructive",
        });
        return;
      }

      setGestores(data || []);
    } catch (error) {
      console.error('Erro ao carregar gestores:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar gestores de conta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const apropriarGestor = async (orcamentoId: string, gestorId: string | null) => {
    console.log('🔄 Iniciando apropriação gestor:', { orcamentoId, gestorId });
    
    try {
      const { data, error } = await supabase.rpc('apropriar_gestor_conta', {
        p_orcamento_id: orcamentoId,
        p_gestor_conta_id: gestorId,
      });

      if (error) {
        console.error('❌ Erro ao apropriar gestor:', error);
        toast({
          title: "Erro",
          description: error.message || "Erro ao apropriar gestor de conta",
          variant: "destructive",
        });
        return false;
      }

      const result = data as any;
      if (!result?.success) {
        console.error('❌ Falha na apropriação:', result);
        toast({
          title: "Erro",
          description: result?.message || "Erro ao apropriar gestor de conta",
          variant: "destructive",
        });
        return false;
      }

      console.log('✅ Apropriação realizada com sucesso:', result);
      
      // Aguardar um pouco para garantir que o banco foi atualizado
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Forçar limpeza do cache do Supabase
      await supabase.auth.refreshSession();
      
      toast({
        title: "Sucesso",
        description: result.message,
      });
      
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao apropriar gestor:', error);
      toast({
        title: "Erro",
        description: "Erro interno do sistema",
        variant: "destructive",
      });
      return false;
    }
  };

  const obterProximoGestor = async (): Promise<string | null> => {
    try {
      console.log('🔄 Buscando próximo gestor na fila...');
      
      const { data, error } = await supabase.rpc('obter_proximo_gestor_fila');
      
      if (error) {
        console.error('❌ Erro ao obter próximo gestor:', error);
        return null;
      }
      
      console.log('✅ Próximo gestor da fila:', data);
      return data;
    } catch (error) {
      console.error('❌ Erro inesperado ao obter próximo gestor:', error);
      return null;
    }
  };

  useEffect(() => {
    carregarGestores();
  }, []);

  return {
    gestores,
    loading,
    carregarGestores,
    apropriarGestor,
    obterProximoGestor,
  };
};