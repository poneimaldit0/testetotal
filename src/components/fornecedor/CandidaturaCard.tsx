import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock, Users, CheckCircle, Video,
  MapPin, AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CandidaturaOrcamento } from '@/hooks/useMeusCandiaturas';
import { supabase } from '@/integrations/supabase/client';
import { ContatoSection } from './ContatoSection';
import { AnexosOrcamento } from './AnexosOrcamento';
import { PropostaAnexoUpload } from './PropostaAnexoUpload';
import { ConciergeInfo } from './ConciergeInfo';

interface CandidaturaCardProps {
  candidatura: CandidaturaOrcamento;
  onStatusChange: () => void;
  onStatusUpdate?: (candidaturaId: string, novoStatus: import('@/hooks/useStatusAcompanhamento').StatusAcompanhamento) => void;
}

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  inscrito:                      { label: 'Inscrito',               color: 'blue'   },
  '1_contato_realizado':         { label: 'Aguardando agendamento',  color: 'blue'   },
  '2_contato_realizado':         { label: 'Aguardando agendamento',  color: 'blue'   },
  '3_contato_realizado':         { label: 'Aguardando agendamento',  color: 'blue'   },
  '4_contato_realizado':         { label: 'Aguardando agendamento',  color: 'blue'   },
  '5_contato_realizado':         { label: 'Aguardando agendamento',  color: 'blue'   },
  cliente_respondeu_nao_agendou: { label: 'Aguardando agendamento',  color: 'blue'   },
  nao_respondeu_mensagens:       { label: 'Aguardando agendamento',  color: 'blue'   },
  visita_agendada:               { label: 'Visita agendada',         color: 'amber'  },
  visita_realizada:              { label: 'Visita realizada',        color: 'green'  },
  reuniao_agendada:              { label: 'Reunião agendada',        color: 'violet' },
  reuniao_realizada:             { label: 'Reunião realizada',       color: 'green'  },
  em_orcamento:                  { label: 'Em elaboração',           color: 'indigo' },
  orcamento_enviado:             { label: 'Proposta enviada',        color: 'green'  },
  negocio_fechado:               { label: 'Negócio fechado',         color: 'green'  },
  negocio_perdido:               { label: 'Proposta não selecionada',color: 'gray'   },
};

const BADGE_COLORS: Record<string, string> = {
  blue:   'bg-blue-100 text-blue-800 border-blue-200',
  amber:  'bg-amber-100 text-amber-800 border-amber-200',
  violet: 'bg-violet-100 text-violet-800 border-violet-200',
  green:  'bg-green-100 text-green-800 border-green-200',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  gray:   'bg-gray-100 text-gray-600 border-gray-200',
};

function StatusBadge({ status }: { status: string | null }) {
  const info = STATUS_INFO[status ?? 'inscrito'] ?? { label: 'Aguardando contato', color: 'blue' };
  return (
    <Badge variant="outline" className={`text-xs ${BADGE_COLORS[info.color] ?? BADGE_COLORS.blue}`}>
      {info.label}
    </Badge>
  );
}

function PainelOperacional({ candidatura }: { candidatura: CandidaturaOrcamento }) {
  const s = candidatura.statusAcompanhamento;
  const [preConfirmadoEm, setPreConfirmadoEm] = useState<string | null>(candidatura.preConfirmadoEm ?? null);
  const [salvando, setSalvando] = useState(false);

  const confirmarPresenca = async (via: string) => {
    if (preConfirmadoEm || salvando) return;
    setSalvando(true);
    try {
      const agora = new Date().toISOString();
      await (supabase as any)
        .from('candidaturas_fornecedores')
        .update({ pre_confirmado_em: agora, pre_confirmado_via: via })
        .eq('id', candidatura.candidaturaId)
        .is('pre_confirmado_em', null);
      setPreConfirmadoEm(agora);
    } catch { /* silent */ } finally {
      setSalvando(false);
    }
  };

  const isVisitaAgendada  = s === 'visita_agendada';
  const isVisitaRealizada = s === 'visita_realizada';
  const isReuniaoAgendada  = s === 'reuniao_agendada';
  const isReuniaoRealizada = s === 'reuniao_realizada';
  const isNegocioPerdido  = s === 'negocio_perdido';
  const isNegocioFechado  = s === 'negocio_fechado';
  const isPropostaEnviada = s === 'orcamento_enviado';

  const temAtendimento = isVisitaAgendada || isVisitaRealizada || isReuniaoAgendada || isReuniaoRealizada;

  if (isNegocioPerdido) {
    return (
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
        Proposta não selecionada para este orçamento.
      </div>
    );
  }

  if (isNegocioFechado) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
        Negócio fechado.
      </div>
    );
  }

  if (isPropostaEnviada) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
        Proposta enviada com sucesso. Aguarde o retorno da Reforma100.
      </div>
    );
  }

  if (!temAtendimento) {
    return (
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
        A Reforma100 está em contato. Você será notificado quando o atendimento técnico for agendado.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Visita presencial */}
      {(isVisitaAgendada || isVisitaRealizada) && (
        <div className={`p-3 rounded-lg border space-y-2 ${isVisitaRealizada ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-2">
            <MapPin className={`h-4 w-4 flex-shrink-0 ${isVisitaRealizada ? 'text-green-600' : 'text-amber-600'}`} />
            <span className={`text-sm font-medium ${isVisitaRealizada ? 'text-green-800' : 'text-amber-800'}`}>
              Visita presencial — {isVisitaRealizada ? 'realizada' : 'agendada'}
            </span>
          </div>

          {candidatura.horarioVisitaAgendado && (
            <p className="text-sm text-gray-700 ml-6">
              {format(new Date(candidatura.horarioVisitaAgendado), "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}

          {isVisitaRealizada && candidatura.visitaConfirmadaEm && (
            <p className="text-xs text-green-700 ml-6 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Presença confirmada em {format(new Date(candidatura.visitaConfirmadaEm), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </p>
          )}

          {isVisitaAgendada && (
            preConfirmadoEm ? (
              <p className="text-xs text-green-700 ml-6 flex items-center gap-1 font-medium">
                <CheckCircle className="h-3 w-3 flex-shrink-0" />
                Participação pré-confirmada em {format(new Date(preConfirmadoEm), "dd/MM 'às' HH:mm", { locale: ptBR })}
              </p>
            ) : (
              <div className="ml-6 space-y-1.5">
                <Button
                  size="sm"
                  disabled={salvando}
                  onClick={() => confirmarPresenca('visita_presencial')}
                  className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto"
                >
                  {salvando ? '…' : 'Pré-confirmar participação'}
                </Button>
                <p className="text-xs text-amber-700 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  A confirmação oficial será feita via QR Code no local da reforma.
                </p>
              </div>
            )
          )}
        </div>
      )}

      {/* Reunião online */}
      {(isReuniaoAgendada || isReuniaoRealizada) && (
        <div className={`p-3 rounded-lg border space-y-2 ${isReuniaoRealizada ? 'bg-green-50 border-green-200' : 'bg-violet-50 border-violet-200'}`}>
          <div className="flex items-center gap-2">
            <Video className={`h-4 w-4 flex-shrink-0 ${isReuniaoRealizada ? 'text-green-600' : 'text-violet-600'}`} />
            <span className={`text-sm font-medium ${isReuniaoRealizada ? 'text-green-800' : 'text-violet-800'}`}>
              Reunião online — {isReuniaoRealizada ? 'realizada' : 'agendada'}
            </span>
          </div>

          {candidatura.horarioVisitaAgendado && (
            <p className="text-sm text-gray-700 ml-6">
              {format(new Date(candidatura.horarioVisitaAgendado), "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}

          {isReuniaoRealizada ? (
            <p className="text-xs text-green-700 ml-6 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Acesso registrado.
            </p>
          ) : candidatura.tokenVisita ? (
            <div className="ml-0 sm:ml-6 space-y-2">
              <a
                href={`/entrar-reuniao/${candidatura.candidaturaId}/${candidatura.tokenVisita}`}
                target="_blank"
                rel="noreferrer"
                className="block sm:inline-block"
              >
                <Button
                  size="sm"
                  className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white text-sm h-10 sm:h-8 sm:text-xs"
                >
                  <Video className="h-4 w-4 sm:h-3 sm:w-3 mr-2 sm:mr-1.5" />
                  Acessar reunião
                </Button>
              </a>
              {preConfirmadoEm ? (
                <p className="text-xs text-green-700 flex items-center gap-1 font-medium">
                  <CheckCircle className="h-3 w-3 flex-shrink-0" />
                  Participação pré-confirmada em {format(new Date(preConfirmadoEm), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </p>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={salvando}
                  onClick={() => confirmarPresenca('reuniao_online')}
                  className="w-full sm:w-auto h-8 text-xs border-violet-300 text-violet-700 hover:bg-violet-50"
                >
                  {salvando ? '…' : 'Pré-confirmar participação'}
                </Button>
              )}
            </div>
          ) : (
            <div className="ml-6 space-y-2">
              <p className="text-xs text-violet-700 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                O link de acesso será enviado pela Reforma100.
              </p>
              {preConfirmadoEm ? (
                <p className="text-xs text-green-700 flex items-center gap-1 font-medium">
                  <CheckCircle className="h-3 w-3 flex-shrink-0" />
                  Participação pré-confirmada em {format(new Date(preConfirmadoEm), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </p>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={salvando}
                  onClick={() => confirmarPresenca('reuniao_online')}
                  className="w-full sm:w-auto h-8 text-xs border-violet-300 text-violet-700 hover:bg-violet-50"
                >
                  {salvando ? '…' : 'Pré-confirmar participação'}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const CandidaturaCard: React.FC<CandidaturaCardProps> = ({
  candidatura,
  onStatusChange: _onStatusChange,
}) => {
  const s = candidatura.statusAcompanhamento;
  const showUpload = s !== 'negocio_perdido' && s !== 'negocio_fechado';
  const showContato = !!candidatura.dadosContato && candidatura.status === 'fechado';

  return (
    <Card className="bg-white shadow-lg border border-gray-100 rounded-xl hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg text-gray-800 font-semibold">
              Orçamento #{candidatura.id.slice(-8)}
            </CardTitle>
            <p className="text-xs sm:text-sm text-gray-500">
              Publicado em {format(candidatura.dataPublicacao, "dd/MM/yyyy", { locale: ptBR })}
            </p>
            <p className="text-xs text-blue-600">
              Candidatura em {format(candidatura.dataCandidatura, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-end">
            <Badge className={candidatura.status === 'aberto' ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'}>
              {candidatura.status.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              CANDIDATO
            </Badge>
            <StatusBadge status={candidatura.statusAcompanhamento} />
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
              <span className="font-medium text-gray-600">Inscritas:</span>
              <span className="ml-1 text-gray-800">{Math.min(candidatura.quantidadeEmpresas, 3)}/3</span>
            </div>
          </div>

          <div className="text-sm flex items-center gap-1">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="font-medium text-gray-600">Início pretendido:</span>{' '}
            {candidatura.prazoInicioTexto
              ? candidatura.prazoInicioTexto
              : (candidatura.dataInicio instanceof Date
                  ? format(candidatura.dataInicio, 'dd/MM/yyyy')
                  : candidatura.dataInicio || 'Não informado')}
          </div>

          {/* Painel operacional baseado em status_acompanhamento */}
          <PainelOperacional candidatura={candidatura} />

          {/* Anexos do orçamento — liberados após inscrição */}
          {(candidatura.arquivos?.length > 0 || candidatura.fotos?.length > 0) && (
            <AnexosOrcamento
              arquivos={candidatura.arquivos || []}
              fotos={candidatura.fotos || []}
            />
          )}

          {/* Upload de proposta */}
          {showUpload && (
            <div className="border-t pt-4">
              <PropostaAnexoUpload
                candidaturaId={candidatura.candidaturaId}
                orcamentoId={candidatura.id}
              />
            </div>
          )}

          {/* Concierge responsável */}
          {candidatura.conciergeResponsavel && (
            <ConciergeInfo concierge={candidatura.conciergeResponsavel} />
          )}

          {/* Dados do cliente — só após fechamento */}
          {showContato && (
            <ContatoSection
              dadosContato={candidatura.dadosContato!}
              orcamentoId={candidatura.id}
              localReforma={candidatura.local}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
