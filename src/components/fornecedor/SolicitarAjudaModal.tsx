import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { HelpCircle, Send } from 'lucide-react';
import { useSolicitacoesAjuda } from '@/hooks/useSolicitacoesAjuda';

interface SolicitarAjudaModalProps {
  candidaturaId: string;
  orcamentoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CATEGORIAS_PROBLEMAS = [
  'Dificuldade técnica no preenchimento da proposta',
  'Dúvidas sobre os requisitos do projeto',
  'Problemas para entender o checklist',
  'Questões sobre prazos e cronograma',
  'Dúvidas sobre valores e orçamento',
  'Problemas de acesso à plataforma',
  'Outros'
] as const;

export const SolicitarAjudaModal: React.FC<SolicitarAjudaModalProps> = ({
  candidaturaId,
  orcamentoId,
  open,
  onOpenChange,
  onSuccess
}) => {
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('');
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const { criarSolicitacao } = useSolicitacoesAjuda();

  const handleSubmit = async () => {
    if (!categoriaSelecionada || !mensagem.trim()) {
      return;
    }

    setLoading(true);
    
    const mensagemCompleta = `Categoria: ${categoriaSelecionada}\n\nDescrição: ${mensagem.trim()}`;
    
    const sucesso = await criarSolicitacao(candidaturaId, mensagemCompleta);
    
    if (sucesso) {
      setCategoriaSelecionada('');
      setMensagem('');
      onOpenChange(false);
      onSuccess();
    }
    
    setLoading(false);
  };

  const handleClose = () => {
    if (!loading) {
      setCategoriaSelecionada('');
      setMensagem('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Solicitar Ajuda
          </DialogTitle>
          <DialogDescription>
            Orçamento #{orcamentoId.slice(-8)} - Descreva qual dificuldade você está enfrentando
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Qual tipo de problema você está enfrentando?
            </Label>
            <RadioGroup
              value={categoriaSelecionada}
              onValueChange={setCategoriaSelecionada}
              className="space-y-2"
            >
              {CATEGORIAS_PROBLEMAS.map((categoria) => (
                <div key={categoria} className="flex items-center space-x-2">
                  <RadioGroupItem value={categoria} id={categoria} />
                  <Label 
                    htmlFor={categoria} 
                    className="text-sm cursor-pointer"
                  >
                    {categoria}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="mensagem" className="text-sm font-medium">
              Descreva sua dificuldade em detalhes
            </Label>
            <Textarea
              id="mensagem"
              placeholder="Explique qual problema você está enfrentando para que possamos te ajudar da melhor forma..."
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="mt-2 min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {mensagem.length}/500 caracteres
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!categoriaSelecionada || !mensagem.trim() || loading}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {loading ? 'Enviando...' : 'Enviar Solicitação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};