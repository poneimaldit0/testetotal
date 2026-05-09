import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Database, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Trash2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { usePropostaBackup } from '@/hooks/usePropostaBackup';
import { useDataRecovery } from '@/hooks/useDataRecovery';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BackupInfo {
  id: string;
  checklist_proposta_id: string;
  data_backup: string;
  motivo_backup: string;
  restored: boolean;
  respostas_count: number;
  valor_total_backup: number;
  fornecedor_nome: string;
  orcamento_necessidade: string;
}

export const BackupManagementPanel: React.FC = () => {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const { restaurarBackupProposta } = usePropostaBackup();
  const { detectarPropostasProblematicas, tentarRecuperarProposta } = useDataRecovery();
  const { toast } = useToast();

  useEffect(() => {
    carregarBackups();
  }, []);

  const carregarBackups = async () => {
    try {
      setLoading(true);
      
      const { data: backupsData, error } = await (supabase as any)
        .from('backups_revisoes_propostas')
        .select(`
          *,
          checklist_propostas!inner(
            candidatura_id,
            candidaturas_fornecedores!inner(
              fornecedor_id,
              orcamento_id,
              profiles(nome),
              orcamentos(necessidade)
            )
          )
        `)
        .order('data_backup', { ascending: false })
        .limit(50);

      if (error) throw error;

      const backupsFormatados = (backupsData || []).map((backup: any) => ({
        id: backup.id,
        checklist_proposta_id: backup.checklist_proposta_id,
        data_backup: backup.data_backup,
        motivo_backup: backup.motivo_backup,
        restored: backup.restored,
        respostas_count: Array.isArray(backup.respostas_backup) ? backup.respostas_backup.length : 0,
        valor_total_backup: backup.valor_total_backup || 0,
        fornecedor_nome: backup.checklist_propostas.candidaturas_fornecedores.profiles.nome || 'N/A',
        orcamento_necessidade: backup.checklist_propostas.candidaturas_fornecedores.orcamentos.necessidade || 'N/A'
      }));

      setBackups(backupsFormatados);

    } catch (error) {
      console.error('Erro ao carregar backups:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os backups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurarBackup = async (backupId: string, checklistPropostaId: string) => {
    try {
      setRestoring(backupId);
      
      const resultado = await restaurarBackupProposta(checklistPropostaId);
      
      if (resultado.success) {
        toast({
          title: "Backup Restaurado",
          description: `Proposta restaurada com sucesso. ${resultado.respostas_restauradas} itens recuperados.`,
        });
        
        // Recarregar lista
        carregarBackups();
      }
      
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
    } finally {
      setRestoring(null);
    }
  };

  const handleDetectarProblemas = async () => {
    try {
      setLoading(true);
      await detectarPropostasProblematicas();
      toast({
        title: "Detecção Concluída",
        description: "Verifique o painel de problemas de integridade para ver os resultados",
      });
    } catch (error) {
      console.error('Erro na detecção:', error);
    } finally {
      setLoading(false);
    }
  };

  const backupsNaoRestaurados = backups.filter(b => !b.restored);
  const backupsRecentes = backups.filter(b => {
    const dataBackup = new Date(b.data_backup);
    const hoje = new Date();
    const diferenca = hoje.getTime() - dataBackup.getTime();
    return diferenca < 7 * 24 * 60 * 60 * 1000; // 7 dias
  });

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{backups.length}</p>
                <p className="text-sm text-muted-foreground">Total Backups</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <div>
                <p className="text-2xl font-bold">{backupsNaoRestaurados.length}</p>
                <p className="text-sm text-muted-foreground">Não Restaurados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-info" />
              <div>
                <p className="text-2xl font-bold">{backupsRecentes.length}</p>
                <p className="text-sm text-muted-foreground">Últimos 7 Dias</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex gap-2">
            <Button 
              onClick={carregarBackups}
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button 
              onClick={handleDetectarProblemas}
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              <AlertTriangle className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Backups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Gerenciamento de Backups
          </CardTitle>
          <CardDescription>
            Visualize e gerencie backups de propostas criados automaticamente durante revisões.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && backups.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Carregando backups...</span>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum backup encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup) => (
                <div 
                  key={backup.id}
                  className={`border rounded-lg p-4 ${backup.restored ? 'bg-muted/30' : 'bg-background'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{backup.fornecedor_nome}</h4>
                        <Badge 
                          variant={backup.restored ? "default" : "outline"}
                          className={backup.restored ? "bg-success" : "border-warning text-warning"}
                        >
                          {backup.restored ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Restaurado
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Disponível
                            </>
                          )}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {backup.orcamento_necessidade}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>📅 {new Date(backup.data_backup).toLocaleString('pt-BR')}</span>
                        <span>📊 {backup.respostas_count} respostas</span>
                        <span>💰 R$ {backup.valor_total_backup.toFixed(2)}</span>
                      </div>
                      
                      <p className="text-xs bg-muted/50 p-2 rounded">
                        <strong>Motivo:</strong> {backup.motivo_backup}
                      </p>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      {!backup.restored && (
                        <Button
                          onClick={() => handleRestaurarBackup(backup.id, backup.checklist_proposta_id)}
                          disabled={restoring === backup.id}
                          size="sm"
                          className="bg-success hover:bg-success/90"
                        >
                          {restoring === backup.id ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                              Restaurando...
                            </>
                          ) : (
                            <>
                              <ArrowRight className="h-4 w-4 mr-1" />
                              Restaurar
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerta de Segurança */}
      <Alert className="border-warning/20 bg-warning/10">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertTitle>Importante - Segurança dos Dados</AlertTitle>
        <AlertDescription>
          <div className="space-y-2 mt-2">
            <p>• Backups são criados automaticamente antes de cada revisão</p>
            <p>• Apenas admins podem restaurar backups</p>
            <p>• Restaurações são permanentes e substituem dados atuais</p>
            <p>• Sempre verifique com o fornecedor antes de restaurar um backup</p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};