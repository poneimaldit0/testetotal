import React, { useState } from 'react';
import { MessageSquare, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useStatusAcompanhamento } from '@/hooks/useStatusAcompanhamento';

interface ObservacoesStatusProps {
  inscricaoId: string;
  observacoesAtuais?: string | null;
  onSave?: () => void;
}

export const ObservacoesStatus: React.FC<ObservacoesStatusProps> = ({
  inscricaoId,
  observacoesAtuais,
  onSave
}) => {
  const [observacoes, setObservacoes] = useState(observacoesAtuais || '');
  const [salvando, setSalvando] = useState(false);
  const [open, setOpen] = useState(false);
  const { atualizarObservacoes } = useStatusAcompanhamento();

  const hasNotes = !!observacoesAtuais && observacoesAtuais.trim().length > 0;

  const handleSalvar = async () => {
    setSalvando(true);
    const sucesso = await atualizarObservacoes(inscricaoId, observacoes);
    setSalvando(false);
    
    if (sucesso) {
      setOpen(false);
      onSave?.();
    }
  };

  const PopoverEditor = (
    <PopoverContent className="w-80" align="start">
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Observações do Cliente</h4>
        <Textarea 
          placeholder="Adicione observações sobre este contato..."
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={4}
          className="resize-none"
        />
        <Button 
          onClick={handleSalvar} 
          disabled={salvando}
          size="sm"
          className="w-full"
        >
          {salvando ? 'Salvando...' : 'Salvar Observações'}
        </Button>
      </div>
    </PopoverContent>
  );

  // Com observações - mostra diretamente
  if (hasNotes) {
    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MessageSquare className="h-4 w-4 text-primary" />
          Observações do cliente:
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {observacoesAtuais}
          </p>
          <div className="mt-2 flex justify-end">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  <Pencil className="h-3 w-3 mr-1" />
                  Editar
                </Button>
              </PopoverTrigger>
              {PopoverEditor}
            </Popover>
          </div>
        </div>
      </div>
    );
  }

  // Sem observações - botão claro
  return (
    <div className="mt-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="text-muted-foreground">
            <MessageSquare className="h-4 w-4 mr-2" />
            Adicionar observações do cliente
          </Button>
        </PopoverTrigger>
        {PopoverEditor}
      </Popover>
    </div>
  );
};
