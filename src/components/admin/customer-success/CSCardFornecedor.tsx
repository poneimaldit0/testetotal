import { CSFornecedor } from '@/types/customerSuccess';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CSCardFornecedorProps {
  fornecedor: CSFornecedor;
  onDragStart: (e: React.DragEvent) => void;
  onClick: () => void;
}

export function CSCardFornecedor({ fornecedor, onDragStart, onClick }: CSCardFornecedorProps) {
  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="p-3 cursor-pointer hover:shadow-md transition-shadow bg-background"
    >
      <div className="space-y-2">
        {/* Nome e empresa */}
        <div>
          <h4 className="font-medium text-sm truncate">
            {fornecedor.fornecedor?.nome || 'Sem nome'}
          </h4>
          {fornecedor.fornecedor?.empresa && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span className="truncate">{fornecedor.fornecedor.empresa}</span>
            </div>
          )}
        </div>

        {/* Semana atual */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            Semana {fornecedor.semana_atual}
            {fornecedor.semana_atual > 12 && ` (C${Math.ceil(fornecedor.semana_atual / 12)})`}
          </Badge>
          
          {/* Progress bar - ciclo de 12 semanas */}
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(((fornecedor.semana_atual - 1) % 12 + 1) / 12) * 100}%` }}
            />
          </div>
        </div>

        {/* CS responsável */}
        {fornecedor.cs_responsavel && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">{fornecedor.cs_responsavel.nome}</span>
          </div>
        )}

        {/* Data de início */}
        <div className="text-xs text-muted-foreground">
          Início: {format(new Date(fornecedor.data_inicio_acompanhamento), 'dd/MM/yyyy', { locale: ptBR })}
        </div>
      </div>
    </Card>
  );
}
