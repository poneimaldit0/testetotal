import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OrcamentoCRMComChecklist } from '@/types/crm';
import { Snowflake, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrcamentoCRMCardMinimizadoProps {
  orcamento: OrcamentoCRMComChecklist;
  onClick: () => void;
}

export const OrcamentoCRMCardMinimizado = ({
  orcamento,
  onClick
}: OrcamentoCRMCardMinimizadoProps) => {
  const nomeCliente = orcamento.dados_contato?.nome || 'Cliente sem nome';
  const codigoOrcamento = orcamento.codigo_orcamento || orcamento.id.slice(0, 8);

  return (
    <Card 
      className="p-3 cursor-pointer hover:shadow-md transition-all border-blue-200 bg-blue-50/50 border-dashed"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Snowflake className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <p className="font-medium text-sm truncate">{nomeCliente}</p>
          </div>
          <p className="text-xs text-muted-foreground">#{codigoOrcamento}</p>
        </div>
        
        {orcamento.data_reativacao_prevista && (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs flex-shrink-0">
            <Calendar className="h-3 w-3 mr-1" />
            {format(new Date(orcamento.data_reativacao_prevista), "dd/MM", { locale: ptBR })}
          </Badge>
        )}
      </div>
      
      {orcamento.motivo_congelamento && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-1 italic">
          "{orcamento.motivo_congelamento}"
        </p>
      )}
    </Card>
  );
};