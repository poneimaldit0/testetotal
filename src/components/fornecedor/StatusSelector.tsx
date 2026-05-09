
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  StatusAcompanhamento, 
  STATUS_LABELS, 
  STATUS_CATEGORIES, 
  STATUS_COLORS,
  useStatusAcompanhamento 
} from '@/hooks/useStatusAcompanhamento';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, AlertCircle } from 'lucide-react';

interface StatusSelectorProps {
  inscricaoId: string;
  statusAtual?: StatusAcompanhamento | null;
  onStatusChange?: () => void;
  onStatusUpdate?: (novoStatus: StatusAcompanhamento) => void;
}

export const StatusSelector: React.FC<StatusSelectorProps> = ({
  inscricaoId,
  statusAtual,
  onStatusChange,
  onStatusUpdate,
}) => {
  const { atualizarStatus } = useStatusAcompanhamento();

  const handleStatusChange = async (novoStatus: StatusAcompanhamento) => {
    console.log('🔄 StatusSelector: Atualizando status para:', novoStatus);
    
    // Update otimista - atualiza UI imediatamente
    if (onStatusUpdate) {
      onStatusUpdate(novoStatus);
    }
    
    // Salvar no banco
    const sucesso = await atualizarStatus(inscricaoId, novoStatus);
    
    // Se falhar, fazer refresh completo para reverter
    if (!sucesso && onStatusChange) {
      onStatusChange();
    }
  };

  // Determinar a aparência baseada se há status ou não
  const isStatusEmpty = !statusAtual;
  const triggerClassName = isStatusEmpty 
    ? "h-6 w-auto min-w-[140px] text-xs border border-amber-300 bg-amber-50 p-1 gap-1 hover:bg-amber-100 focus:ring-2 focus:ring-amber-400/50 text-amber-800"
    : "h-6 w-auto min-w-[140px] text-xs border-none bg-transparent p-1 gap-1 hover:bg-gray-50 focus:ring-1 focus:ring-primary/20";

  return (
    <Select value={statusAtual || ""} onValueChange={handleStatusChange}>
      <SelectTrigger className={triggerClassName}>
        <div className="flex items-center gap-1">
          {statusAtual ? (
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[statusAtual].split(' ')[0]}`} />
              <span className="text-xs font-medium truncate">
                {STATUS_LABELS[statusAtual]}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-amber-600" />
              <span className="text-xs font-medium truncate text-amber-800">
                Definir status
              </span>
            </div>
          )}
        </div>
        <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
      </SelectTrigger>
      <SelectContent className="min-w-[220px]">
        {Object.entries(STATUS_CATEGORIES).map(([categoria, statusList], categoryIndex) => (
          <div key={categoria}>
            {categoryIndex > 0 && <Separator />}
            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {categoria}
            </div>
            {statusList.map((status) => (
              <SelectItem key={status} value={status}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[status].split(' ')[0]}`} />
                  <span className="text-xs">{STATUS_LABELS[status]}</span>
                </div>
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
};
