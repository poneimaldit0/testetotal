import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMeusCandidaturas, CandidaturaOrcamento } from '@/hooks/useMeusCandiaturas';
import { FichaOperacionalFornecedor } from './FichaOperacionalFornecedor';

// ── Design tokens Isabella ────────────────────────────────────────────────────
const I = {
  azul:   '#2D3395',
  azul2:  '#3d4ab5',
  azul3:  '#eef0ff',
  lj:     '#F7A226',
  lj2:    '#fff8e1',
  vd:     '#1B7A4A',
  vd2:    '#e0f5ec',
  am:     '#E08B00',
  am2:    '#fff3cd',
  rx:     '#534AB7',
  rx2:    '#ede9ff',
  vm:     '#C0392B',
  vm2:    '#fde8e8',
  cz:     '#6B7280',
  cz2:    '#F3F4F6',
  nv:     '#1A2030',
  bd:     '#E5E7EB',
  bg:     '#F4F5FB',
  br:     '#FFFFFF',
} as const;

// ── CSS injection ─────────────────────────────────────────────────────────────
function useCentralStyles() {
  useEffect(() => {
    const fontId = 'rota100-fonts';
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link');
      link.id   = fontId;
      link.rel  = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap';
      document.head.appendChild(link);
    }
    const id = 'central-op-styles';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `
      .cop { font-family:'DM Sans',sans-serif; background:${I.bg}; min-height:100vh; }
      .cop-syne { font-family:'Syne',sans-serif; }
      .cop-serif { font-family:'DM Serif Display',serif; }
      .cop-card {
        background:#fff;
        border-radius:14px;
        box-shadow:0 1px 6px rgba(0,0,0,.07),0 0 1px rgba(0,0,0,.04);
        margin-bottom:14px;
        overflow:hidden;
        transition:box-shadow .18s,transform .18s;
      }
      .cop-card:hover { box-shadow:0 6px 24px rgba(0,0,0,.10),0 1px 4px rgba(0,0,0,.05); transform:translateY(-2px); }
      .cop-kpi {
        background:#fff;
        border-radius:12px;
        padding:16px 18px;
        box-shadow:0 1px 5px rgba(0,0,0,.06);
        border-top:4px solid transparent;
        flex:1;
        min-width:0;
      }
      .cop-section-title {
        font-family:'Syne',sans-serif;
        font-size:11px;
        font-weight:700;
        letter-spacing:.08em;
        text-transform:uppercase;
        color:${I.cz};
        margin-bottom:12px;
        display:flex;
        align-items:center;
        gap:8px;
      }
      .cop-badge {
        font-size:10px;
        font-weight:700;
        padding:2px 9px;
        border-radius:20px;
        white-space:nowrap;
      }
      .cop-next-action {
        border-radius:8px;
        padding:12px 14px;
        border-left:4px solid;
        margin-bottom:12px;
      }
      .cop-btn {
        display:inline-flex;
        align-items:center;
        gap:6px;
        padding:7px 16px;
        border-radius:8px;
        font-size:12px;
        font-weight:600;
        cursor:pointer;
        border:none;
        transition:opacity .15s,transform .1s;
        text-decoration:none;
        line-height:1;
      }
      .cop-btn:hover { opacity:.88; transform:translateY(-1px); }
      .cop-btn:active { transform:translateY(0); }
      .cop-btn-primary { background:${I.azul}; color:#fff; }
      .cop-btn-ghost {
        background:transparent;
        color:${I.cz};
        border:1.5px solid ${I.bd};
      }
      .cop-btn-ghost:hover { background:${I.cz2}; }
      .cop-empty {
        text-align:center;
        padding:40px 20px;
        color:${I.cz};
        font-size:13px;
        line-height:1.7;
      }
      .cop-kpi-row {
        display:grid;
        grid-template-columns:repeat(4,1fr);
        gap:12px;
        margin-bottom:28px;
      }
      @media(max-width:640px) {
        .cop-kpi-row { grid-template-columns:1fr 1fr !important; gap:10px !important; margin-bottom:20px; }
        .cop-kpi { flex:unset !important; }
        .cop-card-body { padding:16px !important; }
        .cop-meta-row { flex-direction:column !important; gap:6px !important; }
        .cop-action-row { flex-direction:column !important; }
        .cop-btn { width:100%; justify-content:center; }
        .cop-timeline-label { display:none !important; }
      }
    `;
    document.head.appendChild(s);
  }, []);
}

// ── Stage helpers ─────────────────────────────────────────────────────────────
type Stage = 0 | 1 | 2 | 3 | 4;

function deriveStage(s: string | null): Stage {
  if (!s) return 0;
  if (s === 'visita_agendada' || s === 'reuniao_agendada' ||
      s === 'visita_realizada' || s === 'reuniao_realizada') return 1;
  if (s === 'em_orcamento' || s === 'orcamento_enviado') return 2;
  if (s === 'negocio_fechado') return 3;
  return 0;
}

function deriveStageColor(s: string | null): string {
  if (!s || s === 'negocio_perdido') return '#9e9e9e';
  if (s === 'negocio_fechado') return I.rx;
  if (s === 'em_orcamento' || s === 'orcamento_enviado') return I.vd;
  if (s === 'reuniao_agendada' || s === 'reuniao_realizada') return I.rx;
  if (s === 'visita_agendada' || s === 'visita_realizada') return I.lj;
  return I.azul;
}

type Group = 'urgent' | 'active' | 'done';

function deriveGroup(s: string | null): Group {
  if (s === 'negocio_fechado' || s === 'negocio_perdido') return 'done';
  if (s === 'visita_agendada' || s === 'reuniao_agendada' || s === 'em_orcamento') return 'urgent';
  return 'active';
}

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtDt = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtTm = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function horasRestantes(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 3600_000);
}

// ── Timeline ──────────────────────────────────────────────────────────────────
const STAGES_DEF = [
  { label: 'Contato'  },
  { label: 'Visita'   },
  { label: 'Proposta' },
  { label: 'Contrato' },
  { label: 'Obra'     },
];

const STAGE_COLORS_TL = [I.azul, I.lj, I.vd, I.rx, I.am];

function Timeline({ activeStage, isReu }: { activeStage: Stage; isReu: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16 }}>
      {STAGES_DEF.map((st, i) => {
        const done    = i < activeStage;
        const current = i === activeStage;
        const locked  = i >= 3;
        const dotClr  = done || current ? STAGE_COLORS_TL[i] : I.bd;
        const label   = i === 1 && isReu ? 'Reunião' : st.label;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {i > 0 && (
              <div style={{
                position: 'absolute', top: 9, left: 0, right: '50%', height: 2,
                background: i <= activeStage ? STAGE_COLORS_TL[i - 1] : I.bd,
              }} />
            )}
            {i < STAGES_DEF.length - 1 && (
              <div style={{
                position: 'absolute', top: 9, left: '50%', right: 0, height: 2,
                background: i < activeStage ? STAGE_COLORS_TL[i] : I.bd,
              }} />
            )}
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: done || current ? dotClr : I.br,
              border: `2px solid ${dotClr}`,
              boxShadow: current ? `0 0 0 3px ${dotClr}30` : 'none',
              zIndex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 700,
              color: done || current ? '#fff' : I.cz,
              transition: 'all .2s',
            }}>
              {done ? '✓' : locked ? '·' : current ? '●' : i + 1}
            </div>
            <div className="cop-timeline-label" style={{
              fontSize: 9, fontWeight: current ? 700 : 500, marginTop: 3, textAlign: 'center',
              color: current ? dotClr : done ? I.cz : '#9CA3AF',
              whiteSpace: 'nowrap', lineHeight: 1.2,
            }}>
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  borderColor, icon, value, label, sub, onClick,
}: {
  borderColor: string; icon: string; value: string | number;
  label: string; sub?: string; onClick?: () => void;
}) {
  return (
    <div
      className="cop-kpi"
      style={{ borderTopColor: borderColor, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: I.nv, lineHeight: 1, marginBottom: 3 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: I.nv, marginBottom: 1 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: I.cz }}>{sub}</div>}
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  // ── valores SDR (PaginaSDR) ──────────────────────────────────────────────────
  sem_contato:                   { label: 'Aguardando primeiro contato', bg: I.azul3,  fg: I.azul  },
  em_contato:                    { label: 'Em contato com a Reforma100', bg: '#FFF5DC', fg: '#9A6200' },
  // ── valores detalhados (hooks fornecedor) ────────────────────────────────────
  '1_contato_realizado':         { label: 'Em contato com a Reforma100', bg: '#FFF5DC', fg: '#9A6200' },
  '2_contato_realizado':         { label: 'Em contato com a Reforma100', bg: '#FFF5DC', fg: '#9A6200' },
  '3_contato_realizado':         { label: 'Em contato com a Reforma100', bg: '#FFF5DC', fg: '#9A6200' },
  '4_contato_realizado':         { label: 'Em contato com a Reforma100', bg: '#FFF5DC', fg: '#9A6200' },
  '5_contato_realizado':         { label: 'Em contato com a Reforma100', bg: '#FFF5DC', fg: '#9A6200' },
  cliente_respondeu_nao_agendou: { label: 'Aguardando agendamento',      bg: I.azul3,  fg: I.azul  },
  nao_respondeu_mensagens:       { label: 'Aguardando agendamento',      bg: I.azul3,  fg: I.azul  },
  visita_agendada:               { label: 'Visita agendada',        bg: I.lj2,    fg: I.am    },
  visita_realizada:              { label: 'Visita realizada',       bg: I.vd2,    fg: I.vd    },
  reuniao_agendada:              { label: 'Reunião agendada',       bg: I.rx2,    fg: I.rx    },
  reuniao_realizada:             { label: 'Reunião realizada',      bg: I.vd2,    fg: I.vd    },
  em_orcamento:                  { label: 'Elaborar proposta',      bg: I.azul3,  fg: I.azul  },
  orcamento_enviado:             { label: 'Proposta enviada',       bg: I.vd2,    fg: I.vd    },
  negocio_fechado:               { label: 'Negócio fechado ✓',     bg: I.vd2,    fg: I.vd    },
  negocio_perdido:               { label: 'Proposta não selecionada', bg: I.cz2,  fg: I.cz    },
};

function StatusBadge({ status }: { status: string | null }) {
  const info = STATUS_BADGE[status ?? ''] ?? { label: 'Aguardando contato', bg: I.azul3, fg: I.azul };
  return (
    <span className="cop-badge" style={{ background: info.bg, color: info.fg }}>
      {info.label}
    </span>
  );
}

// ── Visita / Reunião block ────────────────────────────────────────────────────
function AtendimentoBlock({
  candidatura, onPreConfirmar,
}: {
  candidatura: CandidaturaOrcamento;
  onPreConfirmar: (via: string) => Promise<void>;
}) {
  const navigate = useNavigate();
  const s  = candidatura.statusAcompanhamento;
  const dt = candidatura.horarioVisitaAgendado;

  const isVA  = s === 'visita_agendada';
  const isVR  = s === 'visita_realizada';
  const isRA  = s === 'reuniao_agendada';
  const isRR  = s === 'reuniao_realizada';

  if (!isVA && !isVR && !isRA && !isRR) return null;

  const isPresencial = isVA || isVR;
  const feito        = isVR || isRR;
  const horas        = dt ? horasRestantes(dt) : null;
  const urgente      = horas !== null && horas > 0 && horas <= 24;

  const acBg  = isPresencial ? I.lj2  : I.rx2;
  const acBd  = isPresencial ? I.lj   : I.rx;
  const acFg  = isPresencial ? I.am   : I.rx;

  return (
    <div style={{ borderRadius: 10, background: feito ? I.vd2 : acBg, border: `1.5px solid ${feito ? I.vd : acBd}`, padding: '12px 14px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: feito ? 0 : 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 16 }}>{isPresencial ? '📅' : '🎥'}</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: feito ? I.vd : acFg, fontFamily: "'Syne', sans-serif" }}>
          {isPresencial ? (feito ? 'Visita realizada' : 'Visita presencial') : (feito ? 'Reunião realizada' : 'Reunião online')}
        </span>
        {feito && (
          <span className="cop-badge" style={{ background: I.vd2, color: I.vd }}>✓ Concluído</span>
        )}
        {urgente && !feito && (
          <span className="cop-badge" style={{ background: I.vm2, color: I.vm }}>⚡ Hoje</span>
        )}
      </div>

      {!feito && dt && (
        <div style={{ fontSize: 12, color: acFg, fontWeight: 600, marginBottom: 8 }}>
          {fmtDt(dt)} às {fmtTm(dt)}
          {horas !== null && horas > 0 && (
            <span style={{ marginLeft: 8, fontWeight: 400, color: horas <= 24 ? I.vm : I.cz }}>
              (em {horas < 24 ? `${horas}h` : `${Math.round(horas / 24)} dia(s)`})
            </span>
          )}
        </div>
      )}

      {/* Ações por tipo */}
      {!feito && isPresencial && (
        <div style={{ marginTop: 4 }}>
          {candidatura.preConfirmadoEm ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: I.vd2, borderRadius: 8, padding: '10px 14px',
            }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: I.vd }}>Presença confirmada</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="cop-btn"
                style={{ background: I.am, color: '#fff', fontSize: 13, width: '100%', justifyContent: 'center', padding: '13px 0', minHeight: 48 }}
                onClick={() => onPreConfirmar('whatsapp')}
              >
                ✓ Confirmar presença via WhatsApp
              </button>
              <button
                className="cop-btn cop-btn-ghost"
                style={{ fontSize: 12, width: '100%', justifyContent: 'center', padding: '11px 0', minHeight: 44 }}
                onClick={() => onPreConfirmar('plataforma')}
              >
                Confirmar aqui na plataforma
              </button>
            </div>
          )}
        </div>
      )}

      {!feito && isRA && (
        <div style={{ marginTop: 4 }}>
          {candidatura.linkReuniao && candidatura.tokenVisita ? (
            <button
              className="cop-btn cop-btn-primary"
              style={{ fontSize: 14, width: '100%', justifyContent: 'center', padding: '13px 0', minHeight: 48 }}
              onClick={() => navigate(`/entrar-reuniao/${candidatura.candidaturaId}/${candidatura.tokenVisita}`)}
            >
              🔗 Entrar na reunião agora
            </button>
          ) : (
            <div style={{ fontSize: 12, color: I.rx, background: I.rx2, borderRadius: 8, padding: '10px 14px', lineHeight: 1.5 }}>
              🔗 O link de acesso será enviado pela Reforma100 antes da reunião.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Próxima ação block ────────────────────────────────────────────────────────
function ProximaAcaoBlock({
  candidatura,
  onGoToProposta,
}: {
  candidatura: CandidaturaOrcamento;
  onGoToProposta: () => void;
}) {
  const s = candidatura.statusAcompanhamento;

  if (s === 'negocio_perdido' || s === 'negocio_fechado') return null;
  if (s === 'visita_agendada' || s === 'reuniao_agendada' ||
      s === 'visita_realizada' || s === 'reuniao_realizada') return null; // handled by AtendimentoBlock

  let text = '';
  let detail = '';
  let color = I.azul;
  let showCta = false;

  if (s === 'em_orcamento') {
    return (
      <div style={{ borderRadius: 10, background: I.azul3, border: `1.5px solid ${I.azul}33`, padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: I.azul, marginBottom: 4, fontFamily: "'Syne',sans-serif" }}>
          ▶ Envie sua proposta
        </div>
        <div style={{ fontSize: 11, color: I.cz, lineHeight: 1.6, marginBottom: 12 }}>
          A Reforma100 aguarda sua proposta comercial para avançar neste processo.
        </div>
        <button
          className="cop-btn cop-btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '13px 0', fontSize: 14, minHeight: 48, fontFamily: "'Syne',sans-serif" }}
          onClick={onGoToProposta}
        >
          Enviar proposta →
        </button>
      </div>
    );
  }

  if (s === 'orcamento_enviado') {
    return (
      <div style={{ borderRadius: 10, background: I.vd2, border: `1.5px solid ${I.vd}33`, padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 16 }}>📋</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: I.vd, fontFamily: "'Syne',sans-serif" }}>
            Proposta enviada
          </span>
        </div>
        <div style={{ fontSize: 11, color: I.cz, lineHeight: 1.6, marginBottom: 10 }}>
          Aguardando análise da Reforma100. Você será notificado sobre o resultado.
        </div>
        <button
          className="cop-btn cop-btn-ghost"
          style={{ fontSize: 12, padding: '8px 16px' }}
          onClick={onGoToProposta}
        >
          Substituir / gerenciar proposta
        </button>
      </div>
    );
  }

  return (
    <div className="cop-next-action" style={{ borderLeftColor: I.azul, background: I.azul3, marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: I.azul, marginBottom: 4 }}>
        ▶ Aguardando contato da Reforma100
      </div>
      <div style={{ fontSize: 11, color: I.cz, lineHeight: 1.6 }}>
        Nossa equipe entrará em contato para agendar o atendimento técnico.
      </div>
    </div>
  );
}

// ── Card operacional por candidatura ─────────────────────────────────────────
function CardOperacional({
  candidatura,
  onClick,
}: {
  candidatura: CandidaturaOrcamento;
  onClick: () => void;
}) {
  const s        = candidatura.statusAcompanhamento;
  const stage    = deriveStage(s);
  const stageClr = deriveStageColor(s);
  const isReu    = s === 'reuniao_agendada' || s === 'reuniao_realizada';
  const isPerdido = s === 'negocio_perdido';
  const isUrgente = s === 'visita_agendada' || s === 'reuniao_agendada' || s === 'em_orcamento';

  return (
    <div
      className="cop-card"
      style={{ borderTop: `4px solid ${stageClr}`, cursor: 'pointer' }}
      onClick={onClick}
    >
      <div className="cop-card-body" style={{ padding: '18px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: 15,
              color: I.nv,
              marginBottom: 4,
              lineHeight: 1.3,
            }}>
              {candidatura.necessidade.length > 70
                ? candidatura.necessidade.slice(0, 70) + '…'
                : candidatura.necessidade}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {candidatura.local && (
                <span style={{ fontSize: 11, color: I.cz }}>📍 {candidatura.local}</span>
              )}
              {candidatura.tamanhoImovel > 0 && (
                <span style={{ fontSize: 11, color: I.cz }}>· {candidatura.tamanhoImovel} m²</span>
              )}
            </div>
          </div>
          <StatusBadge status={s} />
        </div>

        {!isPerdido && <Timeline activeStage={stage} isReu={isReu} />}

        {/* Meta row + CTA abrir ficha */}
        <div className="cop-meta-row" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', borderTop: `1px solid ${I.bd}`, paddingTop: 12, marginTop: 4 }}>
          {candidatura.conciergeResponsavel && (
            <span style={{ fontSize: 11, color: I.cz }}>
              👤 {candidatura.conciergeResponsavel.nome}
            </span>
          )}
          {candidatura.categorias?.length > 0 && (
            <span style={{ fontSize: 11, color: I.cz }}>
              🏷 {candidatura.categorias.slice(0, 2).join(', ')}
              {candidatura.categorias.length > 2 ? ` +${candidatura.categorias.length - 2}` : ''}
            </span>
          )}
          <span style={{ fontSize: 11, color: I.cz }}>
            📆 {fmtDt(candidatura.dataCandidatura.toISOString())}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: isUrgente ? I.vm : I.azul, display: 'flex', alignItems: 'center', gap: 4 }}>
            {isUrgente ? '⚡' : ''} Ver ficha →
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Section de grupo ──────────────────────────────────────────────────────────
function CandidaturaSection({
  title, dot, items, onCardClick, collapsible,
}: {
  title: string;
  dot: string;
  items: CandidaturaOrcamento[];
  onCardClick: (c: CandidaturaOrcamento) => void;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <div
        className="cop-section-title"
        style={{ cursor: collapsible ? 'pointer' : 'default', userSelect: 'none' }}
        onClick={() => collapsible && setOpen(o => !o)}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
        {title}
        <span style={{ marginLeft: 4, fontSize: 10, background: dot + '22', color: dot, padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>
          {items.length}
        </span>
        {collapsible && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: I.cz, fontWeight: 400 }}>
            {open ? '▲' : '▼'}
          </span>
        )}
      </div>

      {open && items.map(c => (
        <CardOperacional
          key={c.candidaturaId}
          candidatura={c}
          onClick={() => onCardClick(c)}
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function CentralOperacionalFornecedor() {
  useCentralStyles();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { candidaturas, loading } = useMeusCandidaturas(profile?.id);
  const [repKpi, setRepKpi] = useState<{ media: number; total: number } | null>(null);
  const [fichaAberta, setFichaAberta] = useState<CandidaturaOrcamento | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from('avaliacoes_fornecedores' as any)
      .select('nota_geral')
      .eq('fornecedor_id', profile.id)
      .then(({ data }: { data: Array<{ nota_geral: number }> | null }) => {
        if (!data || data.length === 0) return;
        const media = data.reduce((s, r) => s + (Number(r.nota_geral) || 0), 0) / data.length;
        setRepKpi({ media: Math.round(media * 10) / 10, total: data.length });
      });
  }, [profile?.id]);

  // Grupos
  const urgentes  = candidaturas.filter(c => deriveGroup(c.statusAcompanhamento) === 'urgent');
  const ativas    = candidaturas.filter(c => deriveGroup(c.statusAcompanhamento) === 'active');
  const finais    = candidaturas.filter(c => deriveGroup(c.statusAcompanhamento) === 'done');

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="cop" style={{ padding: '0 0 40px' }}>

      <FichaOperacionalFornecedor
        candidatura={fichaAberta}
        onClose={() => setFichaAberta(null)}
      />

      {/* Header premium */}
      <div style={{
        background: `linear-gradient(150deg, ${I.azul} 0%, ${I.azul2} 100%)`,
        padding: '28px 24px 22px',
        marginBottom: 24,
        color: '#fff',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', opacity: .65, marginBottom: 6 }}>
          Reforma100 · Painel do Parceiro
        </div>
        <div className="cop-serif" style={{ fontSize: 22, fontWeight: 400, lineHeight: 1.3, marginBottom: 6 }}>
          {profile?.empresa ?? profile?.nome ?? 'Bem-vindo'}
        </div>
        <div style={{ fontSize: 13, opacity: .8, lineHeight: 1.6 }}>
          Central Operacional — acompanhe suas negociações ativas
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* Banner de urgência */}
        {!loading && urgentes.length > 0 && (
          <div style={{
            background: I.vm2, border: `1.5px solid ${I.vm}44`,
            borderLeft: `4px solid ${I.vm}`,
            borderRadius: 10, padding: '12px 16px',
            marginBottom: 18,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>⚡</span>
            <div>
              <div style={{ fontWeight: 700, color: I.vm, fontSize: 13, fontFamily: "'Syne',sans-serif", marginBottom: 2 }}>
                {urgentes.length} processo{urgentes.length > 1 ? 's' : ''} requer{urgentes.length === 1 ? '' : 'em'} ação agora
              </div>
              <div style={{ fontSize: 11, color: I.cz }}>
                Veja os cards abaixo e execute as ações pendentes.
              </div>
            </div>
          </div>
        )}

        {/* KPI cards */}
        <div className="cop-kpi-row">
          <KpiCard
            borderColor={urgentes.length > 0 ? I.vm : I.vd}
            icon={urgentes.length > 0 ? '⚡' : '✅'}
            value={urgentes.length}
            label={urgentes.length > 0 ? 'Requerem ação' : 'Tudo em dia'}
            sub={urgentes.length > 0 ? 'Atenção necessária agora' : 'Sem pendências urgentes'}
          />
          <KpiCard
            borderColor={I.azul}
            icon="🤝"
            value={ativas.length}
            label="Em andamento"
            sub={ativas.length === 1 ? '1 negociação ativa' : `${ativas.length} negociações ativas`}
          />
          <KpiCard
            borderColor={I.vd}
            icon="📋"
            value={candidaturas.filter(c => c.statusAcompanhamento === 'orcamento_enviado').length}
            label="Propostas enviadas"
            sub="Aguardando análise"
          />
          <KpiCard
            borderColor={repKpi ? I.lj : I.cz}
            icon="⭐"
            value={repKpi ? repKpi.media.toFixed(1) : '—'}
            label="Reputação"
            sub={repKpi ? `${repKpi.total} avaliação${repKpi.total !== 1 ? 'ões' : ''}` : 'Sem avaliações ainda'}
          />
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: I.cz }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
            <div style={{ fontSize: 13 }}>Carregando suas negociações…</div>
          </div>
        )}

        {/* Empty state */}
        {!loading && candidaturas.length === 0 && (
          <div className="cop-card">
            <div className="cop-empty">
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <div style={{ fontWeight: 700, color: I.nv, marginBottom: 6 }}>
                Nenhuma candidatura ainda
              </div>
              <p>Explore os orçamentos disponíveis e candidate-se para começar a usar sua Central Operacional.</p>
              <button
                className="cop-btn cop-btn-primary"
                style={{ marginTop: 16 }}
                onClick={() => navigate('/dashboard?view=disponiveis')}
              >
                Ver oportunidades →
              </button>
            </div>
          </div>
        )}

        {/* Grupos */}
        {!loading && (
          <>
            <CandidaturaSection
              title="Requer ação agora"
              dot={I.vm}
              items={urgentes}
              onCardClick={setFichaAberta}
            />
            <CandidaturaSection
              title="Em andamento"
              dot={I.azul}
              items={ativas}
              onCardClick={setFichaAberta}
            />
            <CandidaturaSection
              title="Finalizadas"
              dot={I.cz}
              items={finais}
              onCardClick={setFichaAberta}
              collapsible
            />
          </>
        )}

        {/* Atalho para oportunidades */}
        {!loading && candidaturas.length > 0 && (
          <div style={{
            borderRadius: 12,
            background: `linear-gradient(135deg, ${I.azul}11 0%, ${I.azul}22 100%)`,
            border: `1.5px dashed ${I.azul}44`,
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="cop-syne" style={{ fontWeight: 700, fontSize: 13, color: I.azul, marginBottom: 3 }}>
                Novos orçamentos disponíveis
              </div>
              <div style={{ fontSize: 11, color: I.cz }}>
                Explore novas oportunidades e aumente seu pipeline.
              </div>
            </div>
            <button
              className="cop-btn cop-btn-primary"
              style={{ fontSize: 12 }}
              onClick={() => navigate('/dashboard?view=disponiveis')}
            >
              Explorar oportunidades →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
