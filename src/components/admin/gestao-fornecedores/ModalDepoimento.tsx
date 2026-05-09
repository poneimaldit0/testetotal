import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFornecedorReputacao } from '@/hooks/useFornecedorReputacao';
import { useAuth } from '@/hooks/useAuth';

interface ModalDepoimentoProps {
  open: boolean;
  onClose: () => void;
  fornecedorId: string;
  onSuccess: () => void;
}

export const ModalDepoimento = ({ open, onClose, fornecedorId, onSuccess }: ModalDepoimentoProps) => {
  const [clienteNome, setClienteNome] = useState('');
  const [depoimento, setDepoimento] = useState('');
  const [dataDepoimento, setDataDepoimento] = useState('');
  
  const { criarDepoimento, loading } = useFornecedorReputacao();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clienteNome.trim() || !depoimento.trim()) {
      return;
    }

    try {
      await criarDepoimento({
        fornecedor_id: fornecedorId,
        cliente_nome: clienteNome.trim(),
        depoimento: depoimento.trim(),
        data_depoimento: dataDepoimento || undefined,
        ativo: true,
        criado_por_admin: user?.id
      });

      // Reset form
      setClienteNome('');
      setDepoimento('');
      setDataDepoimento('');
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar depoimento:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Depoimento</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clienteNome">Nome do Cliente *</Label>
            <Input
              id="clienteNome"
              value={clienteNome}
              onChange={(e) => setClienteNome(e.target.value)}
              placeholder="Ex: João Silva"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="depoimento">Depoimento *</Label>
            <Textarea
              id="depoimento"
              value={depoimento}
              onChange={(e) => setDepoimento(e.target.value)}
              placeholder="Digite o depoimento do cliente..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataDepoimento">Data do Depoimento</Label>
            <Input
              id="dataDepoimento"
              type="date"
              value={dataDepoimento}
              onChange={(e) => setDataDepoimento(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !clienteNome.trim() || !depoimento.trim()}
              className="flex-1"
            >
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};