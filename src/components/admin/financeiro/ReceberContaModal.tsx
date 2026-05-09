import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import type { ContaReceber, ContaBancaria } from '@/types/financeiro';

interface ReceberContaModalProps {
  conta: ContaReceber;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ReceberContaModal = ({ conta, open, onOpenChange, onSuccess }: ReceberContaModalProps) => {
  const [loading, setLoading] = useState(false);
  const [valorRecebido, setValorRecebido] = useState<number>(conta.valor_original - conta.valor_recebido);
  const [dataRecebimento, setDataRecebimento] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formaPagamento, setFormaPagamento] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [contaBancariaId, setContaBancariaId] = useState<string>('');
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);

  const { receberConta, buscarContasBancarias } = useFinanceiro();

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

    const sucesso = await receberConta(conta.id, valorRecebido, dataRecebimento, formaPagamento, contaBancariaId);
    
    setLoading(false);
    
    if (sucesso) {
      onSuccess();
      onOpenChange(false);
    }
  };

  const valorPendente = conta.valor_original - conta.valor_recebido;
  const isRecebimentoParcial = valorRecebido < valorPendente;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Recebimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="bg-muted p-3 rounded-lg">
            <h4 className="font-medium text-sm">{conta.descricao}</h4>
            <p className="text-xs text-muted-foreground mb-2">Cliente: {conta.cliente_nome}</p>
            <div className="flex justify-between items-center text-xs">
              <span>
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium ml-1">{formatCurrency(conta.valor_original)}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Recebido:</span>
                <span className="font-medium text-green-600 ml-1">{formatCurrency(conta.valor_recebido)}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Pendente:</span>
                <span className="font-medium text-red-600 ml-1">{formatCurrency(valorPendente)}</span>
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="valor_recebido" className="text-sm">Valor a Receber *</Label>
                <Input
                  id="valor_recebido"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={valorPendente}
                  value={valorRecebido}
                  onChange={(e) => setValorRecebido(parseFloat(e.target.value) || 0)}
                  required
                  className="h-9"
                />
              </div>

              <div>
                <Label htmlFor="data_recebimento" className="text-sm">Data do Recebimento *</Label>
                <Input
                  id="data_recebimento"
                  type="date"
                  value={dataRecebimento}
                  onChange={(e) => setDataRecebimento(e.target.value)}
                  required
                  className="h-9"
                />
              </div>
            </div>

            {isRecebimentoParcial && (
              <p className="text-xs text-amber-600 -mt-1">
                Recebimento parcial - restará {formatCurrency(valorPendente - valorRecebido)}
              </p>
            )}

            <div>
              <Label htmlFor="conta_bancaria" className="text-sm">Conta Bancária *</Label>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="forma_pagamento" className="text-sm">Forma de Pagamento</Label>
                <Input
                  id="forma_pagamento"
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  placeholder="Ex: PIX, Boleto..."
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
                  placeholder="Observações..."
                  className="resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} size="sm">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || valorRecebido <= 0 || !contaBancariaId} size="sm">
                {loading ? 'Registrando...' : 'Registrar Recebimento'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};