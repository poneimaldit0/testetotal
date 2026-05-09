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
import { CategoriaFinanceira, SubcategoriaFinanceira } from '@/types/financeiro';

interface NovaSubcategoriaModalProps {
  open: boolean;
  onClose: () => void;
  subcategoria?: SubcategoriaFinanceira | null;
  categorias: CategoriaFinanceira[];
}

export function NovaSubcategoriaModal({ 
  open, 
  onClose, 
  subcategoria, 
  categorias 
}: NovaSubcategoriaModalProps) {
  const [nome, setNome] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [descricao, setDescricao] = useState('');
  const { criarSubcategoria, atualizarSubcategoria, loading } = useConfiguracaoFinanceira();

  const isEdicao = !!subcategoria;

  useEffect(() => {
    if (subcategoria) {
      setNome(subcategoria.nome);
      setCategoriaId(subcategoria.categoria_id);
      setDescricao(subcategoria.descricao || '');
    } else {
      setNome('');
      setCategoriaId('');
      setDescricao('');
    }
  }, [subcategoria, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim() || !categoriaId) return;

    const dadosSubcategoria = {
      nome: nome.trim(),
      categoria_id: categoriaId,
      descricao: descricao.trim() || undefined,
      ativa: true
    };

    let sucesso = false;
    
    if (isEdicao && subcategoria) {
      sucesso = await atualizarSubcategoria(subcategoria.id, dadosSubcategoria);
    } else {
      sucesso = await criarSubcategoria(dadosSubcategoria);
    }

    if (sucesso) {
      onClose();
    }
  };

  const handleClose = () => {
    setNome('');
    setCategoriaId('');
    setDescricao('');
    onClose();
  };

  const categoriaSelecionada = categorias.find(c => c.id === categoriaId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdicao ? 'Editar Subcategoria' : 'Nova Subcategoria'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria Pai *</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((categoria) => (
                  <SelectItem key={categoria.id} value={categoria.id}>
                    {categoria.nome} ({categoria.tipo === 'receita' ? 'Receita' : 'Despesa'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoriaSelecionada && (
              <p className="text-xs text-muted-foreground">
                Tipo: {categoriaSelecionada.tipo === 'receita' ? 'Receita' : 'Despesa'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Subcategoria *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Vendas Online, Materiais de Construção"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição opcional da subcategoria"
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
              disabled={loading || !nome.trim() || !categoriaId}
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