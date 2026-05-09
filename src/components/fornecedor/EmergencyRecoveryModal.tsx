import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface EmergencyRecoveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklistPropostaId: string;
  valorTotal: number;
  candidaturaId: string;
  orcamentoId: string;
}

export const EmergencyRecoveryModal: React.FC<EmergencyRecoveryModalProps> = ({
  open,
  onOpenChange,
  checklistPropostaId,
  valorTotal,
  candidaturaId,
  orcamentoId
}) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'confirm' | 'processing' | 'success' | 'error'>('confirm');
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleEmergencyRecovery = async () => {
    try {
      setLoading(true);
      setStep('processing');

      console.log('🚨 [EmergencyRecovery] Iniciando recuperação emergencial para proposta:', checklistPropostaId);

      // Tentar recuperação usando a função RPC especializada
      console.log('🔄 Tentando recuperar dados usando função RPC...');
      
      const { data: resultado, error: recoveryError } = await supabase.rpc(
        'recuperar_proposta_problematica',
        { p_checklist_proposta_id: checklistPropostaId }
      );

      if (!recoveryError && resultado) {
        const resultObj = resultado as any;
        if (resultObj.success) {
          console.log('✅ Recuperação automática bem-sucedida!');
          setStep('success');
          toast({
            title: "Dados Recuperados!",
            description: `${resultObj.itens_recuperados || 0} itens foram recuperados. Total: R$ ${(resultObj.valor_total || 0).toFixed(2)}`,
          });
          return;
        }
      }

      // Se a função RPC não funcionou, fazer reset manual
      console.log('🔄 Função RPC não funcionou, fazendo reset manual...');
      
      // Resetar status da proposta para permitir nova edição
      const { error: resetError } = await supabase
        .from('checklist_propostas')
        .update({ 
          status: 'rascunho',
          valor_total_estimado: 0 // Reset do valor também
        })
        .eq('id', checklistPropostaId);

      if (resetError) throw resetError;

      // Atualizar revisão como concluída (problema "resolvido" com reset)
      const { error: revisaoError } = await supabase
        .from('revisoes_propostas_clientes')
        .update({ 
          status: 'concluida',
          observacoes_fornecedor: 'Proposta resetada devido a problemas de integridade de dados - dados perdidos durante revisão'
        })
        .eq('checklist_proposta_id', checklistPropostaId);

      if (revisaoError) throw revisaoError;

      console.log('✅ Reset manual bem-sucedido!');
      setStep('success');

      toast({
        title: "Proposta Resetada",
        description: "Sua proposta foi resetada. Você pode refazer sua proposta com os dados corretos a partir do zero.",
      });

    } catch (error: any) {
      console.error('❌ [EmergencyRecovery] Erro na recuperação:', error);
      setStep('error');
      toast({
        title: "Erro na Recuperação",
        description: error.message || "Não foi possível recuperar os dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoToProposta = () => {
    navigate(`/fornecedor/orcamento/${orcamentoId}?candidatura_id=${candidaturaId}`);
    onOpenChange(false);
  };

  const handleVoltarMeusOrcamentos = () => {
    navigate('/dashboard');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <DialogTitle>Problema de Integridade Detectado</DialogTitle>
          </div>
          <DialogDescription>
            Sua proposta possui valor de <strong>R$ {valorTotal.toFixed(2)}</strong> mas 
            não há itens no checklist. Isso indica perda de dados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'confirm' && (
            <>
              <Alert className="border-warning/20 bg-warning/10">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>O que aconteceu:</strong></p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• Durante a revisão, os dados do checklist foram perdidos</li>
                      <li>• A proposta mantém o valor total mas sem itens detalhados</li>
                      <li>• Isso impede a finalização da revisão</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>

              <Alert className="border-info/20 bg-info/10">
                <CheckCircle className="h-4 w-4 text-info" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>Como vamos resolver:</strong></p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• Tentaremos recuperar os dados automaticamente</li>
                      <li>• Se não conseguir, resetaremos a proposta</li>
                      <li>• Você poderá refazer sua proposta normalmente</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            </>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <h4 className="font-medium">Recuperando dados...</h4>
                <p className="text-sm text-muted-foreground">
                  Tentando restaurar sua proposta automaticamente
                </p>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle className="h-12 w-12 text-success" />
              <div className="text-center">
                <h4 className="font-medium text-success">Recuperação Concluída!</h4>
                <p className="text-sm text-muted-foreground">
                  {valorTotal > 0 
                    ? "Dados recuperados com sucesso. Você pode agora finalizar a revisão."
                    : "Proposta resetada. Você pode refazer sua proposta com os valores corretos."
                  }
                </p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <Alert className="border-destructive/20 bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>Não foi possível recuperar os dados automaticamente.</strong></p>
                  <p>Entre em contato com o suporte técnico informando:</p>
                  <div className="text-xs bg-background/50 p-2 rounded border mt-2">
                    <p>Proposta ID: {checklistPropostaId}</p>
                    <p>Valor afetado: R$ {valorTotal.toFixed(2)}</p>
                    <p>Data: {new Date().toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEmergencyRecovery} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Recuperar Dados
              </Button>
            </>
          )}

          {step === 'success' && (
            <>
              <Button variant="outline" onClick={handleVoltarMeusOrcamentos}>
                Voltar ao Dashboard
              </Button>
              <Button onClick={handleGoToProposta}>
                Ir para Proposta
              </Button>
            </>
          )}

          {(step === 'error' || step === 'processing') && (
            <Button variant="outline" onClick={handleVoltarMeusOrcamentos}>
              Voltar ao Dashboard
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};