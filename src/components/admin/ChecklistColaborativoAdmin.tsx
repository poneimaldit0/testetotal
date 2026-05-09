import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Users, CheckCircle, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChecklistColaborativoAdmin {
  id: string;
  orcamento_id: string;
  status: string;
  data_inicio: string;
  prazo_contribuicao: string;
  data_consolidacao?: string;
  total_fornecedores: number;
  contribuicoes_recebidas: number;
  orcamento?: {
    necessidade: string;
    codigo_orcamento: string;
  };
}

interface AtualizarStatusResponse {
  success: boolean;
  action?: string;
  message: string;
  contribuicoes?: number;
  total_fornecedores?: number;
}

export const ChecklistColaborativoAdmin: React.FC = () => {
  const [checklists, setChecklists] = useState<ChecklistColaborativoAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [processando, setProcessando] = useState<string | null>(null);
  const { toast } = useToast();

  const carregarChecklists = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('checklist_colaborativo')
        .select(`
          *,
          orcamento:orcamentos(necessidade, codigo_orcamento)
        `)
        .order('data_inicio', { ascending: false });

      if (error) throw error;
      setChecklists(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar checklists:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os checklists colaborativos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const forcarConsolidacao = async (checklistId: string) => {
    try {
      setProcessando(checklistId);
      
      // Chamar função RPC para forçar atualização
      const { data, error } = await supabase.rpc(
        'atualizar_status_checklist_colaborativo',
        { p_checklist_id: checklistId }
      );

      if (error) throw error;
      
      const response = data as unknown as AtualizarStatusResponse;
      
      if (response?.success) {
        toast({
          title: response.action === 'consolidado' ? "Checklist Consolidado" : "Status Atualizado",
          description: response.message,
          variant: "default",
        });
        
        // Recarregar dados
        await carregarChecklists();
      } else {
        throw new Error(response?.message || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error('Erro ao processar checklist:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível processar o checklist",
        variant: "destructive",
      });
    } finally {
      setProcessando(null);
    }
  };

  const verificarChecklists = async () => {
    try {
      setLoading(true);
      
      // Chamar função para verificar checklists expirados
      const { data, error } = await supabase.rpc('verificar_checklists_expirados');
      
      if (error) throw error;
      
      toast({
        title: "Verificação Concluída",
        description: `${data || 0} checklists foram consolidados automaticamente por timeout`,
        variant: "default",
      });
      
      await carregarChecklists();
    } catch (error: any) {
      console.error('Erro ao verificar checklists:', error);
      toast({
        title: "Erro",
        description: "Não foi possível verificar checklists expirados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (checklist: ChecklistColaborativoAdmin) => {
    const agora = new Date();
    const prazo = new Date(checklist.prazo_contribuicao);
    const prazoExpirado = prazo <= agora;

    switch (checklist.status) {
      case 'fase_colaborativa':
      case 'fase_colaborativa_ativa':
        if (prazoExpirado) {
          return {
            status: 'Prazo Expirado',
            color: 'bg-destructive/10 text-destructive-foreground',
            icon: AlertCircle
          };
        }
        return {
          status: 'Ativo',
          color: 'bg-primary/10 text-primary-foreground',
          icon: Users
        };
      case 'checklist_definido':
        return {
          status: 'Consolidado',
          color: 'bg-success/10 text-success-foreground',
          icon: CheckCircle
        };
      default:
        return {
          status: checklist.status,
          color: 'bg-muted',
          icon: AlertCircle
        };
    }
  };

  const calcularTempoRestante = (prazoStr: string) => {
    const agora = new Date();
    const prazo = new Date(prazoStr);
    const diferenca = prazo.getTime() - agora.getTime();
    
    if (diferenca <= 0) return "Expirado";
    
    const horas = Math.floor(diferenca / (1000 * 60 * 60));
    const dias = Math.floor(horas / 24);
    
    if (dias > 0) return `${dias}d ${horas % 24}h`;
    return `${horas}h`;
  };

  useEffect(() => {
    carregarChecklists();
    
    // Configurar auto-refresh a cada 30 segundos
    const interval = setInterval(carregarChecklists, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && checklists.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          Carregando checklists colaborativos...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Checklists Colaborativos</CardTitle>
              <CardDescription>
                Monitore e gerencie a consolidação automática dos checklists colaborativos
              </CardDescription>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={verificarChecklists}
                disabled={loading}
              >
                <Zap className="h-4 w-4 mr-2" />
                Verificar Timeouts
              </Button>
              <Button 
                variant="outline" 
                onClick={carregarChecklists}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Lista de checklists */}
      {checklists.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Nenhum checklist colaborativo encontrado
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {checklists.map((checklist) => {
            const statusInfo = getStatusInfo(checklist);
            const StatusIcon = statusInfo.icon;
            const progresso = Math.round((checklist.contribuicoes_recebidas / checklist.total_fornecedores) * 100);

            return (
              <Card key={checklist.id}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">
                            {checklist.orcamento?.codigo_orcamento || checklist.orcamento_id.slice(0, 8)}
                          </h3>
                          <Badge className={statusInfo.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {checklist.orcamento?.necessidade}
                        </p>
                      </div>
                      
                      {checklist.status !== 'checklist_definido' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => forcarConsolidacao(checklist.id)}
                          disabled={processando === checklist.id}
                        >
                          {processando === checklist.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-2" />
                              Forçar Consolidação
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Contribuições recebidas
                        </span>
                        <span className="font-medium">
                          {checklist.contribuicoes_recebidas}/{checklist.total_fornecedores} ({progresso}%)
                        </span>
                      </div>
                      <Progress value={progresso} className="h-2" />
                    </div>

                    {/* Detalhes */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Iniciado:</span>
                        <div className="font-medium">
                          {format(new Date(checklist.data_inicio), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-muted-foreground">Prazo:</span>
                        <div className="font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {calcularTempoRestante(checklist.prazo_contribuicao)}
                        </div>
                      </div>
                      
                      {checklist.data_consolidacao && (
                        <div>
                          <span className="text-muted-foreground">Consolidado:</span>
                          <div className="font-medium text-success">
                            {format(new Date(checklist.data_consolidacao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};