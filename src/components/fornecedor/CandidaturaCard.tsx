import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock, Users, CheckCircle, Video,
  MapPin, AlertCircle, Paperclip,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CandidaturaOrcamento } from '@/hooks/useMeusCandiaturas';
import { supabase } from '@/integrations/supabase/client';
import { ContatoSection } from './ContatoSection';
import { AnexosOrcamento } from './AnexosOrcamento';
import { PropostaAnexoUpload } from './PropostaAnexoUpload';
import { ConciergeInfo } from './ConciergeInfo';
import { R, statusCor, shadows } from '@/styles/tokens';

interface CandidaturaCardProps {
  candidatura: CandidaturaOrcamento;
  onStatusChange: () => void;
  onStatusUpdate?: (candidaturaId: string, novoStatus: import('@/hooks/useStatusAcompanhamento').StatusAcompanhamento) => void;
}

const STATUS_INFO: Record<string, { label: string; acao: string; borderColor: string }> = {
  inscrito:                      { label: 'Inscrito',                acao: 'Aguardando retorno',    borderColor: R.azul },
  '1_contato_realizado':         { label: 'Em contato',              acao: 'Aguardando retorno',    borderColor: R.azul },
  '2_contato_realizado':         { label: 'Em contato',              acao: 'Aguardando retorno',    borderColor: R.azul },
  '3_contato_realizado':         { label: 'Em contato',              acao: 'Aguardando retorno',    borderColor: R.azul },
  '4_contato_realizado':         { label: 'Em contato',              acao: 'Aguardando retorno',    borderColor: R.azul },
  '5_contato_realizado':         { label: 'Em contato',              acao: 'Aguardando retorno',    borderColor: R.azul },
  cliente_respondeu_nao_agendou: { label: 'Aguardando agendamento',  acao: 'Aguardando retorno',    borderColor: R.azul },
  nao_respondeu_mensagens:       { label: 'Sem resposta',            acao: 'Aguardando retorno',    borderColor: R.cz  },
  visita_agendada:               { label: 'Visita agendada',         acao: 'Confirmar visita',       borderColor: R.lj  },
  visita_realizada:              { label: 'Visita realizada',        acao: 'Enviar proposta',        borderColor: R.vd  },
  reuniao_agendada:              { label: 'Reunião agendada',        acao: 'Entrar na reunião',      borderColor: R.rx  },
  reuniao_realizada:             { label: 'Reunião realizada',       acao: 'Enviar proposta',        borderColor: R.vd  },
  em_orcamento:                  { label: 'Elaborando proposta',     acao: 'Enviar proposta',        borderColor: R.am  },
  orcamento_enviado:             { label: 'Proposta enviada',        acao: 'Atualização enviada',    borderColor: R.vd  },
  negocio_fechado:               { label: 'Negócio fechado',         acao: '',                       borderColor: R.vd  },
  negocio_perdido:               { label: 'Não selecionado',         acao: '',                       borderColor: R.cz  },
};

function StatusBadge({ status }: { status: string | null }) {
  const info = STATUS_INFO[status ?? 'inscrito'] ?? { label: 'Aguardando contato', borderColor: R.azul };
  const sc = statusCor[status ?? ''];
  const bg = sc?.bg ?? R.azul3;
  const fg = sc?.fg ?? R.azul;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
      background: bg, color: fg, whiteSpace: 'nowrap',
    }}>
      {info.label}
    </span>
  );
}

function AcaoBadge({ acao }: { acao: string }) {
  if (!acao) return null;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
      background: R.lj2, color: R.am, border: `1px solid ${R.lj}44`,
      whiteSpace: 'nowrap',
    }}>
      → {acao}
    </span>
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

  const horasParaAtendimento = candidatura.horarioVisitaAgendado
    ? Math.round((new Date(candidatura.horarioVisitaAgendado).getTime() - Date.now()) / 3600000)
    : null;
  const dentroJanela24h = horasParaAtendimento !== null && horasParaAtendimento > 0 && horasParaAtendimento <= 24;
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
            <div className="ml-6 flex items-center gap-2 flex-wrap">
              <p className="text-sm text-gray-700">
                {format(new Date(candidatura.horarioVisitaAgendado), "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
              {dentroJanela24h && (
                <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  ⏱ em {horasParaAtendimento}h
                </span>
              )}
            </div>
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
            <div className="ml-6 flex items-center gap-2 flex-wrap">
              <p className="text-sm text-gray-700">
                {format(new Date(candidatura.horarioVisitaAgendado), "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
              {dentroJanela24h && (
                <span className="text-xs font-semibold text-violet-700 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  ⏱ em {horasParaAtendimento}h
                </span>
              )}
            </div>
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
  const info = STATUS_INFO[s ?? 'inscrito'] ?? STATUS_INFO.inscrito;
  const showUpload = s !== 'negocio_perdido' && s !== 'negocio_fechado';
  const showContato = !!candidatura.dadosContato && candidatura.status === 'fechado';
  const temAnexos = (candidatura.arquivos?.length ?? 0) > 0 || (candidatura.fotos?.length ?? 0) > 0;

  return (
    <div style={{
      background: '#fff',
      borderRadius: 14,
      boxShadow: shadows.card,
      border: `1px solid ${R.bd}`,
      borderTop: `4px solid ${info.borderColor}`,
      overflow: 'hidden',
      transition: 'box-shadow .18s, transform .18s',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = shadows.cardHover; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = shadows.card; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
    >
      {/* Header */}
      <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${R.bd}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: 15, color: R.nv, marginBottom: 2 }}>
              Orçamento #{candidatura.id.slice(-8)}
            </div>
            <div style={{ fontSize: 11, color: R.cz }}>
              Publicado {format(candidatura.dataPublicacao, "dd/MM/yyyy", { locale: ptBR })}
              {' · '}Candidatura {format(candidatura.dataCandidatura, "dd/MM/yyyy", { locale: ptBR })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusBadge status={s} />
            {info.acao && <AcaoBadge acao={info.acao} />}
            {candidatura.categorias.slice(0, 2).map((cat, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: R.azul3, color: R.azul }}>
                {cat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 13, color: R.nv, lineHeight: 1.55, margin: 0 }}>{candidatura.necessidade}</p>

        {/* Meta */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: R.cz }}>
          <span><MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />{candidatura.local}</span>
          {candidatura.tamanhoImovel && (
            <span>{candidatura.tamanhoImovel} m²</span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={12} />
            {Math.min(candidatura.quantidadeEmpresas, 3)}/3 empresas
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} />
            {candidatura.prazoInicioTexto
              ? candidatura.prazoInicioTexto
              : (candidatura.dataInicio instanceof Date
                  ? format(candidatura.dataInicio, 'dd/MM/yyyy')
                  : candidatura.dataInicio || 'Não informado')}
          </span>
        </div>

        {/* Painel operacional */}
        <PainelOperacional candidatura={candidatura} />

        {/* Anexos */}
        {temAnexos ? (
          <AnexosOrcamento
            arquivos={candidatura.arquivos || []}
            fotos={candidatura.fotos || []}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: R.cz, padding: '6px 0' }}>
            <Paperclip size={12} />
            Sem anexos neste orçamento
          </div>
        )}

        {/* Upload de proposta */}
        {showUpload && (
          <div style={{ borderTop: `1px solid ${R.bd}`, paddingTop: 12 }}>
            <PropostaAnexoUpload
              candidaturaId={candidatura.candidaturaId}
              orcamentoId={candidatura.id}
            />
          </div>
        )}

        {/* Concierge */}
        {candidatura.conciergeResponsavel && (
          <ConciergeInfo concierge={candidatura.conciergeResponsavel} />
        )}

        {/* Dados do cliente */}
        {showContato && (
          <ContatoSection
            dadosContato={candidatura.dadosContato!}
            orcamentoId={candidatura.id}
            localReforma={candidatura.local}
          />
        )}
      </div>
    </div>
  );
};
