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
import { CategoriaFinanceira } from '@/types/financeiro';

interface NovaCategoriaModalProps {
  open: boolean;
  onClose: () => void;
  categoria?: CategoriaFinanceira | null;
}

export function NovaCategoriaModal({ open, onClose, categoria }: NovaCategoriaModalProps) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('receita');
  const [descricao, setDescricao] = useState('');
  const { criarCategoria, atualizarCategoria, loading } = useConfiguracaoFinanceira();

  const isEdicao = !!categoria;

  useEffect(() => {
    if (categoria) {
      setNome(categoria.nome);
      setTipo(categoria.tipo as 'receita' | 'despesa');
      setDescricao(categoria.descricao || '');
    } else {
      setNome('');
      setTipo('receita');
      setDescricao('');
    }
  }, [categoria, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) return;

    const dadosCategoria = {
      nome: nome.trim(),
      tipo,
      descricao: descricao.trim() || undefined,
      ativa: true
    };

    let sucesso = false;
    
    if (isEdicao && categoria) {
      sucesso = await atualizarCategoria(categoria.id, dadosCategoria);
    } else {
      sucesso = await criarCategoria(dadosCategoria);
    }

    if (sucesso) {
      onClose();
    }
  };

  const handleClose = () => {
    setNome('');
    setTipo('receita');
    setDescricao('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdicao ? 'Editar Categoria' : 'Nova Categoria Financeira'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Categoria *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Comissionamento de reforma"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo *</Label>
            <Select value={tipo} onValueChange={(value: 'receita' | 'despesa') => setTipo(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição opcional da categoria"
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