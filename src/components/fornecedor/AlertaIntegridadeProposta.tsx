import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Database, CheckCircle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePropostaBackup } from '@/hooks/usePropostaBackup';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AlertaIntegridadePropostaProps {
  checklistPropostaId: string;
  valorTotal: number;
  quantidadeRespostas: number;
  onDataRestored?: () => void;
}

export const AlertaIntegridadeProposta: React.FC<AlertaIntegridadePropostaProps> = ({
  checklistPropostaId,
  valorTotal,
  quantidadeRespostas,
  onDataRestored
}) => {
  const [showAlert, setShowAlert] = useState(false);
  const [backupsDisponiveis, setBackupsDisponiveis] = useState<any[]>([]);
  const [checkingBackups, setCheckingBackups] = useState(false);
  const { restaurarBackupProposta, listarBackupsDisponiveis, loading } = usePropostaBackup();
  const { toast } = useToast();

  // Verificar integridade quando componente carrega
  useEffect(() => {
    verificarIntegridade();
  }, [checklistPropostaId, valorTotal, quantidadeRespostas]);

  const verificarIntegridade = async () => {
    // Detectar problema de integridade: valor > 0 mas sem respostas
    const temProblemaIntegridade = valorTotal > 0 && quantidadeRespostas === 0;
    
    if (temProblemaIntegridade) {
      console.warn('⚠️ [AlertaIntegridade] Problema detectado:', {
        checklistPropostaId,
        valorTotal,
        quantidadeRespostas
      });
      
      setShowAlert(true);
      await buscarBackupsDisponiveis();
    } else {
      setShowAlert(false);
    }
  };

  const buscarBackupsDisponiveis = async () => {
    setCheckingBackups(true);
    try {
      const { success, backups } = await listarBackupsDisponiveis(checklistPropostaId);
      if (success) {
        const backupsValidos = (backups as any[]).filter((b: any) => 
          !b.restored && Array.isArray(b.respostas_backup) && b.respostas_backup.length > 0
        );
        setBackupsDisponiveis(backupsValidos);
      }
    } catch (error) {
      console.error('Erro ao buscar backups:', error);
    } finally {
      setCheckingBackups(false);
    }
  };

  const handleRestaurarBackup = async () => {
    const resultado = await restaurarBackupProposta(checklistPropostaId);
    
    if (resultado.success) {
      setShowAlert(false);
      onDataRestored?.();
      
      // Notificar fornecedor sobre a restauração
      toast({
        title: "Dados Restaurados com Sucesso",
        description: "Sua proposta foi restaurada a partir do backup mais recente. Verifique se todos os dados estão corretos.",
      });
    }
  };

  const handleDismissAlert = () => {
    setShowAlert(false);
    toast({
      title: "Alerta Ignorado",
      description: "Este alerta não será mostrado novamente para esta proposta. Se você perdeu dados, use o menu de recuperação no painel admin.",
      variant: "destructive",
    });
  };

  const notificarAdminSobreProblema = async () => {
    try {
      // Criar notificação para admin sobre problema de integridade
      const { error } = await supabase
        .from('notificacoes_sistema')
        .insert({
          usuario_id: '00000000-0000-0000-0000-000000000000', // Admin universal
          tipo: 'alerta_integridade',
          titulo: 'Problema de Integridade Detectado',
          mensagem: `Proposta ${checklistPropostaId} possui valor R$ ${valorTotal.toFixed(2)} mas 0 respostas de checklist`,
          referencia_id: checklistPropostaId,
          tipo_referencia: 'checklist_proposta',
          dados_extras: {
            valor_total: valorTotal,
            quantidade_respostas: quantidadeRespostas,
            backups_disponiveis: backupsDisponiveis.length
          }
        });

      if (error) throw error;

      toast({
        title: "Admin Notificado",
        description: "O problema foi reportado ao administrador do sistema.",
      });
    } catch (error) {
      console.error('Erro ao notificar admin:', error);
    }
  };

  if (!showAlert) {
    return null;
  }

  return (
    <Card className="border-destructive/50 bg-destructive/5 mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive text-lg">
              Problema de Integridade Detectado
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismissAlert}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-destructive/80">
          Sua proposta possui valor total de <strong>R$ {valorTotal.toFixed(2)}</strong> mas 
          nenhum item foi encontrado no checklist. Isso pode indicar perda de dados.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Alert className="border-warning/20 bg-warning/10">
          <Database className="h-4 w-4 text-warning" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>Possíveis Causas:</strong></p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Dados perdidos durante processo de revisão</li>
                <li>• Erro no sistema durante salvamento</li>
                <li>• Problema de sincronização no banco de dados</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-3">
          {checkingBackups ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Verificando backups disponíveis...</span>
            </div>
          ) : backupsDisponiveis.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="font-medium">Backup Encontrado!</span>
                <Badge variant="outline" className="border-success text-success">
                  {backupsDisponiveis.length} backup(s) disponível(is)
                </Badge>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleRestaurarBackup}
                  disabled={loading}
                  className="bg-success hover:bg-success/90"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Restaurando...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      Restaurar Dados do Backup
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={notificarAdminSobreProblema}
                >
                  Reportar Problema
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Backup mais recente: {new Date((backupsDisponiveis[0] as any)?.data_backup).toLocaleString('pt-BR')} 
                ({(backupsDisponiveis[0] as any)?.respostas_backup?.length || 0} itens)
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Nenhum backup disponível</span>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={notificarAdminSobreProblema}
                >
                  Reportar ao Administrador
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Recarregar Página
                </Button>
              </div>

              <Alert className="border-info/20 bg-info/10">
                <AlertDescription>
                  <strong>Recomendação:</strong> Entre em contato com o suporte ou 
                  refaça sua proposta com os valores corretos. O administrador foi 
                  notificado sobre este problema.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};