import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LeadMarcenariaComChecklist } from '@/types/crmMarcenaria';
import { useToast } from '@/hooks/use-toast';

interface MarcarGanhoModalProps {
  lead: LeadMarcenariaComChecklist | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (valorContrato: number, observacoes?: string) => void;
  isProcessando?: boolean;
}

export function MarcarGanhoModal({ 
  lead, 
  isOpen, 
  onClose, 
  onConfirm,
  isProcessando = false
}: MarcarGanhoModalProps) {
  const { toast } = useToast();
  const [valorContrato, setValorContrato] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setValorContrato('');
      setObservacoes('');
    }
  }, [isOpen]);

  const handleConfirmar = () => {
    const valor = parseFloat(valorContrato);
    
    if (!valorContrato || isNaN(valor) || valor <= 0) {
      toast({
        variant: 'destructive',
        title: 'Valor inválido',
        description: 'Informe um valor de contrato válido maior que zero'
      });
      return;
    }

    onConfirm(valor, observacoes || undefined);
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Marcar Lead como Ganho
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
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
            <Label htmlFor="valor">Valor do Contrato *</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0"
              value={valorContrato}
              onChange={(e) => setValorContrato(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (Opcional)</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Detalhes sobre a contratação, condições especiais, etc..."
              rows={4}
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Esta ação moverá o lead para a etapa "Ganho" (arquivada). O contrato será registrado com a data atual.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessando}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmar}
            disabled={isProcessando || !valorContrato}
            className="bg-green-600 hover:bg-green-700"
          >
            {isProcessando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CheckCircle className="mr-2 h-4 w-4" />
            Confirmar Ganho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
