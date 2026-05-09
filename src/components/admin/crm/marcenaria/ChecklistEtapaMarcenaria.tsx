import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, MessageSquare, CheckCircle2, AlertTriangle } from "lucide-react";
import { useChecklistMarcenaria } from "@/hooks/useChecklistMarcenaria";
import { MODELOS_MENSAGEM_MARCENARIA } from "@/constants/crmMarcenaria";
import { LeadMarcenariaComChecklist } from "@/types/crmMarcenaria";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChecklistEtapaMarcenariaProps {
  lead: LeadMarcenariaComChecklist;
  nomeConsultor: string;
}

export function ChecklistEtapaMarcenaria({ lead, nomeConsultor }: ChecklistEtapaMarcenariaProps) {
  const { progresso, isLoading, concluirItem, desfazerItem, isPending } = useChecklistMarcenaria(lead.id);
  const [observacoes, setObservacoes] = useState<Record<string, string>>({});
  const [editandoId, setEditandoId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card className="p-4">
        <p className="text-center text-muted-foreground">Carregando checklist...</p>
      </Card>
    );
  }

  if (progresso.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-center text-muted-foreground">
          Nenhum item de checklist para esta etapa
        </p>
      </Card>
    );
  }

  const totalItens = progresso.length;
  const itensConcluidos = progresso.filter(p => p.concluido).length;
  const percentualConcluido = Math.round((itensConcluidos / totalItens) * 100);
  const temPendencias = lead.tem_alerta_checklist;

  const handleToggleItem = (itemId: string, concluido: boolean) => {
    if (concluido) {
      desfazerItem(itemId);
    } else {
      if (editandoId === itemId) {
        concluirItem({ itemId, observacao: observacoes[itemId] });
        setEditandoId(null);
      } else {
        setEditandoId(itemId);
      }
    }
  };

  const handleEnviarMensagem = (itemChecklist: any) => {
    const nomeCliente = lead.cliente_nome || 'Cliente';
    const telefone = lead.cliente_telefone?.replace(/\D/g, '');
    
    if (!telefone) {
      return;
    }

    let mensagem = '';
    const key = itemChecklist.crm_marcenaria_checklist_etapas?.modelo_mensagem_key;

    if (key && MODELOS_MENSAGEM_MARCENARIA[key as keyof typeof MODELOS_MENSAGEM_MARCENARIA]) {
      const template = MODELOS_MENSAGEM_MARCENARIA[key as keyof typeof MODELOS_MENSAGEM_MARCENARIA];
      if (typeof template === 'function') {
        mensagem = template(nomeCliente, nomeConsultor);
      }
    }

    if (mensagem) {
      const url = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
      window.open(url, '_blank');
    }
  };

  return (
    <Card className="p-4 space-y-4">
      {/* Header com status */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="font-semibold flex items-center gap-2">
            Checklist da Etapa
            {temPendencias && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Pendências
              </Badge>
            )}
          </h3>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {lead.dias_na_etapa_atual} {lead.dias_na_etapa_atual === 1 ? 'dia' : 'dias'} na etapa
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{itensConcluidos}/{totalItens}</p>
          <p className="text-xs text-muted-foreground">itens concluídos</p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-medium">{percentualConcluido}%</span>
        </div>
        <Progress value={percentualConcluido} className="h-2" />
      </div>

      {/* Lista de itens */}
      <div className="space-y-3">
        {progresso.map((item) => {
          const itemData = item.crm_marcenaria_checklist_etapas;
          if (!itemData) return null;

          const atrasado = !item.concluido && lead.dias_na_etapa_atual >= itemData.dias_para_alerta;
          const isEditando = editandoId === item.id;

          return (
            <Card 
              key={item.id}
              className={`p-3 transition-all ${
                atrasado ? 'border-destructive bg-destructive/5' : ''
              } ${
                item.concluido ? 'bg-muted/50' : ''
              }`}
            >
              <div className="space-y-2">
                {/* Cabeçalho do item */}
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={item.concluido}
                    onCheckedChange={() => handleToggleItem(item.id, item.concluido)}
                    disabled={isPending}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className={`font-medium ${item.concluido ? 'line-through text-muted-foreground' : ''}`}>
                          {itemData.titulo}
                        </p>
                        {itemData.descricao && (
                          <p className="text-sm text-muted-foreground">
                            {itemData.descricao}
                          </p>
                        )}
                      </div>
                      {itemData.permite_whatsapp && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEnviarMensagem(item)}
                          disabled={!lead.cliente_telefone}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Alerta de prazo */}
                    {atrasado && (
                      <div className="flex items-center gap-1 text-xs text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Alertar após {itemData.dias_para_alerta} {itemData.dias_para_alerta === 1 ? 'dia' : 'dias'}</span>
                      </div>
                    )}

                    {/* Status de conclusão */}
                    {item.concluido && item.concluido_por_nome && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>
                          Concluído há {format(new Date(item.data_conclusao!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} por {item.concluido_por_nome}
                        </span>
                      </div>
                    )}

                    {/* Observação do item concluído */}
                    {item.concluido && item.observacao && (
                      <p className="text-xs text-muted-foreground italic bg-muted p-2 rounded">
                        💬 "{item.observacao}"
                      </p>
                    )}

                    {/* Campo de observação ao concluir */}
                    {isEditando && !item.concluido && (
                      <div className="space-y-2 pt-2">
                        <Textarea
                          placeholder="Adicione uma observação (opcional)"
                          value={observacoes[item.id] || ''}
                          onChange={(e) => setObservacoes(prev => ({ ...prev, [item.id]: e.target.value }))}
                          rows={2}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleToggleItem(item.id, false)}
                            disabled={isPending}
                          >
                            Concluir
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditandoId(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}
