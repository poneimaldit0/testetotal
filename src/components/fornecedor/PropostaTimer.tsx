import React from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PrazoInfo } from '@/hooks/usePrazosPropostas';
import { cn } from '@/lib/utils';

interface PropostaTimerProps {
  prazoInfo: PrazoInfo | null;
  compact?: boolean;
}

export const PropostaTimer: React.FC<PropostaTimerProps> = ({ 
  prazoInfo, 
  compact = false 
}) => {
  if (!prazoInfo?.dataLimite) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <Clock className="h-3 w-3 mr-1" />
        Sem prazo
      </Badge>
    );
  }

  const getColorClasses = () => {
    switch (prazoInfo.statusUrgencia) {
      case 'verde':
        return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
      case 'amarelo':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100';
      case 'vermelho':
        return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100';
    }
  };

  const getIcon = () => {
    if (prazoInfo.vencido) {
      return <AlertTriangle className="h-3 w-3 mr-1" />;
    }
    if (prazoInfo.statusUrgencia === 'verde') {
      return <CheckCircle className="h-3 w-3 mr-1" />;
    }
    return <Clock className="h-3 w-3 mr-1" />;
  };

  if (compact) {
    return (
      <Badge 
        variant="outline" 
        className={cn(getColorClasses(), "text-xs")}
      >
        {getIcon()}
        {prazoInfo.textoTempo}
      </Badge>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-2 p-3 rounded-lg border",
      getColorClasses()
    )}>
      {getIcon()}
      <div className="flex-1">
        <p className="font-medium text-sm">
          {prazoInfo.textoTempo}
        </p>
        {prazoInfo.dataLimite && (
          <p className="text-xs opacity-75">
            Prazo: {prazoInfo.dataLimite.toLocaleDateString('pt-BR')} às {prazoInfo.dataLimite.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
      {prazoInfo.vencido && (
        <Badge variant="destructive" className="text-xs">
          VENCIDO
        </Badge>
      )}
    </div>
  );
};