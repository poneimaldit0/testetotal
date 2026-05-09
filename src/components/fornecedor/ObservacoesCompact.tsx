import React, { useState, useEffect } from 'react';
import { MessageSquare, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useStatusAcompanhamento } from '@/hooks/useStatusAcompanhamento';

interface ObservacoesCompactProps {
  inscricaoId: string;
  observacoesAtuais?: string | null;
  onSave?: () => void;
}

export const ObservacoesCompact: React.FC<ObservacoesCompactProps> = ({
  inscricaoId,
  observacoesAtuais,
  onSave
}) => {
  const [observacoes, setObservacoes] = useState(observacoesAtuais || '');
  const [salvando, setSalvando] = useState(false);
  const [open, setOpen] = useState(false);
  const { atualizarObservacoes } = useStatusAcompanhamento();

  const hasNotes = !!observacoesAtuais && observacoesAtuais.trim().length > 0;

  // Sync local state when props change
  useEffect(() => {
    setObservacoes(observacoesAtuais || '');
  }, [observacoesAtuais]);

  const handleSalvar = async () => {
    setSalvando(true);
    const sucesso = await atualizarObservacoes(inscricaoId, observacoes);
    setSalvando(false);
    
    if (sucesso) {
      setOpen(false);
      onSave?.();
    }
  };

  const truncatedText = observacoesAtuais && observacoesAtuais.length > 100 
    ? observacoesAtuais.substring(0, 100) + '...' 
    : observacoesAtuais;

  const IconComponent = hasNotes ? MessageSquare : MessageSquarePlus;
  const iconClassName = hasNotes 
    ? "h-4 w-4 text-primary" 
    : "h-4 w-4 text-muted-foreground";

  const TriggerButton = (
    <Button 
      variant="ghost" 
      size="sm" 
      className="h-7 w-7 p-0 hover:bg-muted"
    >
      <IconComponent className={iconClassName} />
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              {TriggerButton}
            </PopoverTrigger>
          </TooltipTrigger>
          {hasNotes && (
            <TooltipContent side="left" className="max-w-[250px]">
              <p className="text-xs whitespace-pre-wrap">{truncatedText}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Observações</h4>
          <Textarea 
            placeholder="Adicione observações sobre este contato..."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={4}
            className="resize-none text-sm"
          />
          <Button 
            onClick={handleSalvar} 
            disabled={salvando}
            size="sm"
            className="w-full"
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
