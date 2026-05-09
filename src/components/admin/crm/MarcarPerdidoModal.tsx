import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MotivoPerda, OrcamentoCRMComChecklist } from '@/types/crm';
import { useToast } from '@/hooks/use-toast';

interface MarcarPerdidoModalProps {
  orcamento: OrcamentoCRMComChecklist | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (motivoPerdaId: string, justificativa?: string) => void;
  motivosPerda: MotivoPerda[];
  isProcessando?: boolean;
}

export function MarcarPerdidoModal({ 
  orcamento, 
  isOpen, 
  onClose, 
  onConfirm, 
  motivosPerda,
  isProcessando = false
}: MarcarPerdidoModalProps) {
  const { toast } = useToast();
  const [motivoSelecionado, setMotivoSelecionado] = useState<string>('');
  const [justificativa, setJustificativa] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setMotivoSelecionado('');
      setJustificativa('');
    }
  }, [isOpen]);

  const handleConfirmar = () => {
    if (!motivoSelecionado) {
      toast({
        variant: 'destructive',
        title: 'Motivo obrigatório',
        description: 'Selecione um motivo para a perda do orçamento'
      });
      return;
    }

    onConfirm(motivoSelecionado, justificativa);
    onClose();
  };

  if (!orcamento) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>❌ Marcar Orçamento como Perdido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Orçamento:</strong> {orcamento.codigo_orcamento}<br />
              <strong>Cliente:</strong> {orcamento.dados_contato?.nome || 'N/A'}<br />
              <strong>Valor Lead:</strong> {orcamento.valor_lead_estimado 
                ? `R$ ${orcamento.valor_lead_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                : 'Não informado'}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo da Perda *</Label>
            <Select value={motivoSelecionado} onValueChange={setMotivoSelecionado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo..." />
              </SelectTrigger>
              <SelectContent>
                {motivosPerda.map((motivo) => (
                  <SelectItem key={motivo.id} value={motivo.id}>
                    {motivo.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {motivoSelecionado && (
              <p className="text-xs text-muted-foreground">
                {motivosPerda.find(m => m.id === motivoSelecionado)?.descricao}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="justificativa">Justificativa (Opcional)</Label>
            <Textarea
              id="justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva mais detalhes sobre a perda deste orçamento..."
              rows={4}
            />
          </div>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Esta ação moverá o orçamento para a coluna "Perdidos" (arquivada).
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessando}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirmar}
            disabled={isProcessando || !motivoSelecionado}
          >
            {isProcessando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Marcar como Perdido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
