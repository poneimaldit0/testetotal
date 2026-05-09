import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { useFornecedorReputacao } from '@/hooks/useFornecedorReputacao';

interface ModalAvaliacaoProps {
  open: boolean;
  onClose: () => void;
  fornecedorId: string;
  onSuccess: () => void;
}

export const ModalAvaliacao = ({ open, onClose, fornecedorId, onSuccess }: ModalAvaliacaoProps) => {
  const [clienteNome, setClienteNome] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [notaGeral, setNotaGeral] = useState(0);
  const [prazo, setPrazo] = useState(0);
  const [qualidade, setQualidade] = useState(0);
  const [gestaoMaoObra, setGestaoMaoObra] = useState(0);
  const [gestaoMateriais, setGestaoMateriais] = useState(0);
  const [custoPlanejado, setCustoPlanejado] = useState(0);
  const [comentario, setComentario] = useState('');
  const [dataAvaliacao, setDataAvaliacao] = useState('');
  
  const { criarAvaliacao, loading } = useFornecedorReputacao();

  const renderStarRating = (rating: number, setRating: (value: number) => void, label: string) => (
    <div className="space-y-2">
      <Label>{label} {rating > 0 && <span className="text-muted-foreground">({rating}/5)</span>}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Star
              className={`h-5 w-5 ${
                star <= rating 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clienteNome.trim() || notaGeral === 0) {
      return;
    }

    try {
      await criarAvaliacao({
        fornecedor_id: fornecedorId,
        cliente_nome: clienteNome.trim(),
        cliente_email: clienteEmail.trim() || undefined,
        nota_geral: notaGeral,
        prazo: prazo || undefined,
        qualidade: qualidade || undefined,
        gestao_mao_obra: gestaoMaoObra || undefined,
        gestao_materiais: gestaoMateriais || undefined,
        custo_planejado: custoPlanejado || undefined,
        comentario: comentario.trim() || undefined,
        data_avaliacao: dataAvaliacao ? new Date(dataAvaliacao).toISOString() : new Date().toISOString()
      });

      // Reset form
      setClienteNome('');
      setClienteEmail('');
      setNotaGeral(0);
      setPrazo(0);
      setQualidade(0);
      setGestaoMaoObra(0);
      setGestaoMateriais(0);
      setCustoPlanejado(0);
      setComentario('');
      setDataAvaliacao('');
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar avaliação:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Avaliação</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="clienteEmail">Email do Cliente</Label>
              <Input
                id="clienteEmail"
                type="email"
                value={clienteEmail}
                onChange={(e) => setClienteEmail(e.target.value)}
                placeholder="Ex: joao@email.com"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-sm">Avaliações</h3>
            
            {renderStarRating(notaGeral, setNotaGeral, "Nota Geral *")}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderStarRating(prazo, setPrazo, "Prazo")}
              {renderStarRating(qualidade, setQualidade, "Qualidade")}
              {renderStarRating(gestaoMaoObra, setGestaoMaoObra, "Gestão de Mão de Obra")}
              {renderStarRating(gestaoMateriais, setGestaoMateriais, "Gestão de Materiais")}
            </div>
            
            {renderStarRating(custoPlanejado, setCustoPlanejado, "Custo vs Planejado")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comentario">Comentário</Label>
            <Textarea
              id="comentario"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Comentários adicionais sobre o trabalho..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataAvaliacao">Data da Avaliação</Label>
            <Input
              id="dataAvaliacao"
              type="date"
              value={dataAvaliacao}
              onChange={(e) => setDataAvaliacao(e.target.value)}
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
              disabled={loading || !clienteNome.trim() || notaGeral === 0}
              className="flex-1"
            >
              {loading ? "Salvando..." : "Salvar Avaliação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};