import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LeadMarcenariaComChecklist, MotivoPerda_Marcenaria } from '@/types/crmMarcenaria';
import { useToast } from '@/hooks/use-toast';

interface MarcarPerdidoModalMarcenariasProps {
  lead: LeadMarcenariaComChecklist | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (motivoPerdaId: string, justificativa?: string) => void;
  motivosPerda: MotivoPerda_Marcenaria[];
  isProcessando?: boolean;
}

export function MarcarPerdidoModalMarcenaria({ 
  lead, 
  isOpen, 
  onClose, 
  onConfirm, 
  motivosPerda,
  isProcessando = false
}: MarcarPerdidoModalMarcenariasProps) {
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
        description: 'Selecione um motivo para a perda do lead'
      });
      return;
    }

    onConfirm(motivoSelecionado, justificativa || undefined);
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Marcar Lead como Perdido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Lead:</strong> {lead.cliente_nome || 'N/A'}<br />
              {lead.codigo_orcamento && (
                <>
                  <strong>Código:</strong> {lead.codigo_orcamento}<br />
                </>
              )}
              <strong>Consultor:</strong> {lead.consultor_nome || 'Não apropriado'}
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
              placeholder="Descreva mais detalhes sobre a perda deste lead..."
              rows={4}
            />
          </div>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Esta ação moverá o lead para a etapa "Perdido" (arquivada).
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
            <XCircle className="mr-2 h-4 w-4" />
            Marcar como Perdido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
