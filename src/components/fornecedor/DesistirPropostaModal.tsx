import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield } from 'lucide-react';
import { useDesistenciasPropostas, MOTIVOS_DESISTENCIA, MotivoDesistencia } from '@/hooks/useDesistenciasPropostas';

interface DesistirPropostaModalProps {
  candidaturaId: string;
  orcamentoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const DesistirPropostaModal: React.FC<DesistirPropostaModalProps> = ({
  candidaturaId,
  orcamentoId,
  open,
  onOpenChange,
  onSuccess
}) => {
  const [motivoSelecionado, setMotivoSelecionado] = useState<MotivoDesistencia | ''>('');
  const [justificativa, setJustificativa] = useState('');
  const [confirmacao, setConfirmacao] = useState(false);
  const [loading, setLoading] = useState(false);
  const { solicitarDesistencia } = useDesistenciasPropostas();

  const handleSubmit = async () => {
    if (!motivoSelecionado || !justificativa.trim() || !confirmacao) {
      return;
    }

    setLoading(true);
    
    const sucesso = await solicitarDesistencia(candidaturaId, motivoSelecionado, justificativa.trim());
    
    if (sucesso) {
      setMotivoSelecionado('');
      setJustificativa('');
      setConfirmacao(false);
      onOpenChange(false);
      onSuccess();
    }
    
    setLoading(false);
  };

  const handleClose = () => {
    if (!loading) {
      setMotivoSelecionado('');
      setJustificativa('');
      setConfirmacao(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Desistir da Proposta
          </DialogTitle>
          <DialogDescription>
            Orçamento #{orcamentoId.slice(-8)} - Esta ação não pode ser desfeita
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50">
            <Shield className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              <strong>Atenção:</strong> Desistências frequentes podem resultar em penalidades como redução de limites ou suspensão temporária.
            </AlertDescription>
          </Alert>

          <div>
            <Label className="text-sm font-medium">
              Motivo da desistência *
            </Label>
            <Select value={motivoSelecionado} onValueChange={(value) => setMotivoSelecionado(value as MotivoDesistencia)}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione o motivo principal" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_DESISTENCIA.map((motivo) => (
                  <SelectItem key={motivo} value={motivo}>
                    {motivo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="justificativa" className="text-sm font-medium">
              Justificativa detalhada *
            </Label>
            <Textarea
              id="justificativa"
              placeholder="Explique em detalhes o motivo da desistência. Esta informação é importante para melhorarmos o sistema..."
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              className="mt-2 min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {justificativa.length}/500 caracteres
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="confirmacao"
              checked={confirmacao}
              onChange={(e) => setConfirmacao(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="confirmacao" className="text-sm cursor-pointer">
              Confirmo que desejo desistir desta proposta e estou ciente das possíveis penalidades
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!motivoSelecionado || !justificativa.trim() || !confirmacao || loading}
          >
            {loading ? 'Enviando...' : 'Confirmar Desistência'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};