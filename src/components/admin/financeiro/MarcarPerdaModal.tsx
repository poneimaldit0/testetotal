import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ContaReceber, MotivoPerda } from "@/types/financeiro";

interface MarcarPerdaModalProps {
  conta: ContaReceber | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (motivoPerdaId: string, justificativa?: string, dataPerda?: string) => void;
  motivosPerda: MotivoPerda[];
}

export function MarcarPerdaModal({ 
  conta, 
  isOpen, 
  onClose, 
  onConfirm, 
  motivosPerda 
}: MarcarPerdaModalProps) {
  const [motivoSelecionado, setMotivoSelecionado] = useState<string>("");
  const [justificativa, setJustificativa] = useState<string>("");
  const [dataPerda, setDataPerda] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset form quando modal abre
      setMotivoSelecionado("");
      setJustificativa("");
      setDataPerda(new Date());
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!motivoSelecionado) {
      toast({
        title: "Erro",
        description: "Selecione um motivo para a perda",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm(
        motivoSelecionado, 
        justificativa.trim() || undefined,
        format(dataPerda, "yyyy-MM-dd")
      );
      onClose();
      toast({
        title: "Sucesso",
        description: "Conta marcada como perda com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao marcar conta como perda",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const motivoSelecionadoObj = motivosPerda.find(m => m.id === motivoSelecionado);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-destructive">Marcar Conta como Perda</DialogTitle>
        </DialogHeader>
        
        {conta && (
          <div className="space-y-4">
            {/* Informações da conta */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-2">Informações da Conta</h4>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Cliente:</span> {conta.cliente_nome}</p>
                <p><span className="font-medium">Descrição:</span> {conta.descricao}</p>
                <p><span className="font-medium">Valor:</span> R$ {conta.valor_original.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p><span className="font-medium">Vencimento:</span> {format(new Date(conta.data_vencimento), "dd/MM/yyyy")}</p>
              </div>
            </div>

            {/* Motivo da perda */}
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo da Perda *</Label>
              <Select value={motivoSelecionado} onValueChange={setMotivoSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo da perda" />
                </SelectTrigger>
                <SelectContent>
                  {motivosPerda
                    .filter(motivo => motivo.ativo)
                    .sort((a, b) => a.ordem - b.ordem)
                    .map((motivo) => (
                      <SelectItem key={motivo.id} value={motivo.id}>
                        {motivo.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {motivoSelecionadoObj?.descricao && (
                <p className="text-sm text-muted-foreground">{motivoSelecionadoObj.descricao}</p>
              )}
            </div>

            {/* Data da perda */}
            <div className="space-y-2">
              <Label>Data da Perda</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataPerda && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataPerda ? format(dataPerda, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[100] bg-background border shadow-lg pointer-events-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={dataPerda}
                    onSelect={(date) => date && setDataPerda(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Justificativa */}
            <div className="space-y-2">
              <Label htmlFor="justificativa">Justificativa Adicional (Opcional)</Label>
              <Textarea
                id="justificativa"
                placeholder="Descreva detalhes específicos sobre a perda desta conta..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {justificativa.length}/500 caracteres
              </p>
            </div>

            {/* Aviso */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Atenção:</strong> Esta ação marcará a conta como uma perda definitiva. 
                O valor não será mais considerado nas projeções financeiras.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={isLoading || !motivoSelecionado}
          >
            {isLoading ? "Marcando..." : "Marcar como Perda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}