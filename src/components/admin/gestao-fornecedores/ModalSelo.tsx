import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFornecedorReputacao } from '@/hooks/useFornecedorReputacao';
import { useAuth } from '@/hooks/useAuth';

interface ModalSeloProps {
  open: boolean;
  onClose: () => void;
  fornecedorId: string;
  onSuccess: () => void;
}

export const ModalSelo = ({ open, onClose, fornecedorId, onSuccess }: ModalSeloProps) => {
  const [nomeSelo, setNomeSelo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cor, setCor] = useState('#3B82F6');
  const [icone, setIcone] = useState('');
  const [dataExpiracao, setDataExpiracao] = useState('');
  
  const { criarSelo, loading } = useFornecedorReputacao();
  const { user } = useAuth();

  const selosPreDefinidos = [
    { nome: 'Fornecedor Premium', cor: '#FFD700', icone: '⭐' },
    { nome: 'Entrega Rápida', cor: '#22C55E', icone: '⚡' },
    { nome: 'Alta Satisfação', cor: '#EC4899', icone: '💖' },
    { nome: 'Melhor Preço', cor: '#8B5CF6', icone: '💰' },
    { nome: 'Qualidade Garantida', cor: '#F59E0B', icone: '🛡️' },
    { nome: 'Experiência Comprovada', cor: '#0EA5E9', icone: '🏆' },
    { nome: 'Eco-Friendly', cor: '#10B981', icone: '🌱' },
    { nome: 'Inovação', cor: '#F97316', icone: '💡' }
  ];

  const cores = [
    { nome: 'Azul', valor: '#3B82F6' },
    { nome: 'Verde', valor: '#22C55E' },
    { nome: 'Amarelo', valor: '#F59E0B' },
    { nome: 'Vermelho', valor: '#EF4444' },
    { nome: 'Roxo', valor: '#8B5CF6' },
    { nome: 'Rosa', valor: '#EC4899' },
    { nome: 'Laranja', valor: '#F97316' },
    { nome: 'Dourado', valor: '#FFD700' }
  ];

  const handleSeloPreDefinido = (selo: typeof selosPreDefinidos[0]) => {
    setNomeSelo(selo.nome);
    setCor(selo.cor);
    setIcone(selo.icone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nomeSelo.trim()) {
      return;
    }

    try {
      await criarSelo({
        fornecedor_id: fornecedorId,
        nome_selo: nomeSelo.trim(),
        descricao: descricao.trim() || undefined,
        cor,
        icone: icone.trim() || undefined,
        data_concessao: new Date().toISOString(),
        data_expiracao: dataExpiracao || undefined,
        ativo: true,
        concedido_por: user?.id
      });

      // Reset form
      setNomeSelo('');
      setDescricao('');
      setCor('#3B82F6');
      setIcone('');
      setDataExpiracao('');
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao conceder selo:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Conceder Selo ao Fornecedor</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Selos Pré-definidos */}
          <div className="space-y-2">
            <Label>Selos Pré-definidos</Label>
            <div className="grid grid-cols-2 gap-2">
              {selosPreDefinidos.map((selo) => (
                <Button
                  key={selo.nome}
                  type="button"
                  variant="outline"
                  className="text-left justify-start h-auto p-2"
                  onClick={() => handleSeloPreDefinido(selo)}
                >
                  <span className="mr-2" style={{ color: selo.cor }}>
                    {selo.icone}
                  </span>
                  <span className="text-xs">{selo.nome}</span>
                </Button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nomeSelo">Nome do Selo *</Label>
              <Input
                id="nomeSelo"
                value={nomeSelo}
                onChange={(e) => setNomeSelo(e.target.value)}
                placeholder="Ex: Fornecedor Premium"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o motivo da concessão do selo..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cor">Cor</Label>
                <Select value={cor} onValueChange={setCor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cores.map((corItem) => (
                      <SelectItem key={corItem.valor} value={corItem.valor}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: corItem.valor }}
                          />
                          {corItem.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="icone">Ícone (Emoji)</Label>
                <Input
                  id="icone"
                  value={icone}
                  onChange={(e) => setIcone(e.target.value)}
                  placeholder="⭐"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataExpiracao">Data de Expiração (Opcional)</Label>
              <Input
                id="dataExpiracao"
                type="date"
                value={dataExpiracao}
                onChange={(e) => setDataExpiracao(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Preview do Selo */}
            {nomeSelo && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="flex items-center gap-2">
                  <div 
                    className="px-3 py-1 rounded-full text-white text-sm flex items-center gap-1"
                    style={{ backgroundColor: cor }}
                  >
                    {icone && <span>{icone}</span>}
                    {nomeSelo}
                  </div>
                </div>
              </div>
            )}

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
                disabled={loading || !nomeSelo.trim()}
                className="flex-1"
              >
                {loading ? "Concedendo..." : "Conceder Selo"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};