import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, AlertCircle, Clock, FileText, Hammer, Calendar, Zap, AlertTriangle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotificacoesFornecedor } from '@/hooks/useNotificacoesFornecedor';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const getNotificationIcon = (tipo: string) => {
  switch (tipo) {
    case 'proposta_aceita':
      return <CheckCircle className="w-5 h-5 text-success" />;
    case 'revisao_solicitada':
      return <AlertCircle className="w-5 h-5 text-warning" />;
    case 'revisao_concluida':
      return <FileText className="w-5 h-5 text-info" />;
    case 'contrato_enviado':
      return <FileText className="w-5 h-5 text-primary" />;
    case 'medicao_solicitada':
      return <Hammer className="w-5 h-5 text-secondary" />;
    case 'cronograma_atualizado':
      return <Calendar className="w-5 h-5 text-muted-foreground" />;
    case 'crm_movimentacao_automatica':
      return <Zap className="w-5 h-5 text-blue-500" />;
    case 'crm_atividade_orcamento_arquivado':
      return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    default:
      return <Bell className="w-5 h-5 text-muted-foreground" />;
  }
};

const getNotificationColor = (tipo: string) => {
  switch (tipo) {
    case 'proposta_aceita':
      return 'bg-success/10 border-success/20';
    case 'revisao_solicitada':
      return 'bg-warning/10 border-warning/20';
    case 'revisao_concluida':
      return 'bg-info/10 border-info/20';
    case 'contrato_enviado':
      return 'bg-primary/10 border-primary/20';
    case 'medicao_solicitada':
      return 'bg-secondary/10 border-secondary/20';
    case 'crm_movimentacao_automatica':
      return 'bg-blue-50 border-blue-200';
    case 'crm_atividade_orcamento_arquivado':
      return 'bg-orange-50 border-orange-300';
    default:
      return 'bg-muted/10 border-muted/20';
  }
};

interface NotificationCenterProps {
  children: React.ReactNode;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ children }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { 
    notificacoes, 
    loading, 
    naoLidas, 
    marcarComoLida, 
    marcarTodasComoLidas 
  } = useNotificacoesFornecedor();

  const handleNotificationClick = (notificacao: any) => {
    if (!notificacao.lida) {
      marcarComoLida(notificacao.id);
    }
    
    // Navegar para CRM se for notificação de movimentação
    if (['crm_movimentacao_automatica', 'crm_atividade_orcamento_arquivado'].includes(notificacao.tipo)) {
      if (notificacao.referencia_id && notificacao.tipo_referencia === 'orcamento_crm') {
        setOpen(false);
        navigate(`/dashboard?view=crm-orcamentos&orcamentoId=${notificacao.referencia_id}`);
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <div className="relative">
          {children}
          {naoLidas > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center text-xs px-1"
            >
              {naoLidas > 9 ? '9+' : naoLidas}
            </Badge>
          )}
        </div>
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificações
            {naoLidas > 0 && (
              <Badge variant="secondary">
                {naoLidas} nova{naoLidas > 1 ? 's' : ''}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Acompanhe atualizações sobre suas propostas e projetos
          </SheetDescription>
        </SheetHeader>

        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-muted-foreground">
            {notificacoes.length} notificação{notificacoes.length !== 1 ? 'ões' : ''}
          </span>
          {naoLidas > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={marcarTodasComoLidas}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[calc(100vh-200px)] mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : notificacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhuma notificação encontrada
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notificacoes.map((notificacao, index) => (
                <div key={notificacao.id}>
                  <div
                    className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                      !notificacao.lida 
                        ? getNotificationColor(notificacao.tipo) 
                        : 'bg-muted/20 border-muted/40'
                    }`}
                    onClick={() => handleNotificationClick(notificacao)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notificacao.tipo)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-sm font-medium ${
                            !notificacao.lida ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {notificacao.titulo}
                          </h4>
                          {!notificacao.lida && (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                          )}
                        </div>
                        
                        <p className={`text-sm mt-1 ${
                          !notificacao.lida ? 'text-muted-foreground' : 'text-muted-foreground/80'
                        }`}>
                          {notificacao.mensagem}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="w-3 h-3 text-muted-foreground" />
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
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};