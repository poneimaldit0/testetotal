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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { formatarDataParaExibicao } from '@/utils/dateUtils';
import type { ContaVencimento } from '@/types/financeiro';

// Motivos pré-definidos para exclusão
const MOTIVOS_EXCLUSAO = [
  { value: 'lancamento_duplicado', label: 'Lançamento duplicado' },
  { value: 'lancamento_incorreto', label: 'Lançamento incorreto' },
  { value: 'cliente_fornecedor_errado', label: 'Cliente/Fornecedor errado' },
  { value: 'valor_incorreto', label: 'Valor incorreto' },
  { value: 'conta_cancelada', label: 'Conta/serviço cancelado' },
  { value: 'teste_sistema', label: 'Registro de teste' },
  { value: 'outro', label: 'Outro motivo' },
];

interface ExcluirContaComMotivoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conta: ContaVencimento | null;
  onConfirm: (conta: ContaVencimento, motivo: string, observacao?: string) => Promise<void>;
  isLoading: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const ExcluirContaComMotivoDialog: React.FC<ExcluirContaComMotivoDialogProps> = ({
  isOpen,
  onClose,
  conta,
  onConfirm,
  isLoading
}) => {
  const [motivoSelecionado, setMotivoSelecionado] = useState('');
  const [observacao, setObservacao] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const shortId = conta?.id?.slice(-8) || '';
  const isConfirmValid = confirmText === shortId;
  const isMotivoValido = motivoSelecionado !== '' && (motivoSelecionado !== 'outro' || observacao.trim().length > 0);
  const canConfirm = isConfirmValid && isMotivoValido && conta;

  const getMotivoLabel = () => {
    const motivo = MOTIVOS_EXCLUSAO.find(m => m.value === motivoSelecionado);
    return motivo?.label || motivoSelecionado;
  };

  const handleConfirm = async () => {
    if (canConfirm && conta) {
      const motivoFinal = motivoSelecionado === 'outro' ? `Outro: ${observacao}` : getMotivoLabel();
      await onConfirm(conta, motivoFinal, observacao || undefined);
      resetForm();
    }
  };

  const resetForm = () => {
    setMotivoSelecionado('');
    setObservacao('');
    setConfirmText('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!conta) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Excluir Conta
          </DialogTitle>
          <DialogDescription className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                ATENÇÃO: Esta ação é irreversível!
              </p>
              <p className="text-red-700 text-sm">
                A conta será excluída permanentemente, mas o histórico com o motivo da exclusão será mantido para auditoria.
              </p>
            </div>
            
            {/* Resumo da conta */}
            <div className="bg-muted/50 border rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{conta.descricao}</p>
                  <p className="text-sm text-muted-foreground">{conta.cliente_fornecedor}</p>
                </div>
                <span className={`text-sm px-2 py-1 rounded ${
                  conta.tipo === 'conta_receber' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {conta.tipo === 'conta_receber' ? 'A Receber' : 'A Pagar'}
                </span>
              </div>
              <div className="flex gap-4 text-sm">
                <span>
                  <strong>Valor:</strong> {formatCurrency(conta.valor_original)}
                </span>
                <span>
                  <strong>Vencimento:</strong> {formatarDataParaExibicao(conta.data_vencimento)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                ID: #{shortId}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Seleção de motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo da exclusão *</Label>
            <Select 
              value={motivoSelecionado} 
              onValueChange={setMotivoSelecionado}
              disabled={isLoading}
            >
              <SelectTrigger id="motivo">
                <SelectValue placeholder="Selecione o motivo..." />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_EXCLUSAO.map(motivo => (
                  <SelectItem key={motivo.value} value={motivo.value}>
                    {motivo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campo de observação (obrigatório para "Outro") */}
          <div className="space-y-2">
            <Label htmlFor="observacao">
              Observação {motivoSelecionado === 'outro' ? '*' : '(opcional)'}
            </Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder={motivoSelecionado === 'outro' 
                ? 'Descreva o motivo da exclusão...' 
                : 'Adicione detalhes adicionais se necessário...'}
              className="min-h-[80px]"
              disabled={isLoading}
            />
            {motivoSelecionado === 'outro' && observacao.trim().length === 0 && (
              <p className="text-xs text-red-500">
                A observação é obrigatória quando o motivo é "Outro"
              </p>
            )}
          </div>

          {/* Confirmação por ID */}
          <div className="space-y-2">
            <Label htmlFor="confirm-text" className="text-sm">
              Para confirmar, digite os últimos 8 caracteres do ID: <span className="font-mono font-bold">{shortId}</span>
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Digite aqui..."
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
            disabled={!canConfirm || isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir com Registro
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
