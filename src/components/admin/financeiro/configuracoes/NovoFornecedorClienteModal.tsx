import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useConfiguracaoFinanceira } from '@/hooks/useConfiguracaoFinanceira';
import { FornecedorCliente } from '@/types/financeiro';

interface NovoFornecedorClienteModalProps {
  open: boolean;
  onClose: () => void;
  fornecedor?: FornecedorCliente | null;
}

export function NovoFornecedorClienteModal({ open, onClose, fornecedor }: NovoFornecedorClienteModalProps) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [documento, setDocumento] = useState('');
  const [endereco, setEndereco] = useState('');
  const [tipo, setTipo] = useState<'fornecedor' | 'cliente' | 'ambos'>('ambos');
  const [observacoes, setObservacoes] = useState('');
  const { criarFornecedorCliente, atualizarFornecedorCliente, loading } = useConfiguracaoFinanceira();

  const isEdicao = !!fornecedor;

  useEffect(() => {
    if (fornecedor) {
      setNome(fornecedor.nome);
      setEmail(fornecedor.email || '');
      setTelefone(fornecedor.telefone || '');
      setDocumento(fornecedor.documento || '');
      setEndereco(fornecedor.endereco || '');
      setTipo(fornecedor.tipo);
      setObservacoes(fornecedor.observacoes || '');
    } else {
      resetForm();
    }
  }, [fornecedor, open]);

  const resetForm = () => {
    setNome('');
    setEmail('');
    setTelefone('');
    setDocumento('');
    setEndereco('');
    setTipo('ambos');
    setObservacoes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) return;

    const dadosFornecedor = {
      nome: nome.trim(),
      email: email.trim() || undefined,
      telefone: telefone.trim() || undefined,
      documento: documento.trim() || undefined,
      endereco: endereco.trim() || undefined,
      tipo,
      observacoes: observacoes.trim() || undefined
    };

    let sucesso = false;
    
    if (isEdicao && fornecedor) {
      sucesso = await atualizarFornecedorCliente(fornecedor.id, dadosFornecedor);
    } else {
      sucesso = await criarFornecedorCliente(dadosFornecedor);
    }

    if (sucesso) {
      onClose();
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdicao ? 'Editar Fornecedor/Cliente' : 'Novo Fornecedor/Cliente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome/Razão Social *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João Silva ou Empresa LTDA"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select value={tipo} onValueChange={(value: 'fornecedor' | 'cliente' | 'ambos') => setTipo(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fornecedor">Fornecedor</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="ambos">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="documento">CPF/CNPJ</Label>
            <Input
              id="documento"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Endereço completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações adicionais"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !nome.trim()}
              className="flex-1"
            >
              {loading ? 'Salvando...' : (isEdicao ? 'Atualizar' : 'Criar')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}