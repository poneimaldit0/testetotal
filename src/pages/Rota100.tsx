import { useState, useEffect, useCallback, Fragment } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { MOCK_ROTA100 } from '@/data/mockRota100';
import { hasCompatRequest, saveCompatRequest, saveEmpresaDispensa, getDispensadas, getCompatRequests } from '@/lib/rota100Storage';
import { useRota100Data, Rota100ChecklistItem, Rota100Empresa, Rota100Escopo } from '@/hooks/useRota100Data';
import { useCompatibilizacaoIA, type CompatibilizacaoCompleta, type EmpresaRanking } from '@/hooks/useCompatibilizacaoIA';

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  lj:  '#E8510A',
  lj2: '#FF6B35',
  nv:  '#1A2030',
  fd:  '#F8F7F5',
  bd:  '#E4E1DB',
  cz:  '#7A776E',
  br:  '#FFFFFF',
  vd:  '#1A7A4A',
  vd2: '#E8F5EE',
  am:  '#C4780A',
  am2: '#FFF5DC',
  vm:  '#C0392B',
  vm2: '#FDECEA',
} as const;

// ── CSS injection ─────────────────────────────────────────────────────────────
function useRota100Styles() {
  useEffect(() => {
    const fontId = 'rota100-fonts';
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap';
      document.head.appendChild(link);
    }

    const styleId = 'rota100-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .r100 { font-family: 'DM Sans', sans-serif; }
      .r100 .syne { font-family: 'Syne', sans-serif; }
      .r100 .serif { font-family: 'DM Serif Display', serif; }

      /* Cards */
      .r100-card {
        background: #FFFFFF;
        border: 1px solid rgba(0,0,0,.07);
        border-radius: 16px;
        padding: 28px;
        margin-bottom: 16px;
        box-shadow: 0 1px 6px rgba(0,0,0,.06), 0 0 1px rgba(0,0,0,.03);
        transition: box-shadow .2s, transform .2s;
      }
      .r100-card-hover:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 28px rgba(0,0,0,.10), 0 2px 8px rgba(0,0,0,.05);
      }

      /* Card header */
      .r100-card-h {
        font-family: 'Syne', sans-serif;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .07em;
        text-transform: uppercase;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        color: #9A9790;
      }
      .r100-card-icon {
        width: 30px; height: 30px; border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        font-size: 15px; flex-shrink: 0;
      }

      /* Buttons */
      .r100-btn {
        font-family: 'Syne', sans-serif;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: .03em;
        border: none;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all .18s;
        white-space: nowrap;
      }
      .r100-btn-sm  { padding: 8px 16px; border-radius: 10px; }
      .r100-btn-md  { padding: 11px 22px; border-radius: 12px; }
      .r100-btn-lg  { padding: 13px 28px; border-radius: 12px; font-size: 13px; }
      .r100-btn-full { width: 100%; justify-content: center; }

      .r100-btn-primary { background: #E8510A; color: #fff; box-shadow: 0 1px 5px rgba(232,81,10,.25); }
      .r100-btn-primary:hover { background: #FF6B35; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(232,81,10,.32); }
      .r100-btn-primary:active { transform: translateY(0); box-shadow: none; }

      .r100-btn-ghost { background: transparent; color: #1A2030; border: 1.5px solid rgba(0,0,0,.15); }
      .r100-btn-ghost:hover { border-color: #E8510A; color: #E8510A; background: rgba(232,81,10,.04); }

      .r100-btn-danger { background: #FDECEA; color: #C0392B; border: 1.5px solid rgba(192,57,43,.15); }
      .r100-btn-danger:hover { background: #fbd5d1; border-color: rgba(192,57,43,.35); }

      .r100-btn-dark { background: #1A2030; color: #fff; }
      .r100-btn-dark:hover { background: #2a3240; transform: translateY(-1px); }

      /* Inputs */
      .r100-input {
        border: 1.5px solid rgba(0,0,0,.12);
        border-radius: 10px;
        padding: 10px 14px;
        font-family: 'DM Sans', sans-serif;
        font-size: 13px;
        color: #1A2030;
        background: #fff;
        outline: none;
        transition: border-color .18s, box-shadow .18s;
        width: 100%;
      }
      .r100-input:focus { border-color: #E8510A; box-shadow: 0 0 0 3px rgba(232,81,10,.09); }
      .r100-input::placeholder { color: #B0ADA7; }

      /* Textarea */
      .r100-textarea {
        border: 1.5px solid rgba(0,0,0,.12);
        border-radius: 10px;
        padding: 10px 14px;
        font-family: 'DM Sans', sans-serif;
        font-size: 12px;
        color: #1A2030;
        background: #fff;
        outline: none;
        transition: border-color .18s, box-shadow .18s;
        width: 100%;
        resize: vertical;
        min-height: 52px;
      }
      .r100-textarea:focus { border-color: #E8510A; box-shadow: 0 0 0 3px rgba(232,81,10,.09); }

      /* Tab bar — underline style */
      .r100-tabs {
        display: flex;
        gap: 0;
        background: transparent;
        border-bottom: 2px solid rgba(0,0,0,.07);
        margin-bottom: 24px;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .r100-tabs::-webkit-scrollbar { display: none; }
      .r100-tab {
        padding: 10px 14px 12px;
        font-family: 'Syne', sans-serif;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        border: none;
        background: transparent;
        color: #A09D97;
        transition: all .18s;
        letter-spacing: .05em;
        white-space: nowrap;
        border-bottom: 3px solid transparent;
        margin-bottom: -2px;
        text-transform: uppercase;
      }
      .r100-tab.active { color: #E8510A; border-bottom-color: #E8510A; }
      .r100-tab:not(.active):not(.locked):hover { color: #1A2030; }
      .r100-tab.locked { opacity: .4; cursor: not-allowed; }

      /* Company cards */
      .r100-fc {
        border: 1px solid rgba(0,0,0,.07);
        border-radius: 14px;
        padding: 18px;
        margin-bottom: 12px;
        background: #FAFAFA;
        transition: border-color .18s, box-shadow .18s, transform .18s;
      }
      .r100-fc:hover { border-color: rgba(232,81,10,.28); box-shadow: 0 4px 18px rgba(232,81,10,.08); transform: translateY(-2px); }
      .r100-fc:last-child { margin-bottom: 0; }

      /* Marketplace cards */
      .r100-mkt-card {
        background: #fff;
        border: 1px solid rgba(0,0,0,.07);
        border-radius: 14px;
        overflow: hidden;
        cursor: pointer;
        transition: all .2s;
      }
      .r100-mkt-card:hover { border-color: #E8510A; box-shadow: 0 6px 24px rgba(232,81,10,.12); transform: translateY(-3px); }

      .r100-partner-card {
        background: #fff;
        border: 1px solid rgba(0,0,0,.07);
        border-radius: 14px;
        padding: 18px;
        text-align: center;
        cursor: pointer;
        transition: all .2s;
      }
      .r100-partner-card:hover { border-color: #E8510A; box-shadow: 0 4px 18px rgba(232,81,10,.09); transform: translateY(-2px); }

      /* Upload area */
      .r100-upload {
        border: 2px dashed rgba(0,0,0,.12);
        border-radius: 14px;
        padding: 32px;
        text-align: center;
        cursor: pointer;
        background: #FAFAFA;
        margin-top: 12px;
        transition: all .2s;
      }
      .r100-upload:hover { border-color: #E8510A; background: rgba(232,81,10,.02); }

      /* Section divider */
      .r100-div {
        display: flex; align-items: center; gap: 10px;
        margin: 24px 0 16px;
      }
      .r100-div h3 {
        font-family: 'Syne', sans-serif;
        font-size: 11px; font-weight: 700;
        white-space: nowrap; color: #A09D97;
        text-transform: uppercase; letter-spacing: .08em;
      }
      .r100-div::after { content:''; flex:1; height:1px; background:rgba(0,0,0,.08); }

      /* Animations */
      @keyframes r100BarIn { from { width: 0 } }
      @keyframes r100FadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes r100LineIn {
        from { transform: scaleX(0); }
        to   { transform: scaleX(1); }
      }
      @keyframes r100HeroGlow {
        0%, 100% { opacity: .16; transform: scale(1) translate(0, 0); }
        40%       { opacity: .24; transform: scale(1.12) translate(4%, -3%); }
        70%       { opacity: .14; transform: scale(.94) translate(-3%, 4%); }
      }
      @keyframes r100HeroGlow2 {
        0%, 100% { opacity: .12; transform: scale(1) translate(0, 0); }
        35%       { opacity: .18; transform: scale(1.08) translate(-5%, 2%); }
        65%       { opacity: .10; transform: scale(.97) translate(2%, -4%); }
      }
      @keyframes r100HeroIn {
        from { opacity: 0; transform: translateY(16px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes r100LinePulse {
        0%, 100% { opacity: .9; }
        50%       { opacity: .6; }
      }

      .r100-bar-fill {
        height: 100%;
        border-radius: 20px;
        animation: r100BarIn 1.2s cubic-bezier(.4,0,.2,1) forwards;
      }
      .r100-panel {
        animation: r100FadeIn .3s ease forwards;
      }
      .r100-line {
        animation: r100LineIn .9s cubic-bezier(.4,0,.2,1) forwards;
        transform-origin: left;
      }
      .r100-hero-glow1 {
        position: absolute;
        width: 420px; height: 420px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(232,81,10,.55) 0%, transparent 70%);
        filter: blur(72px);
        animation: r100HeroGlow 9s ease-in-out infinite;
        pointer-events: none;
      }
      .r100-hero-glow2 {
        position: absolute;
        width: 340px; height: 340px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(45,51,149,.6) 0%, transparent 70%);
        filter: blur(60px);
        animation: r100HeroGlow2 11s ease-in-out infinite;
        pointer-events: none;
      }
      .r100-hero-content {
        position: relative; z-index: 2;
        animation: r100HeroIn .7s cubic-bezier(.2,0,.2,1) forwards;
      }
      .r100-hero-dot {
        width: 4px; height: 4px; border-radius: 50%;
        background: rgba(255,255,255,.18);
        position: absolute;
        pointer-events: none;
      }

      /* Responsive */
      @media (max-width: 640px) {
        .r100-wrap { padding: 14px 16px !important; }
        .r100-hero { padding: 24px 16px 20px !important; }
        .r100-grid-4 { grid-template-columns: 1fr 1fr !important; }
        .r100-grid-3 { grid-template-columns: 1fr 1fr !important; }
        .r100-grid-2 { grid-template-columns: 1fr !important; }
        .r100-trilha-num { font-size: 40px !important; }
        .r100-hero-h1 { font-size: 22px !important; }
        .r100-step-lbl { font-size: 8px !important; }
        .r100-tab { font-size: 10px; padding: 8px 10px 10px; }
        .r100-card { padding: 20px !important; }
        .r100-fc { padding: 14px !important; }
        .r100-fc-actions { flex-direction: column !important; }
        .r100-fc-actions > * { width: 100% !important; justify-content: center !important; }
      }
      @media (max-width: 400px) {
        .r100-grid-3 { grid-template-columns: 1fr !important; }
        .r100-tab { font-size: 9px; padding: 8px 8px 10px; }
      }
    `;
    document.head.appendChild(style);
  }, []);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const bdg = (bg: string, color: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', padding: '3px 9px',
  borderRadius: 20, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
  background: bg, color, letterSpacing: '.02em',
});

// ── Status visual por visita/reunião ─────────────────────────────────────────
const VISITA_STATUS: Record<string, { label: string; icon: string; bg: string; clr: string }> = {
  visita_agendada:   { label: 'Visita agendada',   icon: '📅', bg: '#FFF5DC', clr: '#C4780A' },
  visita_realizada:  { label: 'Visita realizada',  icon: '✅', bg: '#E8F5EE', clr: '#1A7A4A' },
  reuniao_agendada:  { label: 'Reunião agendada',  icon: '🎥', bg: '#EEF0FF', clr: '#534AB7' },
  reuniao_realizada: { label: 'Reunião realizada', icon: '✅', bg: '#E8F5EE', clr: '#1A7A4A' },
  em_orcamento:      { label: 'Em orçamento',      icon: '📋', bg: '#F8F7F5', clr: '#7A776E' },
  orcamento_apresentado: { label: 'Orçamento apresentado', icon: '📄', bg: '#F8F7F5', clr: '#7A776E' },
};

// ── Stars ────────────────────────────────────────────────────────────────────
function Stars({ filled, total = 5, size = 12 }: { filled: number; total?: number; size?: number }) {
  return (
    <span style={{ display: 'flex', gap: 1 }}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} style={{ color: i < filled ? C.am : C.bd, fontSize: size, lineHeight: 1 }}>★</span>
      ))}
    </span>
  );
}

// ── Interactive star rating ───────────────────────────────────────────────────
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <span style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} onClick={() => onChange(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}
          style={{ fontSize: 22, cursor: 'pointer', color: i <= (hover || value) ? C.am : C.bd, lineHeight: 1, userSelect: 'none', transition: 'color .12s' }}>★</span>
      ))}
    </span>
  );
}

// ── Timeline operacional por empresa ──────────────────────────────────────────
const TIMELINE_LABELS = ['Inscr.', 'Contato', 'Visita', 'Pré-conf', 'Conf.SDR', 'Proposta', 'Fech.'] as const;

function getTimelineStage(emp: Rota100Empresa): number {
  const s: string = emp.statusAcompanhamento ?? 'inscrito';
  if (s === 'negocio_perdido') return -1;
  if (s === 'negocio_fechado') return 7;
  if (s === 'orcamento_enviado' || s === 'em_orcamento') return 6;
  if (s === 'visita_realizada' || s === 'reuniao_realizada') return 5;
  if ((s === 'visita_agendada' || s === 'reuniao_agendada') && emp.preConfirmadoEm) return 4;
  if (s === 'visita_agendada' || s === 'reuniao_agendada') return 3;
  if (s.includes('contato') || s === 'cliente_respondeu_nao_agendou' || s === 'nao_respondeu_mensagens') return 2;
  return 1;
}

function OperacionalTimeline({ emp }: { emp: Rota100Empresa }) {
  const stage     = getTimelineStage(emp);
  const dispensada = stage === -1;
  const total     = TIMELINE_LABELS.length;

  return (
    <div style={{ marginBottom: 14, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 280 }}>
        {TIMELINE_LABELS.map((label, i) => {
          const n      = i + 1;
          const isDone = !dispensada && stage > n;
          const isCur  = !dispensada && stage === n;
          const isLast = i === total - 1;
          const dotClr = dispensada ? C.cz : isDone ? C.vd : isCur ? C.lj : C.bd;
          const txtClr = dispensada ? C.cz : isDone ? C.vd : isCur ? C.lj : C.cz;
          return (
            <Fragment key={i}>
              <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 38 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', margin: '0 auto 5px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700,
                  border: `2px solid ${dotClr}`,
                  background: (isDone || isCur) && !dispensada ? dotClr : '#fff',
                  color: (isDone || isCur) && !dispensada ? '#fff' : dotClr,
                  transition: 'all .2s',
                  boxShadow: isCur ? `0 0 0 3px rgba(232,81,10,.14)` : 'none',
                }}>
                  {dispensada ? '✕' : isDone ? '✓' : n}
                </div>
                <div style={{ fontSize: 8, color: txtClr, fontWeight: isCur ? 700 : isDone ? 600 : 400, lineHeight: 1.3, letterSpacing: '.01em', whiteSpace: 'nowrap' }}>
                  {label}
                </div>
              </div>
              {!isLast && (
                <div style={{ flex: 1, height: 2, background: isDone && !dispensada ? C.vd : C.bd, marginTop: 10, minWidth: 6, transition: 'background .3s', borderRadius: 2 }} />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── Avatar initials ───────────────────────────────────────────────────────────
function Avatar({ initials, bg, size = 32 }: { initials: string; bg: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.31), fontWeight: 700, color: '#fff', flexShrink: 0, fontFamily: "'Syne', sans-serif", letterSpacing: '.02em' }}>
      {initials}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TABS
// ────────────────────────────────────────────────────────────────────────────
type Tab = 'checklist' | 'escopo' | 'empresas' | 'compatibilizacao' | 'marketplace' | 'avaliacoes';

// ── RELATÓRIO DE MEDIÇÃO (placeholder) ───────────────────────────────────────
function RelatorioMedicaoPlaceholder({ empresas }: { empresas: Rota100Empresa[] }) {
  const visitaRealizada = empresas.some(e =>
    e.statusAcompanhamento === 'visita_realizada' || e.statusAcompanhamento === 'reuniao_realizada'
  );
  if (!visitaRealizada) return null;

  return (
    <div className="r100-card" style={{ borderStyle: 'dashed', opacity: .8 }}>
      <div className="r100-card-h">
        <div className="r100-card-icon" style={{ background: '#F0F0F0' }}>📐</div>
        Relatório de medição
        <span style={{ marginLeft: 'auto', fontSize: 10, background: '#F0F0F0', color: '#7A776E', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>Em breve</span>
      </div>
      <p style={{ fontSize: 12, color: '#9A9790', lineHeight: 1.7 }}>
        Após a visita técnica, as empresas enviarão o relatório de medição do imóvel. Esse documento detalhará as dimensões reais do espaço e servirá de base para o orçamento final.
      </p>
      <div style={{ marginTop: 14, padding: '10px 14px', background: '#F8F7F5', borderRadius: 10, fontSize: 11, color: '#9A9790' }}>
        🔔 Você será notificado assim que o relatório estiver disponível.
      </div>
    </div>
  );
}

// ── CHECKLIST ────────────────────────────────────────────────────────────────
function ChecklistTab({ items, empresas }: { items: Rota100ChecklistItem[]; empresas: Rota100Empresa[] }) {
  return (
    <>
    <div className="r100-card">
      <div className="r100-card-h">
        <div className="r100-card-icon" style={{ background: '#FFF5DC' }}>✅</div>
        Checklist do processo
      </div>
      {items.map((item, i) => {
        const isDone = item.status === 'done';
        const isCur  = item.status === 'current';
        const isPend = item.status === 'pending';
        const isFut  = item.status === 'future';
        const dotBg    = isDone ? C.vd  : isCur ? C.lj  : isPend ? C.am2 : '#fff';
        const dotBord  = isDone ? C.vd  : isCur ? C.lj  : isPend ? C.am  : C.bd;
        const dotColor = isDone ? '#fff': isCur ? '#fff': isPend ? C.am  : C.cz;
        const dotLabel = isDone ? '✓' : isCur ? (('label2' in item ? item.label2 : null) ?? String(i+1)) : String(i+1);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '13px 0', borderBottom: i < items.length - 1 ? `1px solid rgba(0,0,0,.06)` : 'none' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${dotBord}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, marginTop: 1, background: dotBg, color: dotColor, transition: 'all .2s', boxShadow: isCur ? `0 0 0 4px rgba(232,81,10,.12)` : 'none' }}>
              {dotLabel}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: isDone ? 500 : isCur ? 600 : 400, color: isFut || isPend ? C.cz : C.nv, lineHeight: 1.5 }}>{item.label}</div>
              {item.meta && <div style={{ fontSize: 11, color: C.cz, marginTop: 3, lineHeight: 1.4 }}>{item.meta}</div>}
            </div>
            {isDone && <span style={bdg(C.vd2, C.vd)}>✓ Concluído</span>}
            {isCur  && <span style={bdg('rgba(232,81,10,.1)', C.lj)}>Em andamento</span>}
          </div>
        );
      })}
      <div style={{ marginTop: 18, padding: '14px 18px', background: C.am2, borderRadius: 12, borderLeft: `4px solid ${C.am}` }}>
        <p style={{ fontSize: 12, color: '#7A5810', lineHeight: 1.65 }}><strong>Meta Reforma100:</strong> fechar em até 8 dias. Hoje é o dia 3. Assim que decidir seguir com uma ou mais empresas, a compatibilização é gerada imediatamente.</p>
      </div>
    </div>
    <RelatorioMedicaoPlaceholder empresas={empresas} />
    </>
  );
}

// ── ESCOPO ────────────────────────────────────────────────────────────────────
function EscopoTab({ itens, foraDoEscopo, tags }: Rota100Escopo) {
  const localTags = tags;

  return (
    <>
      <div className="r100-card">
        <div className="r100-card-h">
          <div className="r100-card-icon" style={{ background: '#EEF0FF' }}>📝</div>
          Escopo registrado
        </div>
        <ul style={{ fontSize: 13, color: C.cz, lineHeight: 2.1, paddingLeft: 18, marginBottom: 14 }}>
          {itens.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
        <div style={{ padding: '10px 0', borderTop: `1px solid rgba(0,0,0,.06)`, borderBottom: `1px solid rgba(0,0,0,.06)`, marginBottom: 14 }}>
          <span style={{ fontSize: 11, color: C.cz }}><strong style={{ color: C.nv }}>Fora do escopo:</strong> {foraDoEscopo}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {localTags.map((t, i) => (
            <span key={i} style={{ background: C.fd, border: `1px solid ${C.bd}`, borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 500, color: C.nv }}>{t}</span>
          ))}
        </div>
        {/* future: adicionar item ao escopo — oculto por ora (modo consulta) */}
      </div>
      {/* future: upload de fotos/vídeos — oculto por ora (modo consulta) */}
    </>
  );
}

// ── MODAL INLINE DE DISPENSA ──────────────────────────────────────────────────
interface DispensaState {
  empresaId:    string;
  empresaNome:  string;
  notas:        Record<string, number>;
  justificativa: string;
  enviando:     boolean;
}

function ModalDispensa({
  state,
  onChange,
  onEnviar,
  onCancelar,
}: {
  state:      DispensaState;
  onChange:   (next: Partial<DispensaState>) => void;
  onEnviar:   () => void;
  onCancelar: () => void;
}) {
  const cats: [string, string][] = [
    ['comunicacao',   'Comunicação'],
    ['prazo',         'Agilidade no retorno'],
    ['transparencia', 'Transparência'],
    ['geral',         'Impressão geral'],
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(26,32,48,.55)', backdropFilter: 'blur(3px)' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,.22)', animation: 'r100FadeIn .22s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: C.nv }}>Dispensar empresa</div>
            <div style={{ fontSize: 12, color: C.cz, marginTop: 3 }}>{state.empresaNome}</div>
          </div>
          <button onClick={onCancelar} style={{ width: 30, height: 30, border: 'none', background: C.fd, borderRadius: 8, cursor: 'pointer', fontSize: 16, color: C.cz, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Avaliação por dimensão */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.cz, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>Avaliação (opcional)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {cats.map(([key, label]) => (
              <div key={key}>
                <div style={{ fontSize: 10, color: C.cz, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
                <StarRating value={state.notas[key] ?? 0} onChange={v => onChange({ notas: { ...state.notas, [key]: v } })} />
              </div>
            ))}
          </div>
        </div>

        {/* Justificativa */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.nv, display: 'block', marginBottom: 6 }}>
            Por que você não deseja seguir com esta empresa? <span style={{ color: C.vm }}>*</span>
          </label>
          <textarea
            className="r100-textarea"
            rows={3}
            placeholder="Ex: Não atendeu ao contato, proposta fora do prazo, não transmitiu confiança…"
            value={state.justificativa}
            onChange={e => onChange({ justificativa: e.target.value })}
          />
          {state.justificativa.trim().length === 0 && (
            <div style={{ fontSize: 10, color: C.vm, marginTop: 4 }}>Campo obrigatório</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="r100-btn r100-btn-ghost r100-btn-sm" onClick={onCancelar} style={{ flex: 1, justifyContent: 'center' }}>
            Cancelar
          </button>
          <button
            className="r100-btn r100-btn-danger r100-btn-sm"
            style={{ flex: 2, justifyContent: 'center', opacity: state.justificativa.trim() === '' || state.enviando ? .5 : 1 }}
            disabled={state.justificativa.trim() === '' || state.enviando}
            onClick={onEnviar}
          >
            {state.enviando ? 'Enviando…' : 'Enviar avaliação e dispensar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── BLOCO DE VISITA / REUNIÃO ─────────────────────────────────────────────────
function VisitaBlock({
  empresas, token, tipoAtendimento,
}: {
  empresas: Rota100Empresa[];
  token: string;
  tipoAtendimento?: string | null;
}) {
  // Detectar tipo se não explícito
  const tipo =
    tipoAtendimento ??
    (empresas.some(e => e.statusAcompanhamento === 'visita_agendada' || e.statusAcompanhamento === 'visita_realizada')
      ? 'presencial'
      : empresas.some(e => e.statusAcompanhamento === 'reuniao_agendada' || e.statusAcompanhamento === 'reuniao_realizada')
        ? 'online'
        : null);

  const empAtivas = empresas.filter(e =>
    e.statusAcompanhamento === 'visita_agendada'   ||
    e.statusAcompanhamento === 'reuniao_agendada'  ||
    e.statusAcompanhamento === 'visita_realizada'  ||
    e.statusAcompanhamento === 'reuniao_realizada'
  );

  if (!tipo || empAtivas.length === 0) return null;

  const isPresencial = tipo === 'presencial';
  const realizadas   = empAtivas.filter(e =>
    e.statusAcompanhamento === 'visita_realizada' || e.statusAcompanhamento === 'reuniao_realizada'
  );
  const agendadas    = empAtivas.filter(e =>
    e.statusAcompanhamento === 'visita_agendada' || e.statusAcompanhamento === 'reuniao_agendada'
  );

  // Data/hora representativa: primeiro agendado ou primeiro realizado
  const primeiraDataHora = (agendadas[0] ?? realizadas[0])?.dataHora ?? null;

  const fmtDt = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtTm = (iso: string) =>
    new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const acBg  = isPresencial ? '#FFF9F0' : '#F2F3FF';
  const acBd  = isPresencial ? 'rgba(196,120,10,.22)' : 'rgba(83,74,183,.22)';
  const acClr = isPresencial ? '#C4780A' : '#534AB7';

  const statusBadge = realizadas.length === empAtivas.length
    ? <span style={bdg(C.vd2, C.vd)}>✓ {realizadas.length === 1 ? 'Realizada' : `${realizadas.length} realizadas`}</span>
    : agendadas.length > 0
      ? <span style={bdg(isPresencial ? '#FFF5DC' : '#EEF0FF', acClr)}>
          {agendadas.length} empresa{agendadas.length > 1 ? 's' : ''} confirmada{agendadas.length > 1 ? 's' : ''}
        </span>
      : null;

  return (
    <div style={{ marginBottom: 18, padding: '18px 18px 16px', background: acBg, borderRadius: 14, border: `1.5px solid ${acBd}` }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: isPresencial ? '#FFF5DC' : '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
          {isPresencial ? '📅' : '🎥'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: C.nv }}>
            {isPresencial ? 'Visita presencial' : 'Reunião online'}
          </div>
          {primeiraDataHora && (
            <div style={{ fontSize: 11, fontWeight: 600, color: acClr, marginTop: 1 }}>
              {fmtDt(primeiraDataHora)} às {fmtTm(primeiraDataHora)}
            </div>
          )}
        </div>
        {statusBadge}
      </div>

      {/* Status por empresa */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: (isPresencial && agendadas.length > 0) ? 14 : 4 }}>
        {empAtivas.map(emp => {
          const feito = emp.statusAcompanhamento === 'visita_realizada' || emp.statusAcompanhamento === 'reuniao_realizada';
          return (
            <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: feito ? C.vd : acClr, flexShrink: 0 }} />
              <span style={{ fontWeight: 600, color: C.nv }}>{emp.nome}</span>
              <span style={{ color: C.cz }}>
                {feito
                  ? (isPresencial ? '— presença confirmada' : '— reunião realizada')
                  : (isPresencial ? '— aguardando confirmação' : '— link enviado')}
              </span>
              {feito && emp.visitaConfirmadaEm && (
                <span style={{ color: C.cz }}>· {fmtTm(emp.visitaConfirmadaEm)}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* QR Code único — visita presencial */}
      {isPresencial && agendadas.length > 0 && (
        <div style={{ borderTop: `1px solid rgba(196,120,10,.16)`, paddingTop: 14, display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-block', padding: 8, background: '#fff', borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,.08)', flexShrink: 0 }}>
            <QRCodeSVG
              value={`${window.location.origin}/validar-visita/${token}`}
              size={108}
              level="M"
            />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, color: C.nv, marginBottom: 5 }}>
              QR Code da visita
            </div>
            <p style={{ fontSize: 11, color: C.cz, lineHeight: 1.65, marginBottom: 8 }}>
              O responsável de cada empresa escaneia ao chegar no imóvel. O sistema valida a presença automaticamente.
            </p>
            <div style={{ fontSize: 10, color: acClr, background: '#FFF5DC', borderRadius: 8, padding: '4px 10px', display: 'inline-block', border: `1px solid rgba(196,120,10,.22)`, fontWeight: 600 }}>
              Código único — válido para todas as empresas
            </div>
          </div>
        </div>
      )}

      {/* Botões de reunião online — por empresa */}
      {!isPresencial && (agendadas.length > 0 || realizadas.length > 0) && (
        <div style={{ borderTop: '1px solid rgba(83,74,183,.14)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Agendadas: botão de entrada ou aviso sem link */}
          {agendadas.map(emp => (emp.tokenVisita || emp.linkReuniao) ? (
            <a key={emp.id}
              href={emp.tokenVisita
                ? `${window.location.origin}/entrar-reuniao/${emp.id}/${emp.tokenVisita}`
                : (emp.linkReuniao ?? '#')}
              target="_blank" rel="noreferrer"
              className="r100-btn r100-btn-primary r100-btn-sm"
              style={{ textDecoration: 'none', alignSelf: 'flex-start' }}
            >
              🎥 Entrar na reunião — {emp.nome}
            </a>
          ) : (
            <div key={emp.id} style={{ fontSize: 11, color: C.cz, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.bd, flexShrink: 0, display: 'inline-block' }} />
              <span style={{ color: C.nv, fontWeight: 600 }}>{emp.nome}</span>
              <span>— aguardando link de reunião</span>
            </div>
          ))}
          {/* Realizadas: indicador de confirmação */}
          {realizadas.map(emp => (
            <div key={emp.id} style={{ fontSize: 11, color: C.cz, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.vd, flexShrink: 0, display: 'inline-block' }} />
              <span style={{ color: C.nv, fontWeight: 600 }}>{emp.nome}</span>
              <span>— reunião realizada</span>
              {emp.visitaConfirmadaEm && (
                <span>· {fmtTm(emp.visitaConfirmadaEm)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── EMPRESAS ──────────────────────────────────────────────────────────────────
function EmpresasTab({
  empresas,
  token,
  tipoAtendimento,
  onCompatIndividual,
  onCompatCompleta,
  onDispensa,
}: {
  empresas:           Rota100Empresa[];
  token:              string;
  tipoAtendimento?:   string | null;
  onCompatIndividual: (empresaId: string, empresaNome: string) => Promise<void>;
  onCompatCompleta:   () => Promise<void>;
  onDispensa:         (candidaturaId: string, empresaNome: string, notas: Record<string, number>, justificativa: string) => Promise<void>;
}) {
  const [solicitadosIndividual, setSolicitadosIndividual] = useState<Set<string>>(new Set());
  const [solicitadaCompleta,    setSolicitadaCompleta]    = useState(false);
  const [confirmandoUnica,      setConfirmandoUnica]      = useState(false);
  const [dispensadas,           setDispensadas]           = useState<Set<string>>(new Set());
  const [modalDispensa,         setModalDispensa]         = useState<DispensaState | null>(null);

  // Fonte única de verdade: banco. Recarrega no mount e após cada dispensa.
  const reloadDispensadas = useCallback(async () => {
    if (!token) return;
    const ids = await getDispensadas(token);
    setDispensadas(new Set(ids));
  }, [token]);

  // Fonte única de verdade: banco. Recarrega no mount e após cada compat.
  const reloadCompat = useCallback(async () => {
    if (!token) return;
    const reqs = await getCompatRequests(token);
    const individuais = new Set(
      reqs.filter(r => r.tipo === 'individual' && r.empresaId).map(r => r.empresaId!)
    );
    setSolicitadosIndividual(individuais);
    setSolicitadaCompleta(reqs.some(r => r.tipo === 'completa'));
  }, [token]);

  useEffect(() => { reloadDispensadas(); }, [reloadDispensadas]);
  useEffect(() => { reloadCompat(); }, [reloadCompat]);

  // Empresas com proposta enviada E não dispensadas
  const empresasComProposta = empresas.filter(e => e.propostaEnviada && !dispensadas.has(e.id));

  const handleIndividual = async (emp: Rota100Empresa) => {
    // Snapshot antes do save para saber se é a 1ª ou 2ª+ solicitação
    const prevSet = new Set(solicitadosIndividual);
    await onCompatIndividual(emp.id, emp.nome);
    await reloadCompat();

    const nextSet = new Set([...prevSet, emp.id]);
    if (nextSet.size === 1) {
      toast.success(`Compatibilização de ${emp.nome} solicitada. Seu consultor já foi acionado.`);
    } else {
      const nomes = empresas
        .filter(e => nextSet.has(e.id))
        .map(e => e.nome);
      const nomesStr = nomes.length > 2
        ? nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1]
        : nomes.join(' e ');
      toast.success(
        `Perfeito. Vamos reunir as compatibilizações das empresas ${nomesStr}. ` +
        `Seu consultor já foi acionado e você receberá a análise comparativa entre elas.`
      );
    }
  };

  const handleCompleta = async () => {
    await onCompatCompleta();
    await reloadCompat();
    setConfirmandoUnica(false);
  };

  const abrirDispensa = (emp: Rota100Empresa) => {
    if (dispensadas.has(emp.id)) return;
    setModalDispensa({ empresaId: emp.id, empresaNome: emp.nome, notas: {}, justificativa: '', enviando: false });
  };

  const enviarDispensa = async () => {
    if (!modalDispensa || modalDispensa.justificativa.trim() === '') return;
    const snap = modalDispensa;
    setModalDispensa(prev => prev ? { ...prev, enviando: true } : null);
    try {
      await onDispensa(snap.empresaId, snap.empresaNome, snap.notas, snap.justificativa);
      // Recarrega do banco — não usa estado local otimista
      await reloadDispensadas();
      setModalDispensa(null);
      toast.success(`${snap.empresaNome} dispensada. Obrigado pelo feedback.`);
    } catch (err) {
      const msg = (err as any)?.message ?? 'Erro desconhecido';
      setModalDispensa(prev => prev ? { ...prev, enviando: false } : null);
      toast.error(`Não foi possível salvar a dispensa: ${msg}`);
    }
  };

  return (
    <>
      {modalDispensa && (
        <ModalDispensa
          state={modalDispensa}
          onChange={next => setModalDispensa(prev => prev ? { ...prev, ...next } : null)}
          onEnviar={enviarDispensa}
          onCancelar={() => setModalDispensa(null)}
        />
      )}

      {/* Bloco de visita/reunião — acima dos cartões de empresa */}
      <VisitaBlock empresas={empresas} token={token} tipoAtendimento={tipoAtendimento} />

      <div className="r100-card">
        <div className="r100-card-h" style={{ justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="r100-card-icon" style={{ background: '#E8F5EE' }}>🏢</div>
            Empresas no processo
          </span>
          <span style={{ fontSize: 11, color: C.cz, fontWeight: 500 }}>{empresas.length} empresa{empresas.length !== 1 ? 's' : ''}</span>
        </div>

        {empresas.length === 0 && (
          <div style={{ padding: '32px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#F5F3EF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 4 }}>🏢</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.nv }}>Empresas em seleção</div>
            <p style={{ fontSize: 12, color: C.cz, lineHeight: 1.65, maxWidth: 300 }}>
              Nossa equipe está selecionando os melhores parceiros para o seu projeto. Em breve você verá as empresas que participarão do processo.
            </p>
          </div>
        )}

        {empresas.map(emp => {
          const temProposta   = emp.propostaEnviada;
          const foiDispensada = dispensadas.has(emp.id);
          const st            = emp.statusType; // 'done' | 'current' | 'pending'
          const barColor      = foiDispensada ? C.cz : st === 'done' ? C.vd : st === 'current' ? C.lj : C.am;
          const badgeBg       = foiDispensada ? '#F0EFED' : st === 'done' ? C.vd2 : st === 'current' ? 'rgba(232,81,10,.10)' : C.am2;
          const badgeClr      = foiDispensada ? C.cz     : st === 'done' ? C.vd  : st === 'current' ? C.lj : C.am;
          const jaSolicitado  = solicitadosIndividual.has(emp.id);

          return (
            <div key={emp.id} className="r100-fc" style={foiDispensada ? { opacity: .65, filter: 'grayscale(.4)' } : undefined}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar initials={emp.initials} bg={foiDispensada ? '#9A9790' : emp.bgColor} size={36} />
                  <div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: foiDispensada ? C.cz : C.nv }}>{emp.nome}</div>
                    <div style={{ fontSize: 11, color: C.cz, marginTop: 1 }}>Inscrita em {emp.inscritaEm}</div>
                  </div>
                </div>
                {foiDispensada
                  ? <span style={bdg('#F0EFED', C.cz)}>Empresa dispensada</span>
                  : <span style={bdg(badgeBg, badgeClr)}>{emp.status}</span>
                }
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ flex: 1, height: 6, background: C.bd, borderRadius: 20, overflow: 'hidden' }}>
                  <div className="r100-bar-fill" style={{ width: `${emp.progresso}%`, background: barColor }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: barColor, minWidth: 30, textAlign: 'right' }}>{emp.progresso}%</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.cz, marginBottom: 14 }}>
                <span>{emp.valor !== '—' ? `${emp.valor} · ${emp.composicao}` : emp.composicao}</span>
                <span>Prazo: {emp.prazo}</span>
              </div>

              <OperacionalTimeline emp={emp} />

              {/* Aguardando agendamento — empresa sem visita/reunião marcada */}
              {!foiDispensada && (!emp.statusAcompanhamento || emp.statusAcompanhamento === 'sem_contato' || emp.statusAcompanhamento === 'em_contato') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '7px 12px', borderRadius: 10, background: '#F5F3EF', border: '1px solid #E0DDD722' }}>
                  <span style={{ fontSize: 14 }}>⏳</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#7A776E' }}>
                    {emp.statusAcompanhamento === 'em_contato' ? 'Em contato — agendamento em andamento' : 'Aguardando agendamento pelo SDR'}
                  </span>
                </div>
              )}

              {/* Status visual de visita/reunião */}
              {!foiDispensada && emp.statusAcompanhamento && VISITA_STATUS[emp.statusAcompanhamento] && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '7px 12px', borderRadius: 10, background: VISITA_STATUS[emp.statusAcompanhamento].bg, border: `1px solid ${VISITA_STATUS[emp.statusAcompanhamento].clr}22` }}>
                  <span style={{ fontSize: 14 }}>{VISITA_STATUS[emp.statusAcompanhamento].icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: VISITA_STATUS[emp.statusAcompanhamento].clr }}>{VISITA_STATUS[emp.statusAcompanhamento].label}</span>
                  {(emp.statusAcompanhamento === 'visita_agendada' || emp.statusAcompanhamento === 'reuniao_agendada') && (
                    <span style={{ fontSize: 10, marginLeft: 4, fontWeight: 600, color: emp.preConfirmadoEm ? C.vd : C.am }}>
                      {emp.preConfirmadoEm ? '✅ Pré-confirmada' : '⏳ Aguardando confirmação'}
                    </span>
                  )}
                  {(emp.statusAcompanhamento === 'visita_realizada' || emp.statusAcompanhamento === 'reuniao_realizada') && (
                    <span style={{ fontSize: 10, color: C.vd, marginLeft: 4, fontWeight: 600 }}>✔ Confirmado pela Reforma100</span>
                  )}
                </div>
              )}

              {/* Ações — sempre visíveis para não-dispensadas */}
              {!foiDispensada && (
                <div className="r100-fc-actions" style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Compat individual — botão ou texto, nunca some */}
                  {jaSolicitado ? (
                    <span style={bdg(C.vd2, C.vd)}>✓ Compatibilização individual solicitada</span>
                  ) : temProposta ? (
                    <button className="r100-btn r100-btn-ghost r100-btn-sm" onClick={() => handleIndividual(emp)}>
                      Ver compatibilização individual
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: C.cz, fontStyle: 'italic' }}>Aguardando proposta para análise</span>
                  )}

                  <button className="r100-btn r100-btn-danger r100-btn-sm" onClick={() => abrirDispensa(emp)}>
                    Dispensar empresa
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Compatibilização completa — botão fixo, sempre visível */}
        <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid rgba(0,0,0,.06)` }}>
          {solicitadaCompleta ? (
            <div style={{ padding: '14px 18px', background: C.vd2, borderRadius: 12, borderLeft: `4px solid ${C.vd}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.vd }}>Compatibilização completa solicitada</div>
                <div style={{ fontSize: 12, color: C.nv, marginTop: 2 }}>Seu consultor já foi acionado. Em breve você receberá o contato.</div>
              </div>
            </div>
          ) : (
            <>
              {confirmandoUnica && (
                <div style={{ padding: '18px', background: C.fd, borderRadius: 12, border: `1.5px solid ${C.bd}`, marginBottom: 12 }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: C.nv, marginBottom: 8 }}>Apenas 1 proposta disponível</div>
                  <p style={{ fontSize: 12, color: C.cz, lineHeight: 1.65, marginBottom: 16 }}>Deseja prosseguir mesmo com apenas uma empresa, ou prefere aguardar mais propostas?</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="r100-btn r100-btn-ghost r100-btn-sm" onClick={() => setConfirmandoUnica(false)}>Aguardar mais propostas</button>
                    <button className="r100-btn r100-btn-primary r100-btn-sm" onClick={handleCompleta}>Prosseguir assim mesmo →</button>
                  </div>
                </div>
              )}

              <button
                className="r100-btn r100-btn-primary r100-btn-md"
                disabled={empresasComProposta.length === 0}
                style={{ opacity: empresasComProposta.length === 0 ? .45 : 1, cursor: empresasComProposta.length === 0 ? 'not-allowed' : 'pointer' }}
                onClick={() => {
                  if (empresasComProposta.length === 0) return;
                  if (empresasComProposta.length === 1) setConfirmandoUnica(true);
                  else handleCompleta();
                }}
              >
                Ver compatibilização completa →
              </button>

              {empresasComProposta.length === 0 && (
                <p style={{ fontSize: 11, color: C.cz, marginTop: 8, lineHeight: 1.55 }}>
                  Disponível quando ao menos uma empresa enviar proposta.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── COMPATIBILIZAÇÃO ──────────────────────────────────────────────────────────
// ── helpers de compat (sem lógica de IA — só apresentação) ───────────────────
const COMPAT_CORES = ['#2D3395', '#F7A226', '#1B7A4A', '#8B2252', '#0D7377', '#B5451B'] as const;

function compatFmtBRL(v: number | null | undefined): string {
  if (v == null || v === 0) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function CompatMercadoBadge({ diff }: { diff: number | null | undefined }) {
  if (diff == null) return null;
  if (diff > 10)  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#FEE2E2', color: '#B91C1C' }}>+{diff.toFixed(1)}% acima do mercado</span>;
  if (diff < -10) return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#FEF3C7', color: '#92400E' }}>{diff.toFixed(1)}% abaixo do mercado</span>;
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: C.vd2, color: C.vd }}>Dentro do mercado</span>;
}

function CompatRankingCard({ emp, isRec, idx }: { emp: EmpresaRanking; isRec: boolean; idx: number }) {
  const cor = COMPAT_CORES[idx] ?? '#2D3395';
  const temRisco = emp.score_risco != null && emp.score_risco < 50;
  const fortes   = (emp.pontos_fortes ?? []).slice(0, 3);
  return (
    <div style={{ borderRadius: 14, border: `1.5px solid ${isRec ? C.vd : C.bd}`, background: isRec ? C.vd2 : '#fff', padding: '18px 20px', boxShadow: isRec ? '0 2px 14px rgba(26,122,74,.12)' : '0 1px 4px rgba(0,0,0,.04)', borderLeft: `5px solid ${cor}`, marginBottom: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 15, flexShrink: 0 }}>
          {emp.posicao}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: isRec ? C.vd : C.nv }}>{emp.empresa}</span>
            {isRec && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: C.vd, color: '#fff' }}>Indicada</span>}
            {temRisco && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: '#FEE2E2', color: '#B91C1C' }}>Atenção: risco</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.nv }}>{compatFmtBRL(emp.valor_proposta)}</span>
            <CompatMercadoBadge diff={emp.diferenca_mercado} />
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, color: emp.score_composto >= 75 ? C.vd : emp.score_composto >= 50 ? C.am : C.vm }}>{emp.score_composto}</div>
          <div style={{ fontSize: 9, color: C.cz }}>avaliação</div>
        </div>
      </div>
      {/* Barra de avaliação */}
      <div style={{ height: 4, borderRadius: 9, background: C.bd, marginBottom: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 9, background: cor, width: `${emp.score_composto}%`, transition: 'width .6s' }} />
      </div>
      {/* Pontos fortes */}
      {fortes.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {fortes.map((p, i) => (
            <li key={i} style={{ fontSize: 12, color: C.nv, display: 'flex', gap: 6, lineHeight: 1.5 }}>
              <span style={{ color: C.vd, flexShrink: 0 }}>✓</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CompatibilizacaoTab({
  requested, onRequest, onGoToEmpresas, compatResult,
}: {
  requested: boolean;
  onRequest: () => void;
  onGoToEmpresas: () => void;
  compatResult: CompatibilizacaoCompleta | null;
}) {
  // ── Estado liberado ──────────────────────────────────────────────────────────
  if (compatResult) {
    const ranking = [...(compatResult.ranking ?? [])].sort((a, b) => a.posicao - b.posicao);
    const recomendada = ranking.find(e => e.candidatura_id === compatResult.empresa_recomendada_id) ?? ranking[0];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ borderRadius: 16, background: `linear-gradient(135deg, ${C.nv} 0%, #2a3240 100%)`, padding: '22px 24px', color: '#fff' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.45)', marginBottom: 6 }}>Análise Reforma100</div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, fontWeight: 400, lineHeight: 1.25, marginBottom: 10 }}>
            Compatibilização de propostas pronta
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', lineHeight: 1.7 }}>
            Analisamos cada proposta em detalhe — escopo, preço, prazo e risco — e preparamos esta comparação para te ajudar a decidir com segurança.
          </p>
        </div>

        {/* Empresa indicada */}
        {recomendada && (
          <div style={{ borderRadius: 14, background: C.vd2, border: `1.5px solid ${C.vd}`, padding: '20px 22px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: C.vd, marginBottom: 8 }}>Empresa mais indicada</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, fontWeight: 400, color: C.vd, flex: 1 }}>{recomendada.empresa}</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: C.vd, lineHeight: 1 }}>{recomendada.score_composto}</div>
                <div style={{ fontSize: 9, color: C.vd }}>/ 100</div>
              </div>
            </div>
            {compatResult.recomendacao_geral && (
              <p style={{ fontSize: 13, color: C.nv, lineHeight: 1.75, marginTop: 10 }}>{compatResult.recomendacao_geral}</p>
            )}
          </div>
        )}

        {/* Ranking de propostas */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: C.cz, marginBottom: 12 }}>
            Comparativo de propostas — {ranking.length} empresa{ranking.length !== 1 ? 's' : ''} avaliada{ranking.length !== 1 ? 's' : ''}
          </div>
          {ranking.map((emp, i) => (
            <CompatRankingCard
              key={emp.candidatura_id}
              emp={emp}
              isRec={emp.candidatura_id === compatResult.empresa_recomendada_id}
              idx={i}
            />
          ))}
        </div>

        <div style={{ borderRadius: 12, background: C.fd, border: `1px solid ${C.bd}`, padding: '14px 18px' }}>
          <p style={{ fontSize: 12, color: C.cz, lineHeight: 1.75 }}>
            Esta análise foi preparada pelo seu consultor Reforma100 com base nas propostas recebidas. Fale com ele para esclarecer dúvidas antes de decidir.
          </p>
        </div>
      </div>
    );
  }

  // ── Estado solicitado (aguardando) ───────────────────────────────────────────
  if (requested) {
    return (
      <div className="r100-card" style={{ textAlign: 'center', padding: '52px 36px', background: C.vd2, borderColor: 'rgba(26,122,74,.15)' }}>
        <div style={{ width: 68, height: 68, borderRadius: '50%', background: C.vd, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 22px', boxShadow: '0 4px 20px rgba(26,122,74,.25)' }}>📬</div>
        <h3 className="serif" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, fontWeight: 400, color: C.vd, marginBottom: 12, lineHeight: 1.25 }}>Solicitação registrada!</h3>
        <p style={{ fontSize: 14, color: C.nv, lineHeight: 1.8, maxWidth: 420, margin: '0 auto' }}>
          Seu consultor já foi acionado. Em breve você receberá o contato com a compatibilização da sua reforma.
        </p>
      </div>
    );
  }

  // ── Estado bloqueado (preservado) ────────────────────────────────────────────
  return (
    <div style={{ background: '#fff', border: `1.5px dashed ${C.bd}`, borderRadius: 16, padding: '52px 36px', textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,.04)' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.fd, border: `2px solid ${C.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 22px' }}>🔒</div>
      <h3 className="serif" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, fontWeight: 400, color: C.nv, marginBottom: 12, lineHeight: 1.25 }}>Compatibilização indisponível</h3>
      <p style={{ fontSize: 13, color: C.cz, lineHeight: 1.85, maxWidth: 440, margin: '0 auto 28px' }}>
        A compatibilização é gerada <strong style={{ color: C.nv }}>somente após você decidir</strong> seguir com uma ou mais empresas.<br /><br />
        Vá até a aba <strong style={{ color: C.nv }}>Empresas</strong>, veja as propostas e confirme se deseja seguir com alguma.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="r100-btn r100-btn-primary r100-btn-md" onClick={onGoToEmpresas}>
          Ir para Empresas →
        </button>
        <button className="r100-btn r100-btn-ghost r100-btn-md" onClick={onRequest}>
          Solicitar compatibilização
        </button>
      </div>
    </div>
  );
}

// ── MARKETPLACE ───────────────────────────────────────────────────────────────
function MarketplaceTab() {
  const { produtos, parceiros } = MOCK_ROTA100.marketplace;
  const cats = ['Todos','Revestimentos','Elétrica','Hidráulica','Gesso/Drywall','Pintura','Ferramentas','Decoração','Louças/Metais'];
  const [catAtiva, setCatAtiva] = useState('Todos');
  const [busca, setBusca] = useState('');

  const prodsFiltrados = produtos.filter(p => {
    const matchCat = catAtiva === 'Todos' || p.cat === catAtiva;
    const matchBusca = !busca || p.nome.toLowerCase().includes(busca.toLowerCase()) || p.loja.toLowerCase().includes(busca.toLowerCase());
    return matchCat && matchBusca;
  });

  const badgePartner = (color: string) => {
    if (color === 'green')  return { bg: C.vd2, fg: C.vd };
    if (color === 'orange') return { bg: 'rgba(232,81,10,.1)', fg: C.lj };
    return { bg: C.fd, fg: C.cz };
  };

  return (
    <div>
      {/* Banner */}
      <div style={{ background: `linear-gradient(135deg, ${C.nv} 0%, #2a3240 100%)`, borderRadius: 16, padding: '26px 28px', color: '#fff', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 4px 24px rgba(26,32,48,.18)' }}>
        <div style={{ fontSize: 44, flexShrink: 0 }}>🛒</div>
        <div>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 19, fontWeight: 400, marginBottom: 6, lineHeight: 1.3 }}>Marketplace Reforma100</h3>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 12, lineHeight: 1.6 }}>Produtos selecionados para sua reforma — construção, decoração e acabamento com os melhores parceiros</p>
          <button className="r100-btn r100-btn-primary r100-btn-sm" onClick={() => toast.info('Em breve integração completa!')}>
            Saiba como ganhar indicando →
          </button>
        </div>
      </div>

      {/* Busca */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input type="text" className="r100-input" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produtos de construção, reforma e decoração..." style={{ flex: 1 }} />
        <button className="r100-btn r100-btn-primary r100-btn-md">Buscar</button>
      </div>

      {/* Categorias */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {cats.map(c => (
          <button key={c} onClick={() => setCatAtiva(c)}
            style={{ padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${catAtiva === c ? C.nv : C.bd}`, background: catAtiva === c ? C.nv : '#fff', color: catAtiva === c ? '#fff' : C.cz, transition: 'all .18s' }}>
            {c}
          </button>
        ))}
      </div>

      {/* Grid produtos */}
      <div className="r100-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {prodsFiltrados.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: C.cz, padding: 40, fontSize: 13 }}>Nenhum produto encontrado.</div>
        ) : prodsFiltrados.map(p => (
          <div key={p.id} className="r100-mkt-card" onClick={() => toast.info(`${p.nome} — disponível em breve.`)}>
            <div style={{ width: '100%', aspectRatio: '1', background: C.fd, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, borderBottom: `1px solid ${C.bd}` }}>
              {p.emoji}
            </div>
            <div style={{ padding: '12px 12px 14px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: C.cz, marginBottom: 3 }}>{p.loja}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.nv, lineHeight: 1.35, marginBottom: 8 }}>{p.nome}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 800, color: C.lj }}>{p.preco}</span>
                <span style={{ fontSize: 10, color: C.cz, textDecoration: 'line-through' }}>{p.precoAnt}</span>
              </div>
              <button className="r100-btn r100-btn-primary r100-btn-sm" style={{ width: '100%', justifyContent: 'center', fontSize: 10 }}
                onClick={e => { e.stopPropagation(); toast.info('Link de compra disponível em breve.'); }}>
                Comprar
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="r100-div"><h3>Lojas parceiras</h3></div>
      <div className="r100-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {parceiros.map((p, i) => {
          const b = badgePartner(p.badgeColor);
          return (
            <div key={i} className="r100-partner-card" onClick={() => toast.info(`${p.nome} — disponível em breve.`)}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>{p.emoji}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{p.nome}</div>
              <div style={{ fontSize: 10, color: C.cz, lineHeight: 1.55, marginBottom: 8 }}>{p.desc}</div>
              <span style={{ ...bdg(b.bg, b.fg), fontSize: 9 }}>{p.badge}</span>
            </div>
          );
        })}
      </div>

      <div className="r100-card" style={{ background: C.vd2, borderColor: 'rgba(26,122,74,.15)' }}>
        <div className="r100-card-h"><div className="r100-card-icon" style={{ background: '#fff' }}>💡</div>Como funciona a monetização Reforma100</div>
        <div className="r100-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { icon: '🛒', title: 'Para o cliente',         desc: 'Acesso a produtos selecionados com preços de mercado. Sem taxa adicional.' },
            { icon: '💰', title: 'Para a Reforma100',       desc: 'Recebemos comissão das plataformas parceiras — sem custo para o cliente.' },
            { icon: '📦', title: 'Sem estoque',             desc: 'Operamos como afiliado — entrega e gestão são das plataformas.' },
            { icon: '🎯', title: 'Produtos relevantes',     desc: 'Sugerimos produtos alinhados ao escopo e à sua região.' },
          ].map((it, i) => (
            <div key={i} style={{ padding: '14px 16px', background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.nv, marginBottom: 4 }}>{it.icon} {it.title}</p>
              <p style={{ fontSize: 11, color: C.cz, lineHeight: 1.65 }}>{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AVALIAÇÕES ────────────────────────────────────────────────────────────────
function AvaliacoesTab({ empresas: empresasReais, token, orcamentoId }: { empresas: Rota100Empresa[], token: string, orcamentoId: string }) {
  const { ranking } = MOCK_ROTA100.avaliacoes;
  const empresas = empresasReais.length > 0
    ? empresasReais.map(e => ({ id: e.id, initials: e.initials, bgColor: e.bgColor, nome: e.nome, valor: e.valor, highlight: false }))
    : MOCK_ROTA100.avaliacoes.empresas;

  type RatingsMap = Record<string, Record<string, number>>;
  const [ratings, setRatings] = useState<RatingsMap>(() => {
    const init: RatingsMap = {};
    empresas.forEach(e => { init[e.id] = { com: 0, prop: 0, prazo: 0, geral: 0 }; });
    return init;
  });
  const [comentarios, setComentarios] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    empresas.forEach(e => { init[e.id] = ''; });
    return init;
  });
  const [enviado, setEnviado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!token) return;
    (supabase as any)
      .from('avaliacoes_fornecedor')
      .select('candidatura_id, nota_geral, notas, comentario')
      .eq('rota100_token', token)
      .then(({ data }: { data: any[] | null }) => {
        if (!data || data.length === 0) return;
        const newRatings: RatingsMap = {};
        const newComentarios: Record<string, string> = {};
        data.forEach(row => {
          newRatings[row.candidatura_id] = { ...(row.notas ?? {}), geral: row.nota_geral ?? 0 };
          newComentarios[row.candidatura_id] = row.comentario ?? '';
        });
        setRatings(prev => ({ ...prev, ...newRatings }));
        setComentarios(prev => ({ ...prev, ...newComentarios }));
        setEnviado(true);
      });
  }, [token]);

  const setRating = (id: string, cat: string, val: number) => {
    if (enviado) return;
    setRatings(prev => ({ ...prev, [id]: { ...prev[id], [cat]: val } }));
  };

  const cats: [string, string][] = [
    ['com','Comunicação'],['prop','Transparência da proposta'],
    ['prazo','Prazo de visita / retorno'],['geral','Impressão geral'],
  ];

  const rankRing = ['#C4780A','#888','#C0392B',C.bd];

  const enviarAvaliacoes = async () => {
    if (salvando || enviado) return;
    setSalvando(true);
    try {
      const rows = empresas.map(e => ({
        orcamento_id:   orcamentoId,
        candidatura_id: e.id,
        rota100_token:  token,
        nota_geral:     ratings[e.id]?.geral || null,
        notas:          { com: ratings[e.id]?.com ?? 0, prop: ratings[e.id]?.prop ?? 0, prazo: ratings[e.id]?.prazo ?? 0 },
        comentario:     comentarios[e.id] || null,
      }));
      await (supabase as any)
        .from('avaliacoes_fornecedor')
        .upsert(rows, { onConflict: 'candidatura_id,rota100_token' });
      setEnviado(true);
      toast.success('Avaliações enviadas! Obrigado pelo feedback.');
    } catch {
      toast.error('Não foi possível salvar as avaliações. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <div className="r100-card" style={{ background: C.am2, borderColor: 'rgba(196,120,10,.2)' }}>
        <div className="r100-card-h"><div className="r100-card-icon" style={{ background: '#fff' }}>⭐</div>Como foi sua experiência? Avalie as empresas</div>
        <p style={{ fontSize: 12, color: C.cz, marginBottom: 18, lineHeight: 1.65 }}>Sua avaliação ajuda a Reforma100 a recomendar os melhores profissionais. Leva menos de 1 minuto.</p>

        {empresas.map(e => (
          <div key={e.id} style={{ padding: '18px', border: `${e.highlight ? '1.5px' : '1px'} solid ${e.highlight ? C.lj : 'rgba(196,120,10,.2)'}`, borderRadius: 14, background: '#fff', marginBottom: 12, boxShadow: e.highlight ? `0 0 0 3px rgba(232,81,10,.07)` : 'none', opacity: enviado ? 0.85 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Avatar initials={e.initials} bg={e.bgColor} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13 }}>{e.nome}</div>
                <div style={{ fontSize: 10, color: C.cz }}>Proposta: {e.valor}</div>
              </div>
              <span style={bdg(C.vd2, C.vd)}>Orçamento enviado</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12, pointerEvents: enviado ? 'none' : 'auto' }}>
              {cats.map(([key, label]) => (
                <div key={key}>
                  <div style={{ fontSize: 9, color: C.cz, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</div>
                  <StarRating value={ratings[e.id]?.[key] ?? 0} onChange={v => setRating(e.id, key, v)} />
                </div>
              ))}
            </div>
            <textarea className="r100-textarea" value={comentarios[e.id]}
              onChange={ev => !enviado && setComentarios(prev => ({ ...prev, [e.id]: ev.target.value }))}
              placeholder={`Comentário sobre a ${e.nome} (opcional)`}
              readOnly={enviado} />
          </div>
        ))}

        {enviado ? (
          <div style={{ padding: '14px 16px', background: C.vd2, border: `1px solid ${C.vd}`, borderRadius: 12, textAlign: 'center', fontSize: 13, color: C.vd, fontWeight: 600 }}>
            ✅ Avaliações enviadas. Obrigado pelo feedback!
          </div>
        ) : (
          <button className="r100-btn r100-btn-primary r100-btn-lg r100-btn-full" style={{ marginTop: 6 }}
            disabled={salvando}
            onClick={enviarAvaliacoes}>
            {salvando ? 'Salvando…' : 'Enviar avaliações →'}
          </button>
        )}
      </div>

      {/* Ranking */}
      <div className="r100-card">
        <div className="r100-card-h"><div className="r100-card-icon" style={{ background: '#FFF5DC' }}>🏆</div>Ranking das empresas nesta obra</div>
        <p style={{ fontSize: 12, color: C.cz, marginBottom: 18, lineHeight: 1.55 }}>Baseado na avaliação de clientes anteriores — não inclui dados internos.</p>
        {ranking.map((r, i) => (
          <div key={r.pos} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: `1px solid rgba(0,0,0,.07)`, borderRadius: 14, marginBottom: 8, background: '#fff', transition: 'all .18s' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: i === 0 ? '#FFF5DC' : i === 1 ? '#F2F2F2' : i === 2 ? C.vm2 : C.fd, border: `1.5px solid ${rankRing[i] ?? C.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: rankRing[i] ?? C.cz, flexShrink: 0 }}>{r.pos}</div>
            <Avatar initials={r.initials} bg={r.bgColor} size={30} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13 }}>{r.nome}</div>
              <div style={{ fontSize: 10, color: C.cz, marginBottom: 4 }}>{r.specs}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Stars filled={r.stars} size={11} />
                <span style={{ fontSize: 10, color: C.cz }}>{r.rating} · {r.obras} obras</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, fontWeight: 400, color: i === 3 ? C.am : C.nv, lineHeight: 1 }}>{r.score}</div>
              <div style={{ fontSize: 9, color: C.cz, marginTop: 2 }}>score</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────────────────
export default function Rota100() {
  useRota100Styles();
  const { token = '' } = useParams<{ token: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('checklist');
  const [compatRequested, setCompatRequested] = useState(false);
  const [compatResult, setCompatResult] = useState<CompatibilizacaoCompleta | null>(null);

  const { data, loading, notFound } = useRota100Data(token);

  // Hook de compatibilização IA — inicializado com orcamentoId quando disponível
  const { solicitarCompatibilizacao } = useCompatibilizacaoIA(data?.orcamentoId ?? '');

  // Busca compat enviada/aprovada para exibir ao cliente (somente leitura, sem alterar lógica de IA)
  useEffect(() => {
    if (!data?.orcamentoId) return;
    (supabase as any)
      .from('compatibilizacoes_analises_ia')
      .select('analise_completa, ranking_ajustado')
      .eq('orcamento_id', data.orcamentoId)
      .in('status', ['enviado', 'aprovado'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data: row }: { data: any }) => {
        if (row?.analise_completa) {
          const ac = row.analise_completa as CompatibilizacaoCompleta;
          setCompatResult({ ...ac, ranking: row.ranking_ajustado ?? ac.ranking });
        }
      });
  }, [data?.orcamentoId]);

  useEffect(() => {
    if (!token) return;
    hasCompatRequest(token).then(setCompatRequested);
  }, [token]);

  const cliente = data?.cliente ?? MOCK_ROTA100.cliente;
  const trilha  = data?.trilha  ?? { ...MOCK_ROTA100.trilha, steps: MOCK_ROTA100.trilha.steps };

  const handleCompatIndividual = async (empresaId: string, empresaNome: string) => {
    try {
      await saveCompatRequest(token, cliente.nome, { orcamentoId: data?.orcamentoId, empresaId, tipo: 'individual' });
      // toast shown by EmpresasTab after reload, where it knows total count
    } catch (err) {
      const msg = (err as any)?.message ?? 'Erro desconhecido';
      toast.error(`Não foi possível registrar a solicitação: ${msg}`);
      throw err;
    }
  };

  const handleCompatCompleta = async () => {
    try {
      await saveCompatRequest(token, cliente.nome, { orcamentoId: data?.orcamentoId, tipo: 'completa' });
      setCompatRequested(true);
      toast.success('Compatibilização completa solicitada. Seu consultor já foi acionado.');
      // Disparo IA — fire-and-forget, não bloqueia UX
      dispararCompatIA();
    } catch (err) {
      const msg = (err as any)?.message ?? 'Erro desconhecido';
      toast.error(`Não foi possível registrar a solicitação: ${msg}`);
      throw err;
    }
  };

  const handleCompatRequest = async () => {
    try {
      await saveCompatRequest(token, cliente.nome, { orcamentoId: data?.orcamentoId, tipo: 'completa' });
      setCompatRequested(true);
      toast.success('Seu consultor já foi acionado. Em breve você receberá o contato com a compatibilização da sua reforma.');
      // Disparo IA — fire-and-forget, não bloqueia UX
      dispararCompatIA();
    } catch (err) {
      const msg = (err as any)?.message ?? 'Erro desconhecido';
      toast.error(`Não foi possível registrar a solicitação: ${msg}`);
    }
  };

  // Dispara análise IA para todas as empresas com proposta enviada (mínimo 2)
  const dispararCompatIA = () => {
    if (!data?.orcamentoId) return;
    const candidaturasIds = (data.empresas ?? [])
      .filter(e => e.propostaEnviada)
      .map(e => e.id);
    if (candidaturasIds.length < 2) return;
    solicitarCompatibilizacao(candidaturasIds).catch(err =>
      console.error('[Rota100] dispararCompatIA:', err)
    );
  };

  const handleDispensa = async (
    candidaturaId: string,
    empresaNome:   string,
    notas:         Record<string, number>,
    justificativa: string,
  ) => {
    if (!data?.orcamentoId) throw new Error('orcamentoId ausente');
    await saveEmpresaDispensa({
      token,
      orcamentoId:        data.orcamentoId,
      candidaturaId,
      empresaNome,
      notaComunicacao:    notas['comunicacao']   ?? null,
      notaPrazo:          notas['prazo']         ?? null,
      notaTransparencia:  notas['transparencia'] ?? null,
      notaGeral:          notas['geral']         ?? null,
      justificativa,
    });
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: 'center', color: '#7A776E' }}>
          <style>{`@keyframes r100Spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #E4E1DB', borderTopColor: '#E8510A', margin: '0 auto 20px', animation: 'r100Spin 1s linear infinite' }} />
          <p style={{ fontSize: 14 }}>Carregando seu painel…</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: '0 24px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#F0EFED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 24px' }}>🔍</div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, color: '#1A2030', marginBottom: 12 }}>Link não encontrado</h2>
          <p style={{ fontSize: 14, color: '#7A776E', lineHeight: 1.7 }}>
            O endereço acessado não é válido ou expirou.<br />Verifique o link enviado pelo seu consultor.
          </p>
        </div>
      </div>
    );
  }

  const tabDefs: { id: Tab; label: string; locked?: boolean }[] = [
    { id: 'checklist',        label: 'Checklist' },
    { id: 'escopo',           label: 'Escopo' },
    { id: 'empresas',         label: 'Empresas' },
    { id: 'compatibilizacao', label: compatResult ? 'Compat. ✓' : 'Compat. 🔒', locked: !compatResult },
    { id: 'marketplace',      label: 'Marketplace' },
    { id: 'avaliacoes',       label: 'Avaliações' },
  ];

  return (
    <div className="r100" style={{ background: C.fd, color: C.nv, minHeight: '100vh', fontSize: 14, lineHeight: 1.6 }}>

      {/* NAV */}
      <nav style={{ background: C.nv, padding: '0 24px', display: 'flex', alignItems: 'center', height: 60, gap: 12, position: 'sticky', top: 0, zIndex: 300, boxShadow: '0 2px 16px rgba(26,32,48,.22)' }}>
        <a href="#" onClick={e => e.preventDefault()} style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 26, height: 26, background: C.lj, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(232,81,10,.4)' }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M2 8C2 4.686 4.686 2 8 2s6 2.686 6 6-2.686 6-6 6-6-2.686-6-6z" fill="white" opacity=".3"/>
              <path d="M8 5v6M5 8h6" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: '#fff', letterSpacing: '.02em' }}>Reforma100</span>
        </a>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: '.05em', background: 'rgba(26,122,74,.25)', color: '#5DCAA5', border: '1px solid rgba(93,202,165,.2)', flexShrink: 0 }}>CLIENTE</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'rgba(255,255,255,.35)', fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cliente.nome}</span>
          <div style={{ width: 64, height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 20, overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ width: `${trilha.percentual}%`, height: '100%', background: C.lj, borderRadius: 20, transition: 'width 1.2s cubic-bezier(.4,0,.2,1)' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.lj, flexShrink: 0 }}>{trilha.percentual}%</span>
        </div>
      </nav>

      {/* HERO */}
      <div className="r100-hero" style={{ background: `linear-gradient(170deg, #141928 0%, ${C.nv} 55%, #1e2c3a 100%)`, padding: '0 24px 0', color: '#fff', overflow: 'hidden', position: 'relative' }}>
        {/* Glow blobs */}
        <div className="r100-hero-glow1" style={{ top: '-80px', right: '-60px' }} />
        <div className="r100-hero-glow2" style={{ bottom: '-120px', left: '-80px' }} />

        {/* Decorative dots */}
        {[
          { top: '18%', left: '12%', size: 3, delay: '0s' },
          { top: '55%', left: '28%', size: 2, delay: '.8s' },
          { top: '30%', left: '62%', size: 4, delay: '1.4s' },
          { top: '72%', left: '75%', size: 2, delay: '.4s' },
          { top: '15%', left: '85%', size: 3, delay: '2s' },
        ].map((d, i) => (
          <div key={i} className="r100-hero-dot" style={{ top: d.top, left: d.left, width: d.size, height: d.size, animationDelay: d.delay }} />
        ))}

        <div className="r100-hero-content" style={{ maxWidth: 820, margin: '0 auto', padding: '36px 0 28px' }}>
          {/* Brand bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <div style={{ width: 32, height: 32, background: C.lj, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 6px rgba(232,81,10,.18), 0 4px 14px rgba(232,81,10,.4)', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8C2 4.686 4.686 2 8 2s6 2.686 6 6-2.686 6-6 6-6-2.686-6-6z" fill="white" opacity=".3"/>
                <path d="M8 5v6M5 8h6" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,.55)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Reforma100 · Painel do cliente</span>
          </div>

          <h1 className="r100-hero-h1 serif" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, fontWeight: 400, marginBottom: 8, lineHeight: 1.2, color: '#fff', letterSpacing: '-.01em' }}>
            {cliente.nome} — {cliente.cidade}
          </h1>
          <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, lineHeight: 1.65, marginBottom: 18 }}>{cliente.imovel} | {cliente.descricao}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {cliente.tags.map((t, i) => (
              <span key={i} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: '5px 13px', fontSize: 11, color: 'rgba(255,255,255,.5)', letterSpacing: '.01em', backdropFilter: 'blur(4px)' }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Animated accent line */}
        <div className="r100-line" style={{ height: 3, background: `linear-gradient(90deg, ${C.lj} 0%, ${C.lj2} 50%, rgba(255,107,53,.2) 100%)`, marginLeft: -24, marginRight: -24 }} />
      </div>

      {/* MAIN CONTENT */}
      <div className="r100-wrap" style={{ maxWidth: 820, margin: '0 auto', padding: '24px 24px 48px' }}>

        {/* TRILHA */}
        <div className="r100-card" style={{ marginTop: 20 }}>
          <div className="r100-card-h" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="r100-card-icon" style={{ background: '#FFF5DC' }}>📍</div>
              Trilha da sua reforma
            </span>
            <span style={{ fontSize: 11, color: C.lj, fontWeight: 700, background: 'rgba(232,81,10,.08)', padding: '3px 10px', borderRadius: 20, border: `1px solid rgba(232,81,10,.15)` }}>
              Dia {trilha.dia} de {trilha.diasMeta}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 12 }}>
            <div className="r100-trilha-num serif" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 56, fontWeight: 400, color: C.lj, lineHeight: 1, letterSpacing: '-.01em' }}>{trilha.percentual}</div>
            <div style={{ paddingBottom: 8 }}>
              <div style={{ fontSize: 13, color: C.cz, fontWeight: 500 }}>% concluído</div>
              <div style={{ fontSize: 11, color: C.lj, fontWeight: 700, marginTop: 2 }}>{trilha.etapaAtual}</div>
            </div>
          </div>

          <div style={{ height: 8, background: C.bd, borderRadius: 20, overflow: 'hidden', marginBottom: 6 }}>
            <div className="r100-bar-fill" style={{ width: `${trilha.percentual}%`, background: `linear-gradient(90deg, ${C.lj}, ${C.lj2})` }} />
          </div>
          <div style={{ fontSize: 11, color: C.cz, marginBottom: 22 }}>Iniciado em {trilha.iniciadoEm} · meta: {trilha.diasMeta} dias</div>

          <div style={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 2 }}>
            {trilha.steps.map((s, i) => {
              const isDone = s.status === 'done';
              const isCur  = s.status === 'current';
              const isLast = i === trilha.steps.length - 1;
              return (
                <Fragment key={i}>
                  <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 52 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, border: `2px solid ${isDone ? C.vd : isCur ? C.lj : C.bd}`, background: isDone ? C.vd : isCur ? C.lj : '#fff', color: isDone || isCur ? '#fff' : C.cz, boxShadow: isCur ? `0 0 0 4px rgba(232,81,10,.14)` : 'none', transition: 'all .3s' }}>
                      {isDone ? '✓' : isCur ? '◉' : i + 1}
                    </div>
                    <div className="r100-step-lbl" style={{ fontSize: 9, color: isDone ? C.vd : isCur ? C.lj : C.cz, fontWeight: isDone ? 600 : isCur ? 700 : 400, letterSpacing: '.01em' }}>{s.label}</div>
                  </div>
                  {!isLast && (
                    <div style={{ flex: 1, height: 2, background: isDone ? C.vd : C.bd, marginTop: 13, minWidth: 6, transition: 'background .4s', borderRadius: 2 }} />
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>

        {/* TABS */}
        <div className="r100-tabs">
          {tabDefs.map(t => {
            const isOn = activeTab === t.id;
            return (
              <button key={t.id} className={`r100-tab${isOn ? ' active' : ''}${t.locked ? ' locked' : ''}`}
                onClick={() => t.locked ? setActiveTab('empresas') : setActiveTab(t.id)}
                title={t.locked ? 'Disponível após aceitar uma proposta' : undefined}>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* PANELS */}
        <div className="r100-panel" key={activeTab}>
          {activeTab === 'checklist'        && <ChecklistTab items={data?.checklist ?? MOCK_ROTA100.checklist} empresas={data?.empresas ?? []} />}
          {activeTab === 'escopo'           && <EscopoTab {...(data?.escopo ?? MOCK_ROTA100.escopo)} />}
          {activeTab === 'empresas'         && <EmpresasTab empresas={data?.empresas ?? MOCK_ROTA100.empresas as any} token={token} tipoAtendimento={data?.tipoAtendimento ?? null} onCompatIndividual={handleCompatIndividual} onCompatCompleta={handleCompatCompleta} onDispensa={handleDispensa} />}
          {activeTab === 'compatibilizacao' && <CompatibilizacaoTab requested={compatRequested} onRequest={handleCompatRequest} onGoToEmpresas={() => setActiveTab('empresas')} compatResult={compatResult} />}
          {activeTab === 'marketplace'      && <MarketplaceTab />}
          {activeTab === 'avaliacoes'       && <AvaliacoesTab empresas={data?.empresas ?? []} token={token} orcamentoId={data?.orcamentoId ?? ''} />}
        </div>

      </div>
    </div>
  );
}
