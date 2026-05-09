import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Snowflake } from 'lucide-react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useCongelarOrcamento } from '@/hooks/useCRMOrcamentos';
import { OrcamentoCRMComChecklist } from '@/types/crm';

interface ModalCongelarOrcamentoProps {
  orcamento: OrcamentoCRMComChecklist;
  open: boolean;
  onClose: () => void;
}

export const ModalCongelarOrcamento = ({ 
  orcamento, 
  open, 
  onClose 
}: ModalCongelarOrcamentoProps) => {
  const { congelarOrcamento, isCongelando } = useCongelarOrcamento();
  
  const nomeCliente = orcamento.dados_contato?.nome || 'Cliente';
  const dataMinima = addDays(new Date(), 1);
  
  const [dataReativacao, setDataReativacao] = useState<Date | undefined>(addDays(new Date(), 30));
  const [motivo, setMotivo] = useState('');
  const [tituloTarefa, setTituloTarefa] = useState(`🔔 Reativar Lead - ${nomeCliente}`);
  const [descricaoTarefa, setDescricaoTarefa] = useState('');

  const handleCongelar = () => {
    if (!dataReativacao || !tituloTarefa.trim()) return;

    congelarOrcamento({
      orcamentoId: orcamento.id,
      dataReativacao: format(dataReativacao, 'yyyy-MM-dd'),
      motivo: motivo || undefined,
      tarefa: {
        titulo: tituloTarefa.trim(),
        descricao: descricaoTarefa.trim() || undefined
      }
    }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  const isDataValida = dataReativacao && !isBefore(startOfDay(dataReativacao), startOfDay(dataMinima));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Snowflake className="h-5 w-5 text-blue-500" />
            Congelar Lead
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <p className="font-medium mb-1">O que acontece ao congelar:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Lead fica em seção minimizada na mesma etapa</li>
              <li>Não gera alertas de tarefas/checklist atrasados</li>
              <li>Não é contabilizado nas métricas ativas</li>
              <li>Uma tarefa de reativação é criada automaticamente</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="data-reativacao" className="text-sm font-medium">
              Data de Reativação <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dataReativacao && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataReativacao ? (
                    format(dataReativacao, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  ) : (
                    "Selecione a data"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataReativacao}
                  onSelect={setDataReativacao}
                  disabled={(date) => isBefore(date, dataMinima)}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            {!isDataValida && dataReativacao && (
              <p className="text-xs text-destructive">A data deve ser futura</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo" className="text-sm font-medium">
              Motivo do Congelamento (opcional)
            </Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Cliente viajando, retorna em janeiro..."
              rows={2}
            />
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Tarefa de Reativação</p>
            
            <div className="space-y-2">
              <Label htmlFor="titulo-tarefa" className="text-sm font-medium">
                Título da Tarefa <span className="text-destructive">*</span>
              </Label>
              <Input
                id="titulo-tarefa"
                value={tituloTarefa}
                onChange={(e) => setTituloTarefa(e.target.value)}
                placeholder="Título da tarefa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao-tarefa" className="text-sm font-medium">
                Descrição (opcional)
              </Label>
              <Textarea
                id="descricao-tarefa"
                value={descricaoTarefa}
                onChange={(e) => setDescricaoTarefa(e.target.value)}
                placeholder="Detalhes sobre o que fazer ao reativar..."
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCongelando}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCongelar} 
            disabled={!isDataValida || !tituloTarefa.trim() || isCongelando}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isCongelando ? (
              <>Congelando...</>
            ) : (
              <>
                <Snowflake className="h-4 w-4 mr-2" />
                Congelar Lead
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};