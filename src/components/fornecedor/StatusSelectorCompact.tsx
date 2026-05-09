import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  StatusAcompanhamento, 
  STATUS_LABELS, 
  STATUS_CATEGORIES, 
  STATUS_COLORS,
  useStatusAcompanhamento 
} from '@/hooks/useStatusAcompanhamento';
import { Separator } from '@/components/ui/separator';
import { ChevronDown } from 'lucide-react';

interface StatusSelectorCompactProps {
  inscricaoId: string;
  statusAtual?: string | null;
  onStatusChange?: () => void;
}

export const StatusSelectorCompact: React.FC<StatusSelectorCompactProps> = ({
  inscricaoId,
  statusAtual,
  onStatusChange,
}) => {
  const { atualizarStatus } = useStatusAcompanhamento();

  const handleStatusChange = async (novoStatus: StatusAcompanhamento) => {
    const sucesso = await atualizarStatus(inscricaoId, novoStatus);
    if (sucesso && onStatusChange) {
      onStatusChange();
    }
  };

  const currentStatus = statusAtual as StatusAcompanhamento | null;
  const hasStatus = !!currentStatus && currentStatus in STATUS_LABELS;

  return (
    <Select value={currentStatus || ""} onValueChange={handleStatusChange}>
      <SelectTrigger className="h-7 w-auto min-w-[130px] max-w-[160px] text-xs border bg-background p-1.5 gap-1 hover:bg-muted/50 focus:ring-1 focus:ring-primary/20">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {hasStatus ? (
            <>
              <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[currentStatus].split(' ')[0]}`} />
              <span className="text-xs font-medium truncate">
                {STATUS_LABELS[currentStatus]}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground truncate">
              Sem status
            </span>
          )}
        </div>
        <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
      </SelectTrigger>
      <SelectContent className="min-w-[200px]">
        {Object.entries(STATUS_CATEGORIES).map(([categoria, statusList], categoryIndex) => (
          <div key={categoria}>
            {categoryIndex > 0 && <Separator />}
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
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
