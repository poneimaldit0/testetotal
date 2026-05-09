import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Pause, Play, Lock } from 'lucide-react';
import { Orcamento } from '@/types';

interface AcoesOrcamentoDropdownProps {
  orcamento: Orcamento;
  onPausar: (orcamento: Orcamento) => void;
  onReabrir: (orcamento: Orcamento) => void;
  onFecharManualmente: (orcamento: Orcamento) => void;
}

export const AcoesOrcamentoDropdown: React.FC<AcoesOrcamentoDropdownProps> = ({
  orcamento,
  onPausar,
  onReabrir,
  onFecharManualmente,
}) => {
  const status = orcamento.status;

  // Não mostrar para orçamentos já fechados
  if (status === 'fechado') {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="border-muted-foreground/30 hover:bg-muted"
        >
          <MoreVertical className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">Ações</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {status === 'aberto' && (
          <>
            <DropdownMenuItem 
              onClick={() => onPausar(orcamento)}
              className="cursor-pointer"
            >
              <Pause className="h-4 w-4 mr-2 text-amber-600" />
              <span>Pausar Orçamento</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onFecharManualmente(orcamento)}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <Lock className="h-4 w-4 mr-2" />
              <span>Fechar Manualmente</span>
            </DropdownMenuItem>
          </>
        )}
        
        {status === 'pausado' && (
          <>
            <DropdownMenuItem 
              onClick={() => onReabrir(orcamento)}
              className="cursor-pointer"
            >
              <Play className="h-4 w-4 mr-2 text-primary" />
              <span>Reabrir Orçamento</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onFecharManualmente(orcamento)}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <Lock className="h-4 w-4 mr-2" />
              <span>Fechar Definitivamente</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
