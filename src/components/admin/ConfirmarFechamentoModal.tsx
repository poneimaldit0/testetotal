import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Lock } from 'lucide-react';
import { Orcamento } from '@/types';

interface ConfirmarFechamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (motivo?: string) => Promise<void>;
  orcamento: Orcamento | null;
  isLoading: boolean;
}

export const ConfirmarFechamentoModal: React.FC<ConfirmarFechamentoModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  orcamento,
  isLoading,
}) => {
  const [motivo, setMotivo] = useState('');

  const handleConfirm = async () => {
    await onConfirm(motivo.trim() || undefined);
    setMotivo('');
  };

  const handleClose = () => {
    setMotivo('');
    onClose();
  };

  if (!orcamento) return null;

  const empresasInscritas = orcamento.quantidadeEmpresas || 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Fechar Orçamento Manualmente
          </DialogTitle>
          <DialogDescription className="text-left pt-2">
            Este orçamento tem <strong>{empresasInscritas}</strong> fornecedor{empresasInscritas !== 1 ? 'es' : ''} inscrito{empresasInscritas !== 1 ? 's' : ''}. Recomendado mínimo de 2 para comparação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <p className="font-medium mb-2">Ao fechar manualmente:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-700">
              <li>Os dados de contato serão liberados para os fornecedores inscritos</li>
              <li>Novas inscrições não serão mais permitidas</li>
              <li>Esta ação <strong>não pode ser desfeita</strong></li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo" className="text-sm font-medium">
              Motivo do fechamento <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="motivo"
              placeholder="Ex: Cliente solicitou encerramento antecipado..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              'Fechando...'
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Confirmar Fechamento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
