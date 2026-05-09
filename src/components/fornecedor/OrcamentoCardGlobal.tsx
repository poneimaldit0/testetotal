
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MessageCircle, Mail, Phone, Users, Clock, X, ChevronDown, ChevronUp, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { OrcamentoGlobal } from '@/hooks/useOrcamentosGlobal';
import { ContatoSection } from './ContatoSection';
import { AnexosOrcamento } from './AnexosOrcamento';

export interface HorarioVisita {
  id: string;
  data_hora: string;
  fornecedor_id: string | null;
}

interface OrcamentoCardGlobalProps {
  orcamento: OrcamentoGlobal;
  onOpenModal: (orcamentoId: string, horarioVisitaId?: string) => void;
  onAbrirWhatsApp: (telefone: string, nome: string, orcamentoId: string) => void;
}

export const OrcamentoCardGlobal: React.FC<OrcamentoCardGlobalProps> = ({
  orcamento,
  onOpenModal,
  onAbrirWhatsApp,
}) => {
  const [descricaoExpandida, setDescricaoExpandida] = useState(false);
  const LIMITE_CARACTERES = 80;
  const descricaoLonga = orcamento.necessidade.length > LIMITE_CARACTERES;

  const horariosVisita = orcamento.horariosVisita || [];
  const temHorarios = horariosVisita.length > 0;

  const exibirPrazoInicio = () => {
    if (orcamento.prazoInicioTexto) {
      return orcamento.prazoInicioTexto;
    }
    if (orcamento.dataInicio instanceof Date) {
      return format(orcamento.dataInicio, 'dd/MM/yyyy');
    }
    return typeof orcamento.dataInicio === 'string' ? orcamento.dataInicio : 'Não informado';
  };

  const formatarHorario = (dataHora: string) => {
    const date = new Date(dataHora);
    return format(date, "EEE, dd/MM 'às' HH:mm", { locale: ptBR });
  };

  return (
    <Card className="w-full max-w-full box-border overflow-hidden bg-white shadow-lg border border-gray-100 rounded-xl hover:shadow-xl transition-shadow">
      <CardHeader className="p-3 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-3 md:gap-0">
          <div>
            <CardTitle className="text-base md:text-lg text-gray-800 font-semibold">
              Orçamento #{orcamento.id.slice(-8)}
            </CardTitle>
            <p className="text-xs md:text-sm text-gray-500">
              Publicado em {format(orcamento.dataPublicacao, "dd/MM/yyyy", { locale: ptBR })}
            </p>
            {orcamento.estaInscrito && orcamento.inscritoEm && (
              <p className="text-[10px] md:text-xs text-blue-600">
                Inscrito em {format(orcamento.inscritoEm, "dd/MM/yyyy", { locale: ptBR })}
              </p>
            )}
          </div>
          <div className="flex gap-1.5 md:gap-2 flex-wrap max-w-full overflow-hidden">
            <Badge className={`text-[10px] md:text-xs ${orcamento.status === 'aberto' ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'}`}>
              {orcamento.status.toUpperCase()}
            </Badge>
            {orcamento.estaInscrito && (
              <Badge variant="outline" className="text-[10px] md:text-xs text-blue-600 border-blue-600">
                INSCRITO
              </Badge>
            )}
            {orcamento.categorias.map((categoria, index) => (
              <Badge key={index} variant="secondary" className="text-[10px] md:text-xs bg-blue-100 text-blue-800 max-w-[120px] truncate">
                {categoria}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 md:p-6 pt-0">
        <div className="space-y-3 md:space-y-4">
          {/* Descrição colapsável */}
          <Collapsible open={descricaoExpandida} onOpenChange={setDescricaoExpandida}>
            <div className="space-y-1">
              <p className={`text-xs md:text-sm text-gray-700 break-words overflow-wrap-anywhere ${
                descricaoExpandida || !descricaoLonga 
                  ? '' 
                  : 'line-clamp-2 overflow-hidden'
              }`}>
                {orcamento.necessidade}
              </p>
              {descricaoLonga && (
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800 hover:bg-transparent font-medium"
                  >
                    {descricaoExpandida ? (
                      <>
                        Ver menos <ChevronUp className="ml-1 h-3 w-3" />
                      </>
                    ) : (
                      <>
                        Ver descrição completa <ChevronDown className="ml-1 h-3 w-3" />
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
          </Collapsible>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 text-xs md:text-sm min-w-0 max-w-full overflow-hidden">
            <div className="min-w-0 max-w-full overflow-hidden">
              <span className="font-medium text-gray-600">Local:</span> 
              <span className="ml-1 text-gray-800 truncate block">{orcamento.local}</span>
            </div>
            <div className="min-w-0 max-w-full overflow-hidden">
              <span className="font-medium text-gray-600">Tamanho:</span> 
              <span className="ml-1 text-gray-800 truncate block">{orcamento.tamanhoImovel || 'N/A'} m²</span>
            </div>
            <div className="flex items-center gap-1 min-w-0 max-w-full overflow-hidden">
              <Users className="h-3 w-3 md:h-4 md:w-4 text-gray-500 flex-shrink-0" />
              <span className="font-medium text-gray-600">Empresas:</span> 
              <span className="ml-1 text-gray-800 truncate">{orcamento.quantidadeEmpresas}/3</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4">
            <div className="text-xs md:text-sm flex items-center gap-1">
              <Clock className="h-3 w-3 md:h-4 md:w-4 text-gray-500" />
              <span className="font-medium text-gray-600">Início pretendido:</span>{' '}
              {exibirPrazoInicio()}
            </div>
            
            {/* Botões de ação */}
            {orcamento.status === 'aberto' && !orcamento.estaInscrito ? (
              temHorarios ? (
                // Exibir botões de horários de visita
                <div className="w-full md:w-auto space-y-2">
                  <div className="flex items-center gap-1 text-xs text-green-700 font-medium">
                    <CalendarClock className="h-3 w-3" />
                    Escolha um horário de visita técnica:
                  </div>
                  <div className="flex flex-col md:flex-row gap-2">
                    {horariosVisita.map((horario) => {
                      const reservado = !!horario.fornecedor_id;
                      return (
                        <DialogTrigger asChild key={horario.id}>
                          <Button
                            size="sm"
                            disabled={reservado}
                            onClick={() => !reservado && onOpenModal(orcamento.id, horario.id)}
                            className={`text-xs ${
                              reservado 
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300' 
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            {reservado ? (
                              <>❌ Reservado</>
                            ) : (
                              <>📅 {formatarHorario(horario.data_hora)}</>
                            )}
                          </Button>
                        </DialogTrigger>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => onOpenModal(orcamento.id)} 
                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm"
                  >
                    Inscrever-se
                  </Button>
                </DialogTrigger>
              )
            ) : orcamento.estaInscrito ? (
              <Badge variant="outline" className="text-[10px] md:text-xs text-blue-600 border-blue-600">
                Inscrito
              </Badge>
            ) : orcamento.status === 'fechado' ? (
              <div className="flex items-center gap-2">
                <X className="h-3 w-3 md:h-4 md:w-4 text-gray-500" />
                <Badge variant="secondary" className="text-[10px] md:text-xs text-gray-600">
                  Fechado - 3 empresas
                </Badge>
              </div>
            ) : null}
          </div>

          {/* Exibir anexos se o fornecedor estiver inscrito */}
          {orcamento.estaInscrito && (orcamento.arquivos?.length > 0 || orcamento.fotos?.length > 0) && (
            <AnexosOrcamento 
              arquivos={orcamento.arquivos || []} 
              fotos={orcamento.fotos || []} 
            />
          )}

          {/* Mostrar dados do cliente se inscrito e orçamento fechado */}
          {orcamento.estaInscrito && orcamento.status === 'fechado' && orcamento.dadosContato && (
            <ContatoSection
              dadosContato={orcamento.dadosContato}
              orcamentoId={orcamento.id}
              localReforma={orcamento.local}
            />
          )}

          {/* Aviso para orçamentos fechados onde não está inscrito */}
          {!orcamento.estaInscrito && orcamento.status === 'fechado' && (
            <div className="mt-4 p-2 md:p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs md:text-sm text-gray-600 flex items-center gap-2">
                <Clock className="h-3 w-3 md:h-4 md:w-4" />
                Este orçamento já foi fechado com 3 empresas. Novas inscrições não são aceitas.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
