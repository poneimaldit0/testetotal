import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { 
  STATUS_LABELS, 
  STATUS_COLORS, 
  StatusAcompanhamento 
} from '@/hooks/useStatusAcompanhamento';
import { OrcamentoPendente } from '@/hooks/useVerificacaoAtualizacaoDiaria';

interface OrcamentoPendenteCardProps {
  pendencia: OrcamentoPendente;
  onStatusChange: (inscricaoId: string, novoStatus: StatusAcompanhamento) => void;
  statusPendente?: StatusAcompanhamento;
  foiAtualizado: boolean;
  modoObrigatorio: boolean;
}

// Opções de status disponíveis para seleção (valores corretos do sistema)
const STATUS_OPTIONS: StatusAcompanhamento[] = [
  '1_contato_realizado',
  '2_contato_realizado',
  '3_contato_realizado',
  '4_contato_realizado',
  '5_contato_realizado',
  'cliente_respondeu_nao_agendou',
  'nao_respondeu_mensagens',
  'visita_agendada',
  'visita_realizada',
  'em_orcamento',
  'orcamento_enviado',
  'negocio_fechado',
  'negocio_perdido',
];

export const OrcamentoPendenteCard: React.FC<OrcamentoPendenteCardProps> = ({
  pendencia,
  onStatusChange,
  statusPendente,
  foiAtualizado,
  modoObrigatorio,
}) => {
  // Status do banco (para exibir no badge "Status atual:")
  const statusDoBanco = pendencia.status_acompanhamento as StatusAcompanhamento | null;
  const statusAtualColor = statusDoBanco ? STATUS_COLORS[statusDoBanco] : 'bg-gray-100 text-gray-600';
  const statusAtualLabel = statusDoBanco ? STATUS_LABELS[statusDoBanco] : 'Sem status definido';

  // Status no dropdown (usa pendente se existir, senão o do banco)
  const statusNoDropdown = statusPendente || statusDoBanco;
  
  const temMudancaPendente = statusPendente !== undefined;
  
  const isAberto = pendencia.status_orcamento === 'aberto';

  // Define a classe da borda baseada no estado
  const getBorderClass = () => {
    if (foiAtualizado) return 'border-green-300 bg-green-50/30';
    if (temMudancaPendente) return 'border-amber-300 bg-amber-50/30';
    return 'border-border';
  };

  return (
    <Card className={`border transition-all ${getBorderClass()}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header com código e badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-semibold text-sm text-foreground">
              {pendencia.codigo_orcamento}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground truncate max-w-[150px]">
              {pendencia.cliente_nome || 'Cliente'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={isAberto 
                ? 'bg-green-100 text-green-700 border-green-200' 
                : 'bg-gray-100 text-gray-600 border-gray-200'
              }
            >
              {isAberto ? 'Aberto' : 'Fechado'}
            </Badge>
            
            {modoObrigatorio && foiAtualizado && (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
            {temMudancaPendente && !foiAtualizado && (
              <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                Não salvo
              </Badge>
            )}
          </div>
        </div>

        {/* Local */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate">{pendencia.local || 'Local não informado'}</span>
        </div>

        {/* Status atual e seletor */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status atual:</span>
            <Badge className={`${statusAtualColor} text-xs`}>
              {statusAtualLabel}
            </Badge>
          </div>

          <Select
            value={statusNoDropdown || ''}
            onValueChange={(value) => onStatusChange(pendencia.inscricao_id, value as StatusAcompanhamento)}
          >
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[status].split(' ')[0]}`} />
                    {STATUS_LABELS[status]}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Aviso se não tem status */}
        {!statusNoDropdown && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Defina um status para este orçamento</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
