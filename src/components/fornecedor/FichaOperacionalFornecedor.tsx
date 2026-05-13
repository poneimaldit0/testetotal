import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CandidaturaOrcamento } from '@/hooks/useMeusCandiaturas';
import { PropostaAnexoUpload } from './PropostaAnexoUpload';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { R as I } from '@/styles/tokens';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDt = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtTm = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function horasRestantes(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000);
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ── Próxima ação ──────────────────────────────────────────────────────────────
// Deriva visualmente o que o fornecedor deve fazer a seguir.
// Não altera backend nem status — apenas UI de orientação.
type ProximaAcaoTom = 'urgent' | 'action' | 'wait' | 'done' | 'neutral';
type AncoraSecao = 'atendimento' | 'proposta' | 'escopo';

interface ProximaAcao {
  tom: ProximaAcaoTom;
  icone: string;
  titulo: string;
  ancora?: AncoraSecao;
}

function deriveProximaAcao(c: CandidaturaOrcamento): ProximaAcao {
  const s = c.statusAcompanhamento;
  if (s === 'visita_agendada' || s === 'reuniao_agendada') {
    return { tom: 'urgent', icone: '⚡', titulo: 'Confirme sua presença no atendimento', ancora: 'atendimento' };
  }
  if ((s === 'visita_realizada' || s === 'reuniao_realizada') && !c.propostaEnviada) {
    return { tom: 'action', icone: '📋', titulo: 'Envie sua proposta para avançar no processo', ancora: 'proposta' };
  }
  if (s === 'em_orcamento') {
    return { tom: 'action', icone: '✍️', titulo: 'Prepare e anexe sua proposta', ancora: 'proposta' };
  }
  if (s === 'orcamento_enviado') {
    return { tom: 'wait', icone: '⏳', titulo: 'Proposta enviada — aguardando análise' };
  }
  if (s === 'negocio_fechado') {
    return { tom: 'done', icone: '🎉', titulo: 'Negócio fechado — aguarde próximos passos' };
  }
  if (s === 'negocio_perdido') {
    return { tom: 'neutral', icone: '⚫', titulo: 'Processo encerrado' };
  }
  return { tom: 'neutral', icone: '📌', titulo: 'Acompanhe o andamento deste processo', ancora: 'escopo' };
}

const TOM_COLORS: Record<ProximaAcaoTom, { bg: string; bd: string; fg: string }> = {
  urgent:  { bg: I.vm2,   bd: I.vm,   fg: I.vm   },
  action:  { bg: I.azul3, bd: I.azul, fg: I.azul },
  wait:    { bg: I.am2,   bd: I.am,   fg: I.am   },
  done:    { bg: I.vd2,   bd: I.vd,   fg: I.vd   },
  neutral: { bg: I.cz2,   bd: I.bd,   fg: I.cz   },
};

function ProximaAcaoBanner({ candidatura }: { candidatura: CandidaturaOrcamento }) {
  const acao = deriveProximaAcao(candidatura);
  const c = TOM_COLORS[acao.tom];
  const clicavel = !!acao.ancora;

  const handleClick = () => {
    if (!acao.ancora) return;
    const el = document.getElementById(`ficha-secao-${acao.ancora}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      role={clicavel ? 'button' : undefined}
      onClick={clicavel ? handleClick : undefined}
      style={{
        marginBottom: 16,
        background: c.bg,
        border: `1.5px solid ${c.bd}`,
        borderLeft: `4px solid ${c.bd}`,
        borderRadius: 10,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: clicavel ? 'pointer' : 'default',
        transition: 'transform .12s, box-shadow .12s',
      }}
      onMouseEnter={e => { if (clicavel) e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { if (clicavel) e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>{acao.icone}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: c.fg, opacity: .75, marginBottom: 2 }}>
          Próxima ação
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: c.fg, fontFamily: "'Syne',sans-serif", lineHeight: 1.35 }}>
          {acao.titulo}
        </div>
      </div>
      {clicavel && (
        <span style={{ fontSize: 16, color: c.fg, fontWeight: 700, lineHeight: 1 }}>→</span>
      )}
    </div>
  );
}

// ── Seção header ──────────────────────────────────────────────────────────────
function FichaHeader({ candidatura }: { candidatura: CandidaturaOrcamento }) {
  const s = candidatura.statusAcompanhamento;
  const isReu = s === 'reuniao_agendada' || s === 'reuniao_realizada';
  const isVis = s === 'visita_agendada' || s === 'visita_realizada';
  const isUrgente = s === 'visita_agendada' || s === 'reuniao_agendada' || s === 'em_orcamento';

  return (
    <div style={{
      background: `linear-gradient(150deg, ${I.azul} 0%, ${I.azul2} 100%)`,
      padding: '20px 20px 16px',
      flexShrink: 0,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: .6, color: '#fff', marginBottom: 6 }}>
        Ficha Operacional
      </div>

      {/* paddingRight reserva espaço para o botão × do Radix Sheet (absolute right-4 top-4) */}
      <div className="r100-clamp-2" style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: '#fff', lineHeight: 1.4, marginBottom: 10, paddingRight: 44 }}>
        {candidatura.necessidade}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {(isVis || isReu) && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
            background: isVis ? I.lj2 : I.rx2,
            color: isVis ? I.am : I.rx,
          }}>
            {isVis ? '📅 Presencial' : '🎥 Online'}
          </span>
        )}
        {isUrgente && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
            background: I.vm2, color: I.vm,
          }}>
            ⚡ Ação pendente
          </span>
        )}
        {candidatura.local && (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.75)' }}>
            📍 {candidatura.local}
            {candidatura.tamanhoImovel > 0 && ` · ${candidatura.tamanhoImovel} m²`}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Seção: resultado final ────────────────────────────────────────────────────
function SecaoResultado({ s }: { s: string | null }) {
  const navigate = useNavigate();
  if (s === 'negocio_fechado') {
    return (
      <div style={{ borderRadius: 10, background: I.vd2, border: `1.5px solid ${I.vd}`, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: I.vd, marginBottom: 4 }}>🎉 Negócio fechado</div>
        <div style={{ fontSize: 12, color: I.cz, lineHeight: 1.6 }}>Parabéns! O contrato está em preparação pela Reforma100.</div>
      </div>
    );
  }
  if (s === 'negocio_perdido') {
    return (
      <div style={{ borderRadius: 10, background: I.cz2, border: `1.5px solid ${I.bd}`, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: I.cz, marginBottom: 2 }}>Proposta não selecionada</div>
        <div style={{ fontSize: 12, color: I.cz, lineHeight: 1.5, marginBottom: 12 }}>Este processo foi encerrado. Explore novas oportunidades para continuar crescendo.</div>
        <button
          onClick={() => navigate('/dashboard?view=disponiveis')}
          style={{
            background: I.azul, color: '#fff', border: 'none', borderRadius: 8,
            padding: '10px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6, lineHeight: 1,
            minHeight: 44,
          }}
        >
          Explorar novos orçamentos →
        </button>
      </div>
    );
  }
  return null;
}

// ── Seção: ação urgente (visita / reunião) ────────────────────────────────────
function SecaoAtendimento({
  candidatura, preConfirmadoEm, onPreConfirmar,
}: {
  candidatura: CandidaturaOrcamento;
  preConfirmadoEm: string | null;
  onPreConfirmar: (via: string) => Promise<void>;
}) {
  const navigate = useNavigate();
  const s = candidatura.statusAcompanhamento;
  const isVA = s === 'visita_agendada';
  const isVR = s === 'visita_realizada';
  const isRA = s === 'reuniao_agendada';
  const isRR = s === 'reuniao_realizada';

  if (!isVA && !isVR && !isRA && !isRR) return null;

  const isPresencial = isVA || isVR;
  const feito = isVR || isRR;
  const dt = candidatura.horarioVisitaAgendado;
  const horas = dt ? horasRestantes(dt) : null;
  const urgente = horas !== null && horas > 0 && horas <= 24;

  const acBg = isPresencial ? I.lj2 : I.rx2;
  const acBd = isPresencial ? I.lj : I.rx;
  const acFg = isPresencial ? I.am : I.rx;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 8 }}>
        {feito ? 'Atendimento realizado' : 'Atendimento agendado'}
      </div>
      <div style={{ borderRadius: 10, background: feito ? I.vd2 : acBg, border: `1.5px solid ${feito ? I.vd : acBd}`, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: feito ? 0 : 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 16 }}>{isPresencial ? '📅' : '🎥'}</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: feito ? I.vd : acFg, fontFamily: "'Syne',sans-serif" }}>
            {isPresencial
              ? (feito ? 'Visita presencial realizada' : 'Visita presencial')
              : (feito ? 'Reunião online realizada' : 'Reunião online')}
          </span>
          {feito && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: I.vd2, color: I.vd }}>✓ Concluído</span>}
          {urgente && !feito && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: I.vm2, color: I.vm }}>⚡ Hoje</span>}
        </div>

        {!feito && dt && (
          <div style={{ fontSize: 12, color: acFg, fontWeight: 600, marginBottom: 12 }}>
            {fmtDt(dt)} às {fmtTm(dt)}
            {horas !== null && horas > 0 && (
              <span style={{ marginLeft: 8, fontWeight: 400, color: horas <= 24 ? I.vm : I.cz }}>
                (em {horas < 24 ? `${horas}h` : `${Math.round(horas / 24)} dia(s)`})
              </span>
            )}
          </div>
        )}

        {!feito && isPresencial && (
          preConfirmadoEm ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: I.vd2, borderRadius: 8, padding: '10px 14px' }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: I.vd }}>Presença confirmada</span>
            </div>
          ) : (
            <button
              style={{ background: I.azul, color: '#fff', border: 'none', borderRadius: 8, padding: '13px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%', minHeight: 48 }}
              onClick={() => onPreConfirmar('plataforma')}
            >
              ✓ Confirmar presença na plataforma
            </button>
          )
        )}

        {!feito && isRA && (
          candidatura.linkReuniao && candidatura.tokenVisita ? (
            <button
              style={{ background: I.azul, color: '#fff', border: 'none', borderRadius: 8, padding: '13px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%', minHeight: 48 }}
              onClick={() => navigate(`/entrar-reuniao/${candidatura.candidaturaId}/${candidatura.tokenVisita}`)}
            >
              🔗 Entrar na reunião agora
            </button>
          ) : (
            <div style={{ fontSize: 12, color: I.rx, background: I.rx2, borderRadius: 8, padding: '10px 14px', lineHeight: 1.5 }}>
              🔗 O link de acesso será enviado pela Reforma100 antes da reunião.
            </div>
          )
        )}

        {!feito && (
          <LembretesAutomaticos
            dt={dt}
            notif24h={candidatura.notif24hEm ?? null}
            notif12h={candidatura.notif12hEm ?? null}
            notif6h={candidatura.notif6hEm ?? null}
          />
        )}
      </div>
    </div>
  );
}

// ── Lembretes automáticos (visual) ────────────────────────────────────────────
// Estrutura visual; o envio real será integrado pelo backend posteriormente.
// Quando ainda não há horário agendado, todos os chips aparecem como "pendente".
function LembretesAutomaticos({
  dt, notif24h, notif12h, notif6h,
}: {
  dt: string | null;
  notif24h: string | null;
  notif12h: string | null;
  notif6h: string | null;
}) {
  const horas = dt ? horasRestantes(dt) : Infinity;
  const itens: Array<{ janela: 24 | 12 | 6; enviadoEm: string | null }> = [
    { janela: 24, enviadoEm: notif24h },
    { janela: 12, enviadoEm: notif12h },
    { janela: 6,  enviadoEm: notif6h  },
  ];
  return (
    <div style={{ marginTop: 12, borderTop: `1px dashed ${I.bd}`, paddingTop: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 6 }}>
        Lembretes automáticos
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {itens.map(({ janela, enviadoEm }) => {
          const enviado = !!enviadoEm;
          const pendente = !enviado && horas > janela;
          const bg = enviado ? I.vd2 : pendente ? I.azul + '11' : I.cz2;
          const fg = enviado ? I.vd  : pendente ? I.azul       : I.cz;
          const icone = enviado ? '✓' : pendente ? '⏳' : '–';
          const sufixo = enviado ? 'enviado' : pendente ? 'pendente' : 'fora da janela';
          return (
            <span
              key={janela}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: bg, color: fg,
                fontSize: 11, fontWeight: 700,
                padding: '4px 9px', borderRadius: 999,
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              <span>{icone}</span>
              <span>{janela}h {sufixo}</span>
            </span>
          );
        })}
      </div>
      {!dt && (
        <div style={{ fontSize: 10, color: I.cz, marginTop: 6, lineHeight: 1.4 }}>
          Os lembretes serão enviados automaticamente assim que o horário do atendimento for definido.
        </div>
      )}
    </div>
  );
}

// ── Seção: proposta ───────────────────────────────────────────────────────────
function SecaoProposta({
  candidatura, statusLabel,
}: {
  candidatura: CandidaturaOrcamento;
  statusLabel: string | null;
}) {
  const s = candidatura.statusAcompanhamento;
  const isDone = s === 'negocio_fechado' || s === 'negocio_perdido';
  if (isDone) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 8 }}>
        Proposta comercial
      </div>

      {s === 'em_orcamento' && (
        <div style={{ borderRadius: 8, background: I.azul3, border: `1.5px solid ${I.azul}33`, padding: '10px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: I.azul, fontWeight: 700, marginBottom: 2 }}>▶ Envie sua proposta</div>
          <div style={{ fontSize: 11, color: I.cz, lineHeight: 1.5 }}>A Reforma100 aguarda sua proposta comercial para avançar neste processo.</div>
        </div>
      )}
      {s === 'orcamento_enviado' && (
        <div style={{ borderRadius: 8, background: I.vd2, border: `1.5px solid ${I.vd}33`, padding: '10px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: I.vd, fontWeight: 700, marginBottom: 2 }}>📋 Proposta enviada</div>
          <div style={{ fontSize: 11, color: I.cz, lineHeight: 1.5 }}>Aguardando análise da Reforma100. Você pode substituir o arquivo abaixo.</div>
        </div>
      )}

      <PropostaAnexoUpload
        candidaturaId={candidatura.candidaturaId}
        orcamentoId={candidatura.id}
        hideAnalise
      />
    </div>
  );
}

// ── Seção: dados do orçamento ─────────────────────────────────────────────────
function SecaoDadosOrcamento({ candidatura }: { candidatura: CandidaturaOrcamento }) {
  const prazo = typeof candidatura.dataInicio === 'string'
    ? candidatura.dataInicio
    : candidatura.dataInicio instanceof Date
      ? fmtDt(candidatura.dataInicio.toISOString())
      : '—';

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 10 }}>
        Dados do orçamento
      </div>
      <div style={{ background: I.bg, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {candidatura.categorias?.length > 0 && (
          <div>
            <div style={{ fontSize: 10, color: I.cz, marginBottom: 4, fontWeight: 600 }}>Categorias</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {candidatura.categorias.map(cat => (
                <span key={cat} style={{ fontSize: 11, background: I.azul3, color: I.azul, padding: '2px 9px', borderRadius: 20, fontWeight: 600 }}>
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: I.cz, fontWeight: 600, marginBottom: 2 }}>Prazo desejado</div>
            <div style={{ fontSize: 12, color: I.nv, fontWeight: 600 }}>{prazo}</div>
          </div>
          {candidatura.conciergeResponsavel && (
            <div>
              <div style={{ fontSize: 10, color: I.cz, fontWeight: 600, marginBottom: 2 }}>Concierge</div>
              <div style={{ fontSize: 12, color: I.nv, fontWeight: 600 }}>👤 {candidatura.conciergeResponsavel.nome}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Seção: anexos do orçamento ────────────────────────────────────────────────
function SecaoAnexosOrcamento({ candidatura }: { candidatura: CandidaturaOrcamento }) {
  const fotos = candidatura.fotos ?? [];
  const docs = candidatura.arquivos ?? [];

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 10 }}>
        Anexos do orçamento
      </div>

      {fotos.length === 0 && docs.length === 0 && (
        <div style={{
          background: I.cz2, borderRadius: 8, padding: '12px 14px',
          fontSize: 12, color: I.cz, textAlign: 'center',
        }}>
          Sem anexos enviados
        </div>
      )}

      {fotos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: docs.length > 0 ? 10 : 0 }}>
          {fotos.map(foto => (
            <a
              key={foto.id}
              href={foto.url_arquivo}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', borderRadius: 8, overflow: 'hidden', aspectRatio: '1', background: I.cz2 }}
            >
              <img
                src={foto.url_arquivo}
                alt={foto.nome_arquivo}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </a>
          ))}
        </div>
      )}

      {docs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {docs.map(doc => (
            <a
              key={doc.id}
              href={doc.url_arquivo}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: I.bg, borderRadius: 8, padding: '10px 12px',
                textDecoration: 'none', border: `1px solid ${I.bd}`,
              }}
            >
              <span style={{ fontSize: 18 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: I.nv, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.nome_arquivo}
                </div>
                <div style={{ fontSize: 10, color: I.cz }}>{fmtBytes(doc.tamanho)}</div>
              </div>
              <span style={{ fontSize: 11, color: I.azul, fontWeight: 700, flexShrink: 0 }}>↓</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Seção: escopo completo ────────────────────────────────────────────────────
function SecaoEscopo({ candidatura }: { candidatura: CandidaturaOrcamento }) {
  if (!candidatura.necessidade) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 10 }}>
        Escopo do cliente
      </div>
      <div style={{
        background: I.bg, borderRadius: 10, padding: '14px 16px',
        fontSize: 13, color: I.nv, lineHeight: 1.6, whiteSpace: 'pre-wrap',
      }}>
        {candidatura.necessidade}
      </div>
    </div>
  );
}

// ── Seção: contato do cliente ─────────────────────────────────────────────────
function SecaoContato({ candidatura }: { candidatura: CandidaturaOrcamento }) {
  const contato = candidatura.dadosContato;
  if (!contato || (!contato.nome && !contato.telefone && !contato.email)) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 10 }}>
        Contato do cliente
      </div>
      <div style={{ background: I.bg, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {contato.nome && (
          <div>
            <div style={{ fontSize: 10, color: I.cz, fontWeight: 600, marginBottom: 2 }}>Nome</div>
            <div style={{ fontSize: 13, color: I.nv, fontWeight: 600 }}>{contato.nome}</div>
          </div>
        )}
        {contato.telefone && (
          <div>
            <div style={{ fontSize: 10, color: I.cz, fontWeight: 600, marginBottom: 2 }}>Telefone</div>
            <div style={{ fontSize: 13, color: I.nv, fontWeight: 600 }}>📞 {contato.telefone}</div>
          </div>
        )}
        {contato.email && (
          <div>
            <div style={{ fontSize: 10, color: I.cz, fontWeight: 600, marginBottom: 2 }}>E-mail</div>
            <div style={{ fontSize: 13, color: I.nv, fontWeight: 600, wordBreak: 'break-all' }}>✉️ {contato.email}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
interface FichaOperacionalProps {
  candidatura: CandidaturaOrcamento | null;
  onClose: () => void;
}

export function FichaOperacionalFornecedor({ candidatura, onClose }: FichaOperacionalProps) {
  const [preConfirmadoEm, setPreConfirmadoEm] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Reseta estado local de confirmação cada vez que uma candidatura diferente abre
  useEffect(() => {
    setPreConfirmadoEm(null);
  }, [candidatura?.candidaturaId]);

  const confirmedAt = candidatura?.preConfirmadoEm ?? null;

  const handlePreConfirmar = async (via: string) => {
    if (!candidatura || preConfirmadoEm || confirmedAt || salvando) return;
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

  const isOpen = candidatura !== null;

  return (
    <Sheet open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:w-[560px] max-w-full p-0 flex flex-col overflow-hidden [&>button]:text-white [&>button]:opacity-90 [&>button]:bg-white/20 [&>button]:rounded-lg [&>button]:w-11 [&>button]:h-11 [&>button]:top-3 [&>button]:right-3"
      >
        {/* Acessibilidade obrigatória para Radix */}
        <SheetTitle className="sr-only">Ficha Operacional</SheetTitle>
        <SheetDescription className="sr-only">Detalhes e ações da candidatura</SheetDescription>

        {candidatura && (
          <>
            <FichaHeader candidatura={candidatura} />

            {/* Corpo rolável */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 32px' }}>
              <ProximaAcaoBanner candidatura={candidatura} />

              <SecaoResultado s={candidatura.statusAcompanhamento} />

              {/* Proposta sobe quando a ação principal é enviar proposta */}
              {candidatura.statusAcompanhamento === 'em_orcamento' && (
                <div id="ficha-secao-proposta">
                  <SecaoProposta
                    candidatura={candidatura}
                    statusLabel={candidatura.statusAcompanhamento}
                  />
                </div>
              )}

              <div id="ficha-secao-atendimento">
                <SecaoAtendimento
                  candidatura={candidatura}
                  preConfirmadoEm={preConfirmadoEm ?? confirmedAt}
                  onPreConfirmar={handlePreConfirmar}
                />
              </div>

              {/* Proposta na posição normal para todos os outros estados */}
              {candidatura.statusAcompanhamento !== 'em_orcamento' && (
                <div id="ficha-secao-proposta">
                  <SecaoProposta
                    candidatura={candidatura}
                    statusLabel={candidatura.statusAcompanhamento}
                  />
                </div>
              )}

              <div id="ficha-secao-escopo">
                <SecaoEscopo candidatura={candidatura} />
              </div>
              <SecaoContato candidatura={candidatura} />
              <SecaoDadosOrcamento candidatura={candidatura} />
              <SecaoAnexosOrcamento candidatura={candidatura} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
