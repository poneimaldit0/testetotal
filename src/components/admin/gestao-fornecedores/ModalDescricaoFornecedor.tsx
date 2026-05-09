import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFornecedorReputacao } from '@/hooks/useFornecedorReputacao';
import { FornecedorReputacao } from '@/types/fornecedor-reputacao';

interface ModalDescricaoFornecedorProps {
  open: boolean;
  onClose: () => void;
  fornecedor: FornecedorReputacao;
  onSuccess: () => void;
}

export const ModalDescricaoFornecedor = ({ 
  open, 
  onClose, 
  fornecedor, 
  onSuccess 
}: ModalDescricaoFornecedorProps) => {
  const [descricao, setDescricao] = useState('');
  
  const { atualizarDescricaoFornecedor, loading } = useFornecedorReputacao();

  useEffect(() => {
    if (open && fornecedor) {
      setDescricao(fornecedor.descricao_fornecedor || '');
    }
  }, [open, fornecedor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await atualizarDescricaoFornecedor(fornecedor.id, descricao.trim());
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar descrição:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Descrição do Fornecedor</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm">
              <strong>Fornecedor:</strong> {fornecedor.nome} - {fornecedor.empresa}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o fornecedor, suas especialidades, diferenciais, experiência..."
              rows={6}
              className="resize-none"
            />
            <div className="text-xs text-muted-foreground">
              Esta descrição será exibida para os clientes durante a comparação de propostas.
            </div>
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
              disabled={loading}
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