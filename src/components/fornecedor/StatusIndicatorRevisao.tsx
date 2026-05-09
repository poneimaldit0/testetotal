import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface StatusIndicatorRevisaoProps {
  status: 'em_revisao' | 'enviado' | 'rascunho' | string;
  autoSaving?: boolean;
  lastSaved?: Date;
}

export const StatusIndicatorRevisao: React.FC<StatusIndicatorRevisaoProps> = ({
  status,
  autoSaving = false,
  lastSaved
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'em_revisao':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <Clock className="w-3 h-3" />,
          text: 'Em Revisão'
        };
      case 'enviado':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: <CheckCircle className="w-3 h-3" />,
          text: 'Enviado'
        };
      case 'rascunho':
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <AlertTriangle className="w-3 h-3" />,
          text: 'Rascunho'
        };
      default:
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <Clock className="w-3 h-3" />,
          text: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={config.color}>
        {config.icon}
        <span className="ml-1">{config.text}</span>
      </Badge>
      
      {autoSaving && (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 animate-pulse">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
          Salvando...
        </Badge>
      )}
      
      {lastSaved && status === 'em_revisao' && !autoSaving && (
        <span className="text-xs text-muted-foreground">
          Última alteração: {lastSaved.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      )}
    </div>
  );
};