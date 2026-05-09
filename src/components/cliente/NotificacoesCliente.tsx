import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Bell, CheckCircle2, AlertCircle, Info, Package, Calendar, FileText, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface NotificacoesClienteProps {}

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  data_criacao: string;
  dados_extras?: any;
  referencia_id?: string;
  tipo_referencia?: string;
}

const getNotificationIcon = (tipo: string) => {
  switch (tipo) {
    case 'medicao_enviada':
      return <FileText className="w-4 h-4" />;
    case 'cronograma_atualizado':
      return <Calendar className="w-4 h-4" />;
    case 'material_solicitado':
      return <Package className="w-4 h-4" />;
    case 'diario_atualizado':
      return <Clock className="w-4 h-4" />;
    case 'contrato_assinado':
      return <CheckCircle2 className="w-4 h-4" />;
    case 'alerta':
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <Info className="w-4 h-4" />;
  }
};

const getNotificationColor = (tipo: string) => {
  switch (tipo) {
    case 'medicao_enviada':
      return 'bg-blue-50 border-blue-200';
    case 'cronograma_atualizado':
      return 'bg-green-50 border-green-200';
    case 'material_solicitado':
      return 'bg-purple-50 border-purple-200';
    case 'diario_atualizado':
      return 'bg-yellow-50 border-yellow-200';
    case 'contrato_assinado':
      return 'bg-emerald-50 border-emerald-200';
    case 'alerta':
      return 'bg-red-50 border-red-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

const getBadgeVariant = (tipo: string) => {
  switch (tipo) {
    case 'medicao_enviada':
      return 'bg-blue-100 text-blue-800';
    case 'cronograma_atualizado':
      return 'bg-green-100 text-green-800';
    case 'material_solicitado':
      return 'bg-purple-100 text-purple-800';
    case 'diario_atualizado':
      return 'bg-yellow-100 text-yellow-800';
    case 'contrato_assinado':
      return 'bg-emerald-100 text-emerald-800';
    case 'alerta':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const NotificacoesCliente: React.FC<NotificacoesClienteProps> = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notificacoes = [], isLoading } = useQuery({
    queryKey: ['notificacoes-cliente', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('notificacoes_sistema')
        .select('*')
        .eq('usuario_id', user.id)
        .order('data_criacao', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notificacao[];
    },
    enabled: !!user?.id
  });

  const marcarComoLidaMutation = useMutation({
    mutationFn: async (notificacaoId: string) => {
      const { error } = await supabase
        .from('notificacoes_sistema')
        .update({ lida: true })
        .eq('id', notificacaoId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes-cliente'] });
    },
    onError: (error) => {
      console.error('Erro ao marcar notificação como lida:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar a notificação como lida.",
        variant: "destructive",
      });
    }
  });

  const marcarTodasComoLidasMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      
      const { error } = await supabase
        .from('notificacoes_sistema')
        .update({ lida: true })
        .eq('usuario_id', user.id)
        .eq('lida', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes-cliente'] });
      toast({
        title: "Sucesso",
        description: "Todas as notificações foram marcadas como lidas.",
      });
    },
    onError: (error) => {
      console.error('Erro ao marcar todas como lidas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar todas as notificações como lidas.",
        variant: "destructive",
      });
    }
  });

  const handleNotificationClick = (notificacao: Notificacao) => {
    if (!notificacao.lida) {
      marcarComoLidaMutation.mutate(notificacao.id);
    }
  };

  const notificacoes_nao_lidas = notificacoes.filter(n => !n.lida).length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando notificações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
            {notificacoes_nao_lidas > 0 && (
              <Badge variant="destructive" className="text-xs">
                {notificacoes_nao_lidas}
              </Badge>
            )}
          </div>
          {notificacoes_nao_lidas > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => marcarTodasComoLidasMutation.mutate()}
              disabled={marcarTodasComoLidasMutation.isPending}
            >
              Marcar todas como lidas
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notificacoes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma notificação encontrada.</p>
            <p className="text-sm">Você receberá notificações sobre o andamento da sua obra aqui.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {notificacoes.map((notificacao, index) => (
                <div key={notificacao.id}>
                  <div
                    className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                      !notificacao.lida 
                        ? getNotificationColor(notificacao.tipo) 
                        : 'bg-muted/30 border-muted'
                    }`}
                    onClick={() => handleNotificationClick(notificacao)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-1 rounded-full ${
                        !notificacao.lida ? 'bg-white' : 'bg-muted'
                      }`}>
                        {getNotificationIcon(notificacao.tipo)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`font-medium text-sm ${
                            !notificacao.lida ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {notificacao.titulo}
                          </h4>
                          {!notificacao.lida && (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                          )}
                        </div>
                        
                        <p className={`text-xs ${
                          !notificacao.lida ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {notificacao.mensagem}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <Badge className={getBadgeVariant(notificacao.tipo)} variant="outline">
                            {notificacao.tipo.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notificacao.data_criacao), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {index < notificacoes.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};