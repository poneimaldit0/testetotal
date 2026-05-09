import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CandidaturaOrcamento } from '@/hooks/useMeusCandiaturas';
import { ContatoSection } from './ContatoSection';
import { StatusSelector } from './StatusSelector';
import { ObservacoesStatus } from './ObservacoesStatus';
import { AnexosOrcamento } from './AnexosOrcamento';
import { PropostaAnexoUpload } from './PropostaAnexoUpload';
import { ConciergeInfo } from './ConciergeInfo';

interface CandidaturaCardProps {
  candidatura: CandidaturaOrcamento;
  onStatusChange: () => void;
  onStatusUpdate?: (candidaturaId: string, novoStatus: import('@/hooks/useStatusAcompanhamento').StatusAcompanhamento) => void;
}

export const CandidaturaCard: React.FC<CandidaturaCardProps> = ({
  candidatura,
  onStatusChange,
  onStatusUpdate,
}) => {
  // WhatsApp handling is now done inside ContatoSection

  return (
    <Card className="bg-white shadow-lg border border-gray-100 rounded-xl hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg text-gray-800 font-semibold">
              Orçamento #{candidatura.id.slice(-8)}
            </CardTitle>
            <p className="text-sm text-gray-500">
              Publicado em {format(candidatura.dataPublicacao, "dd/MM/yyyy", { locale: ptBR })}
            </p>
            <p className="text-xs text-blue-600">
              Candidatura em {format(candidatura.dataCandidatura, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge className={candidatura.status === 'aberto' ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'}>
              {candidatura.status.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              CANDIDATO
            </Badge>
            {candidatura.categorias.map((categoria, index) => (
              <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800">
                {categoria}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-700">{candidatura.necessidade}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Local:</span> 
              <span className="ml-1 text-gray-800">{candidatura.local}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Tamanho:</span> 
              <span className="ml-1 text-gray-800">{candidatura.tamanhoImovel || 'N/A'} m²</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-600">Empresas:</span> 
              <span className="ml-1 text-gray-800">{candidatura.quantidadeEmpresas}/3</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm flex items-center gap-1">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-600">Início pretendido:</span>{' '}
              {candidatura.prazoInicioTexto 
                ? candidatura.prazoInicioTexto 
                : (candidatura.dataInicio instanceof Date 
                    ? format(candidatura.dataInicio, 'dd/MM/yyyy')
                    : candidatura.dataInicio || 'Não informado')}
            </div>
          </div>

          {/* Horário de visita agendado */}
          {candidatura.horarioVisitaAgendado && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-green-600 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium text-green-800">Visita agendada: </span>
                <span className="text-green-700">
                  {format(new Date(candidatura.horarioVisitaAgendado), "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>
          )}

          {/* Exibir anexos quando disponíveis */}
          {(candidatura.arquivos?.length > 0 || candidatura.fotos?.length > 0) && (
            <AnexosOrcamento 
              arquivos={candidatura.arquivos || []} 
              fotos={candidatura.fotos || []} 
            />
          )}

          {/* Upload de Proposta - Novo fluxo simplificado */}
          <div className="border-t pt-4">
            <PropostaAnexoUpload
              candidaturaId={candidatura.candidaturaId}
              orcamentoId={candidatura.id}
            />
          </div>

          {/* Status de Acompanhamento */}
          <div className="border-t pt-4">
            <StatusSelector
              statusAtual={candidatura.statusAcompanhamento}
              inscricaoId={candidatura.candidaturaId}
              onStatusChange={onStatusChange}
              onStatusUpdate={onStatusUpdate ? (novoStatus) => onStatusUpdate(candidatura.candidaturaId, novoStatus) : undefined}
            />
            <ObservacoesStatus
              inscricaoId={candidatura.candidaturaId}
              observacoesAtuais={candidatura.observacoesAcompanhamento}
              onSave={onStatusChange}
            />
          </div>

          {/* Concierge Responsável */}
          {candidatura.conciergeResponsavel && (
            <ConciergeInfo concierge={candidatura.conciergeResponsavel} />
          )}

          {/* Dados do cliente */}
          {candidatura.dadosContato && (
            <ContatoSection
              dadosContato={candidatura.dadosContato}
              orcamentoId={candidatura.id}
              localReforma={candidatura.local}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
