import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import type { ContaPagar, ContaBancaria } from '@/types/financeiro';

interface PagarContaModalProps {
  conta: ContaPagar;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const PagarContaModal = ({ conta, open, onOpenChange, onSuccess }: PagarContaModalProps) => {
  const [loading, setLoading] = useState(false);
  const [valorPago, setValorPago] = useState<number>(conta.valor_original - conta.valor_pago);
  const [dataPagamento, setDataPagamento] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formaPagamento, setFormaPagamento] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [contaBancariaId, setContaBancariaId] = useState<string>('ee45a079-fffd-416b-96c4-57e6701edfe2'); // Banco Inter como padrão
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);

  const { pagarConta, buscarContasBancarias } = useFinanceiro();

  useEffect(() => {
    const carregarContasBancarias = async () => {
      const contas = await buscarContasBancarias();
      setContasBancarias(contas.filter(c => c.ativa));
    };

    if (open) {
      carregarContasBancarias();
    }
  }, [open, buscarContasBancarias]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contaBancariaId) {
      return;
    }

    setLoading(true);

    const sucesso = await pagarConta(conta.id, valorPago, dataPagamento, formaPagamento, contaBancariaId);
    
    setLoading(false);
    
    if (sucesso) {
      onSuccess();
      onOpenChange(false);
    }
  };

  const valorPendente = conta.valor_original - conta.valor_pago;
  const isPagamentoParcial = valorPago < valorPendente;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Seção de detalhes compacta */}
          <div className="bg-muted p-3 rounded-lg">
            <h4 className="font-medium text-sm">{conta.descricao}</h4>
            <p className="text-xs text-muted-foreground mb-2">Fornecedor: {conta.fornecedor_nome}</p>
            <div className="flex items-center justify-between text-xs space-x-4">
              <span>Total: <strong>{formatCurrency(conta.valor_original)}</strong></span>
              <span>Pago: <strong className="text-green-600">{formatCurrency(conta.valor_pago)}</strong></span>
              <span>Pendente: <strong className="text-red-600">{formatCurrency(valorPendente)}</strong></span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Campos principais agrupados */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="valor_pago" className="text-sm font-medium">Valor a Pagar *</Label>
                <Input
                  id="valor_pago"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={valorPendente}
                  value={valorPago}
                  onChange={(e) => setValorPago(parseFloat(e.target.value) || 0)}
                  required
                  className="h-9"
                />
                {isPagamentoParcial && (
                  <p className="text-xs text-amber-600 mt-1">
                    Restará {formatCurrency(valorPendente - valorPago)}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="data_pagamento" className="text-sm font-medium">Data do Pagamento *</Label>
                <Input
                  id="data_pagamento"
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  required
                  className="h-9"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="conta_bancaria" className="text-sm font-medium">Conta Bancária *</Label>
              <Select value={contaBancariaId} onValueChange={setContaBancariaId} required>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione a conta bancária" />
                </SelectTrigger>
                <SelectContent>
                  {contasBancarias.map((contaBancaria) => (
                    <SelectItem key={contaBancaria.id} value={contaBancaria.id}>
                      {contaBancaria.nome} - {contaBancaria.banco}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="forma_pagamento" className="text-sm">Forma de Pagamento</Label>
              <Input
                id="forma_pagamento"
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                placeholder="Ex: PIX, Boleto, Transferência..."
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="observacoes" className="text-sm">Observações</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={1}
                placeholder="Observações sobre o pagamento..."
                className="min-h-[32px] text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} size="sm">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || valorPago <= 0 || !contaBancariaId} size="sm">
                {loading ? 'Registrando...' : 'Registrar Pagamento'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};