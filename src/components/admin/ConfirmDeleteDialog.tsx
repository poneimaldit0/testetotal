
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  orcamentoId: string;
  isLoading: boolean;
}

export const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  orcamentoId,
  isLoading
}) => {
  const [confirmText, setConfirmText] = useState('');
  const shortId = orcamentoId.slice(-8);
  const isConfirmValid = confirmText === shortId;

  const handleConfirm = async () => {
    if (isConfirmValid) {
      await onConfirm();
      setConfirmText('');
      onClose();
    }
  };

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Confirmar Exclusão
          </DialogTitle>
          <DialogDescription className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 font-medium mb-2">
                ⚠️ ATENÇÃO: Esta ação é irreversível!
              </p>
              <p className="text-red-700 text-sm">
                Você está prestes a excluir permanentemente o orçamento e TODOS os dados relacionados:
              </p>
              <ul className="text-red-700 text-sm mt-2 list-disc list-inside space-y-1">
                <li>Todas as candidaturas de fornecedores</li>
                <li>Todas as inscrições</li>
                <li>Todos os arquivos anexados</li>
                <li>Histórico de acompanhamento</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-gray-800 font-medium">
                Orçamento: #{shortId}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="confirm-text" className="text-sm font-medium">
              Para confirmar, digite os últimos 8 caracteres do ID: <span className="font-mono font-bold">{shortId}</span>
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Digite aqui..."
              className="mt-1"
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
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
            disabled={!isConfirmValid || isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir Permanentemente'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
