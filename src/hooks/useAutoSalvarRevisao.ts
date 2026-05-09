import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseAutoSalvarRevisaoProps {
  enabled: boolean;
  onSalvar: () => Promise<void>;
  data: any[];
  delay?: number;
}

export const useAutoSalvarRevisao = ({
  enabled,
  onSalvar,
  data,
  delay = 2000
}: UseAutoSalvarRevisaoProps) => {
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isInitialLoad = useRef(true);

  useEffect(() => {
    // Pular o primeiro carregamento para evitar salvamento desnecessário
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    // Só salvar se estiver habilitado e tiver dados
    if (!enabled || data.length === 0) {
      return;
    }

    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    console.log('🔄 [AutoSalvar] Agendando salvamento automático...');

    // Agendar salvamento
    timeoutRef.current = setTimeout(async () => {
      try {
        console.log('💾 [AutoSalvar] Executando salvamento automático...');
        await onSalvar();
        
        // Feedback visual discreto
        toast({
          title: "Alterações salvas",
          description: "Suas alterações foram salvas automaticamente",
          duration: 2000,
        });
        
        console.log('✅ [AutoSalvar] Salvamento automático concluído');
      } catch (error) {
        console.error('❌ [AutoSalvar] Erro no salvamento automático:', error);
        
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar automaticamente. Tente salvar manualmente.",
          variant: "destructive",
          duration: 4000,
        });
      }
    }, delay);

    // Cleanup do timeout
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, data, delay, onSalvar, toast]);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
};