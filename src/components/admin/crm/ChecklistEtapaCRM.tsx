import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  MessageSquare,
  X,
  MessageCircle
} from 'lucide-react';
import { useChecklistCRM } from '@/hooks/useChecklistCRM';
import { EtapaCRM } from '@/types/crm';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ChecklistEtapaCRMProps {
  orcamentoId: string;
  etapaAtual: EtapaCRM;
  temAlertas: boolean;
  diasNaEtapa: number;
  dadosCliente?: {
    nome: string;
    telefone: string;
  };
  nomeGestor?: string;
}

export const ChecklistEtapaCRM = ({
  orcamentoId,
  etapaAtual,
  temAlertas,
  diasNaEtapa,
  dadosCliente,
  nomeGestor
}: ChecklistEtapaCRMProps) => {
  const { progresso, isLoading, concluirItem, desfazerItem, isPending } = useChecklistCRM(orcamentoId);
  const [observacaoAberta, setObservacaoAberta] = useState<string | null>(null);
  const [observacaoTexto, setObservacaoTexto] = useState('');

  const total = progresso.length;
  const concluidos = progresso.filter(p => p.concluido).length;
  const percentual = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  const handleToggleItem = (itemId: string, concluido: boolean) => {
    if (concluido) {
      desfazerItem(itemId);
    } else {
      setObservacaoAberta(itemId);
    }
  };

  const handleSalvarObservacao = (itemId: string) => {
    concluirItem({ itemId, observacao: observacaoTexto || undefined });
    setObservacaoAberta(null);
    setObservacaoTexto('');
  };

  const handleWhatsAppItem = (tituloItem: string) => {
    if (!dadosCliente?.telefone || !dadosCliente?.nome) {
      toast.error('Dados de contato do cliente incompletos');
      return;
    }

    const nomeGestorFormatado = nomeGestor || 'a equipe';
    const mensagem = `Olá ${dadosCliente.nome}, tudo bem? Aqui é ${nomeGestorFormatado}, faço parte do time de relacionamento da Reforma100.`;
    
    const telefoneFormatado = dadosCliente.telefone.replace(/\D/g, '');
    const telefoneComCodigo = telefoneFormatado.startsWith('55') ? telefoneFormatado : `55${telefoneFormatado}`;
    const url = `https://api.whatsapp.com/send/?phone=${telefoneComCodigo}&text=${encodeURIComponent(mensagem)}&type=phone_number&app_absent=0`;
    
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Checklist da Etapa</CardTitle>
          <div className="flex items-center gap-2">
            {temAlertas && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                Pendências
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3 h-3" />
              {diasNaEtapa}d na etapa
            </Badge>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{concluidos}/{total} itens</span>
          </div>
          <Progress value={percentual} className="h-2" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {progresso.map((item) => {
          const diasParaAlerta = item.item.dias_para_alerta;
          const expirado = !item.concluido && diasNaEtapa >= diasParaAlerta;

          return (
            <div key={item.id} className={`space-y-2 p-3 rounded-lg border ${expirado ? 'border-destructive bg-destructive/5' : 'border-border'}`}>
              <div className="flex items-start gap-3">
                <Checkbox
                  id={item.id}
                  checked={item.concluido}
                  onCheckedChange={() => handleToggleItem(item.id, item.concluido)}
                  disabled={isPending}
                  className={item.concluido ? 'data-[state=checked]:bg-green-600' : ''}
                />
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <label 
                      htmlFor={item.id}
                      className={`text-sm font-medium cursor-pointer flex-1 ${item.concluido ? 'line-through text-muted-foreground' : ''}`}
                    >
                      {item.item.titulo}
                    </label>
                    
                    {dadosCliente?.telefone && !item.concluido && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWhatsAppItem(item.item.titulo)}
                        className="shrink-0 h-7 px-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                        title={`Enviar mensagem sobre: ${item.item.titulo}`}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  
                  {item.item.descricao && (
                    <p className="text-xs text-muted-foreground">{item.item.descricao}</p>
                  )}

                  {expirado && (
                    <div className="flex items-center gap-1 text-xs text-destructive">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Alertar após {diasParaAlerta} {diasParaAlerta === 1 ? 'dia' : 'dias'}</span>
                    </div>
                  )}

                  {item.concluido && item.data_conclusao && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                      <span>
                        Concluído {formatDistanceToNow(new Date(item.data_conclusao), { addSuffix: true, locale: ptBR })}
                      </span>
                      {item.concluido_por_nome && (
                        <span>por {item.concluido_por_nome}</span>
                      )}
                    </div>
                  )}

                  {item.observacao && (
                    <div className="flex items-start gap-1 text-xs bg-muted p-2 rounded">
                      <MessageSquare className="w-3 h-3 mt-0.5" />
                      <span>{item.observacao}</span>
                    </div>
                  )}
                </div>
              </div>

              {observacaoAberta === item.id && (
                <div className="space-y-2 pl-9">
                  <Textarea
                    placeholder="Adicionar observação (opcional)..."
                    value={observacaoTexto}
                    onChange={(e) => setObservacaoTexto(e.target.value)}
                    className="min-h-[60px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSalvarObservacao(item.id)}
                      disabled={isPending}
                    >
                      Marcar como Concluído
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setObservacaoAberta(null);
                        setObservacaoTexto('');
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {total === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            Nenhum item de checklist para esta etapa
          </div>
        )}
      </CardContent>
    </Card>
  );
};
