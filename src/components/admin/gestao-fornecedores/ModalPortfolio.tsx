import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFornecedorReputacao } from '@/hooks/useFornecedorReputacao';

interface ModalPortfolioProps {
  open: boolean;
  onClose: () => void;
  fornecedorId: string;
  onSuccess: () => void;
}

export const ModalPortfolio = ({ open, onClose, fornecedorId, onSuccess }: ModalPortfolioProps) => {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [categoria, setCategoria] = useState('');
  const [dataProjeto, setDataProjeto] = useState('');
  const [ordem, setOrdem] = useState('0');
  
  const { criarPortfolio, loading } = useFornecedorReputacao();

  const categorias = [
    'Reformas Residenciais',
    'Reformas Comerciais',
    'Construção Nova',
    'Paisagismo',
    'Design de Interiores',
    'Instalações Elétricas',
    'Instalações Hidráulicas',
    'Pintura',
    'Marcenaria',
    'Outros'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titulo.trim() || !categoria) {
      return;
    }

    try {
      await criarPortfolio({
        fornecedor_id: fornecedorId,
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        imagem_url: imagemUrl.trim() || undefined,
        categoria,
        data_projeto: dataProjeto || undefined,
        ordem: parseInt(ordem) || 0,
        ativo: true
      });

      // Reset form
      setTitulo('');
      setDescricao('');
      setImagemUrl('');
      setCategoria('');
      setDataProjeto('');
      setOrdem('0');
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar portfólio:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Item ao Portfólio</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Reforma completa de casa"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria *</Label>
            <Select value={categoria} onValueChange={setCategoria} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o projeto..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imagemUrl">URL da Imagem</Label>
            <Input
              id="imagemUrl"
              type="url"
              value={imagemUrl}
              onChange={(e) => setImagemUrl(e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataProjeto">Data do Projeto</Label>
            <Input
              id="dataProjeto"
              type="date"
              value={dataProjeto}
              onChange={(e) => setDataProjeto(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ordem">Ordem de Exibição</Label>
            <Input
              id="ordem"
              type="number"
              value={ordem}
              onChange={(e) => setOrdem(e.target.value)}
              placeholder="0"
              min="0"
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
              disabled={loading || !titulo.trim() || !categoria}
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