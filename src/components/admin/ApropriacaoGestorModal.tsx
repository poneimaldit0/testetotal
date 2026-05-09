import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GestorSelector } from './GestorSelector';
import { useGestorConta } from '@/hooks/useGestorConta';
import { Orcamento } from '@/types';

interface ApropriacaoGestorModalProps {
  isOpen: boolean;
  onClose: () => void;
  orcamento: Orcamento | null;
  onSuccess: () => void;
}

export const ApropriacaoGestorModal: React.FC<ApropriacaoGestorModalProps> = ({
  isOpen,
  onClose,
  orcamento,
  onSuccess,
}) => {
  const [selectedGestor, setSelectedGestor] = useState<string | null>(
    orcamento?.gestor_conta_id || null
  );
  const [loading, setLoading] = useState(false);
  const { apropriarGestor } = useGestorConta();

  const handleSubmit = async () => {
    if (!orcamento) return;

    setLoading(true);
    try {
      console.log('🔄 Modal: Iniciando apropriação para orçamento:', orcamento.id);
      const success = await apropriarGestor(orcamento.id, selectedGestor);
      
      if (success) {
        console.log('✅ Modal: Apropriação concluída, notificando sucesso...');
        
        // Aguardar um pouco mais para garantir sincronização
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        onSuccess();
        onClose();
        
        console.log('✅ Modal: Callback de sucesso executado');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedGestor(orcamento?.gestor_conta_id || null);
    onClose();
  };

  if (!orcamento) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apropriar Gestor de Conta</DialogTitle>
          <DialogDescription>
            Selecione o gestor responsável pelo orçamento "{orcamento.id}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/30 p-3 rounded-lg text-sm">
            <div><strong>Necessidade:</strong> {orcamento.necessidade}</div>
            <div><strong>Local:</strong> {orcamento.local}</div>
            <div><strong>Status:</strong> {orcamento.status?.toUpperCase()}</div>
          </div>

          <GestorSelector
            value={selectedGestor || undefined}
            onValueChange={setSelectedGestor}
            label="Gestor Responsável"
            placeholder="Selecione o gestor ou deixe sem apropriação"
            disabled={loading}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Salvando..." : "Confirmar Apropriação"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};