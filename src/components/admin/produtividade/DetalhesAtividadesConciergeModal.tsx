import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDetalhesAtividadesConcierge } from "@/hooks/useDetalhesAtividadesConcierge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ClipboardCheck, 
  User, 
  Calendar,
  FileText,
  Hash,
  MapPin,
  RefreshCw
} from "lucide-react";

interface DetalhesAtividadesConciergeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuarioId: string | null;
  nomeUsuario: string;
  dataInicio: string;
  dataFim: string;
  tipoCrm?: 'orcamentos' | 'marcenaria';
}

export function DetalhesAtividadesConciergeModal({
  open,
  onOpenChange,
  usuarioId,
  nomeUsuario,
  dataInicio,
  dataFim,
  tipoCrm
}: DetalhesAtividadesConciergeModalProps) {
  const { data: atividades, isLoading } = useDetalhesAtividadesConcierge(
    usuarioId,
    dataInicio,
    dataFim,
    tipoCrm
  );

  const getTipoBadge = (tipo: 'orcamentos' | 'marcenaria') => {
    return tipo === 'orcamentos' 
      ? <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20">
          📊 Orçamentos
        </Badge>
      : <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20">
          🪵 Marcenaria
        </Badge>;
  };

  const getTipoAtividadeBadge = (tipoAtividade: 'checklist' | 'tarefa') => {
    return tipoAtividade === 'checklist'
      ? <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20">
          📋 Checklist
        </Badge>
      : <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20">
          ✅ Tarefa
        </Badge>;
  };

  const getEtapaBadge = (etapa: string) => {
    return (
      <Badge variant="secondary" className="text-xs">
        <MapPin className="h-3 w-3 mr-1" />
        {etapa.replace(/_/g, ' ')}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ClipboardCheck className="h-6 w-6" />
            Detalhes de Atividades - {nomeUsuario}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {atividades?.length || 0} atividades concluídas no período
            {atividades && atividades.length > 0 && (
              <span className="ml-2">
                ({atividades.filter(a => a.tipoAtividade === 'checklist').length} checklist + {atividades.filter(a => a.tipoAtividade === 'tarefa').length} tarefas)
              </span>
            )}
          </p>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : atividades && atividades.length > 0 ? (
            <div className="space-y-3">
              {atividades.map((atividade) => (
                <div
                  key={atividade.id}
                  className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getTipoBadge(atividade.tipo)}
                        {getTipoAtividadeBadge(atividade.tipoAtividade)}
                        {getEtapaBadge(atividade.etapa)}
                      </div>
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <span className="font-medium">{atividade.itemTitulo}</span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1 justify-end">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(atividade.dataConclusao), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <div className="text-xs">
                        {format(new Date(atividade.dataConclusao), "HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Cliente:</span>
                      <span className="font-medium">{atividade.clienteNome}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Código:</span>
                      <span className="font-medium font-mono">{atividade.codigo}</span>
                    </div>
                  </div>

                  {atividade.observacao && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Observação:</span> {atividade.observacao}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Nenhuma atividade encontrada no período selecionado
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
