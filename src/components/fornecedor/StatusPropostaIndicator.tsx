import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  HelpCircle,
  Pause
} from 'lucide-react';

interface StatusPropostaIndicatorProps {
  status: 'rascunho' | 'enviada' | 'vencida' | 'desistencia_solicitada' | 'desistencia_aprovada' | 'aguardando_resposta';
  prazoVencido?: boolean;
  penalidadeAplicada?: boolean;
}

export const StatusPropostaIndicator: React.FC<StatusPropostaIndicatorProps> = ({
  status,
  prazoVencido = false,
  penalidadeAplicada = false
}) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'rascunho':
        return {
          icon: <Clock className="h-3 w-3" />,
          label: 'Em andamento',
          className: 'bg-blue-50 text-blue-700 border-blue-200',
          tooltip: 'Proposta ainda não foi enviada'
        };
      case 'enviada':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          label: 'Enviada',
          className: 'bg-green-50 text-green-700 border-green-200',
          tooltip: 'Proposta enviada com sucesso'
        };
      case 'vencida':
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          label: 'Prazo vencido',
          className: 'bg-red-50 text-red-700 border-red-200',
          tooltip: 'O prazo para envio da proposta expirou'
        };
      case 'desistencia_solicitada':
        return {
          icon: <Pause className="h-3 w-3" />,
          label: 'Desistência solicitada',
          className: 'bg-orange-50 text-orange-700 border-orange-200',
          tooltip: 'Solicitação de desistência enviada para análise'
        };
      case 'desistencia_aprovada':
        return {
          icon: <XCircle className="h-3 w-3" />,
          label: penalidadeAplicada ? 'Desistência (penalizada)' : 'Desistência aprovada',
          className: penalidadeAplicada ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-700 border-gray-200',
          tooltip: penalidadeAplicada 
            ? 'Desistência aprovada com aplicação de penalidade'
            : 'Desistência aprovada pela administração'
        };
      case 'aguardando_resposta':
        return {
          icon: <HelpCircle className="h-3 w-3" />,
          label: 'Aguardando resposta',
          className: 'bg-purple-50 text-purple-700 border-purple-200',
          tooltip: 'Solicitação de ajuda enviada, aguardando resposta'
        };
      default:
        return {
          icon: <Clock className="h-3 w-3" />,
          label: 'Status desconhecido',
          className: 'bg-gray-50 text-gray-700 border-gray-200',
          tooltip: 'Status não identificado'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`flex items-center gap-1 text-xs ${statusInfo.className}`}
          >
            {statusInfo.icon}
            {statusInfo.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{statusInfo.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};