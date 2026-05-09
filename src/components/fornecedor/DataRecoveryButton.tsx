import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database, RefreshCw, CheckCircle } from 'lucide-react';
import { useDataRecovery } from '@/hooks/useDataRecovery';
import { useToast } from '@/hooks/use-toast';

interface DataRecoveryButtonProps {
  checklistPropostaId: string;
  onRecoverySuccess?: () => void;
}

export const DataRecoveryButton: React.FC<DataRecoveryButtonProps> = ({
  checklistPropostaId,
  onRecoverySuccess
}) => {
  const [loading, setLoading] = useState(false);
  const { tentarRecuperarProposta } = useDataRecovery();
  const { toast } = useToast();

  const handleRecovery = async () => {
    try {
      setLoading(true);
      console.log('🔄 Tentando recuperar dados para proposta:', checklistPropostaId);
      
      await tentarRecuperarProposta(checklistPropostaId);
      
      toast({
        title: "Recuperação Concluída",
        description: "Tentativa de recuperação de dados realizada. Verifique se os itens foram restaurados.",
      });
      
      onRecoverySuccess?.();
      
    } catch (error) {
      console.error('❌ Erro na recuperação:', error);
      toast({
        title: "Erro na Recuperação",
        description: "Não foi possível recuperar os dados da proposta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleRecovery}
      disabled={loading}
      variant="outline"
      size="sm"
      className="border-warning text-warning hover:bg-warning/10"
    >
      {loading ? (
        <>
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          Recuperando...
        </>
      ) : (
        <>
          <Database className="h-4 w-4 mr-2" />
          Recuperar Dados
        </>
      )}
    </Button>
  );
};