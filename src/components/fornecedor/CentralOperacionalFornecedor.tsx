import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMeusCandidaturas, CandidaturaOrcamento } from '@/hooks/useMeusCandiaturas';
import { FichaOperacionalFornecedor } from './FichaOperacionalFornecedor';
import { R as I } from '@/styles/tokens';
import { PremiumPageHeader } from '@/components/ui/PremiumPageHeader';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

// ── CSS injection ─────────────────────────────────────────────────────────────
function useCentralStyles() {
  useEffect(() => {
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
      .cop-card-title {
        font-family:'Syne',sans-serif;
        font-weight:700;
        font-size:15px;
        color:#1A2030;
        margin-bottom:4px;
        line-height:1.45;
        display:-webkit-box;
        -webkit-line-clamp:3;
        -webkit-box-orient:vertical;
        overflow:hidden;
      }
      .cop-search-input {
        width:100%;
        padding:11px 38px 11px 38px;
        border-radius:10px;
        border:1.5px solid #E5E7EB;
        font-size:16px; /* ≥16px evita auto-zoom no iOS */
        background:#fff;
        color:#1A2030;
        outline:none;
        box-sizing:border-box;
        font-family:'DM Sans',sans-serif;
        transition:border-color .15s;
        -webkit-appearance:none;
      }
      .cop-search-input:focus { border-color:#2D3395; }
      .cop-search-input::-webkit-search-cancel-button,
      .cop-search-input::-webkit-search-decoration { -webkit-appearance: none; display: none; }
      .cop-search-clear {
        position:absolute; right:8px; top:50%; transform:translateY(-50%);
        width:24px; height:24px;
        background:#F3F4F6; color:#6B7280;
        border:none; border-radius:50%;
        font-size:16px; line-height:1; cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        transition:background .12s, color .12s;
      }
      .cop-search-clear:hover { background:#E5E7EB; color:#1A2030; }
      .cop-filter-chip {
        display:inline-flex; align-items:center; gap:5px;
        padding:5px 10px;
        background:${I.azul3};
        color:${I.azul};
        border:1px solid ${I.azul}33;
        border-radius:999px;
        font-size:11px;
        font-weight:700;
        font-family:'Syne', sans-serif;
        cursor:pointer;
        transition:opacity .12s, transform .12s;
      }
      .cop-filter-chip:hover { opacity:.85; transform:translateY(-1px); }
      .cop-filter-chip-x {
        display:inline-flex; align-items:center; justify-content:center;
        width:14px; height:14px;
        font-size:14px; line-height:1;
        opacity:.7;
      }
      @keyframes cop-skeleton-shimmer {
        0%   { background-position: 100% 0; }
        100% { background-position: -100% 0; }
      }
      @keyframes cop-fade-in {
        0%   { opacity: 0; transform: translateY(-4px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .cop-skeleton {
        background: linear-gradient(90deg, #F3F4F6 0%, #E5E7EB 50%, #F3F4F6 100%);
        background-size: 200% 100%;
        animation: cop-skeleton-shimmer 1.4s ease-in-out infinite;
        border-radius: 4px;
      }
      .cop-kpi-clickable { cursor: pointer; transition: transform .12s, box-shadow .12s; }
      .cop-kpi-clickable:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.10); }
      @keyframes cop-current-halo {
        0%   { transform: scale(1);   opacity: .45; }
        70%  { transform: scale(2.2); opacity: 0;   }
        100% { transform: scale(2.2); opacity: 0;   }
      }
      .cop-current-halo {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        animation: cop-current-halo 1.8s ease-out infinite;
        pointer-events: none;
        z-index: 0;
      }
      .cop-timeline-scroll { scrollbar-width: thin; }
      .cop-timeline-scroll::-webkit-scrollbar { height: 4px; }
      .cop-timeline-scroll::-webkit-scrollbar-track { background: transparent; }
      .cop-timeline-scroll::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 2px; }
      @media(max-width:640px) {
        .cop-kpi-row { grid-template-columns:1fr 1fr !important; gap:10px !important; margin-bottom:20px; }
        .cop-kpi { flex:unset !important; }
        .cop-card-body { padding:16px !important; }
        .cop-meta-row { flex-direction:column !important; gap:6px !important; }
        .cop-action-row { flex-direction:column !important; }
        .cop-btn { width:100%; justify-content:center; }
        .cop-timeline-label { font-size: 8px !important; line-height: 1.15 !important; }
      }
    `;
    document.head.appendChild(s);
  }, []);
}

// ── Stage helpers ─────────────────────────────────────────────────────────────
// Funil oficial Reforma100 (alinhado ao CRM SDR):
// 0 Contato · 1 Visita agendada · 2 Visita realizada · 3 Proposta enviada
// 4 Compatibilização · 5 Fechamento · 6 Obra
type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

function deriveStage(s: string | null): Stage {
  if (!s) return 0;
  if (s === 'visita_agendada' || s === 'reuniao_agendada') return 1;
  if (s === 'visita_realizada' || s === 'reuniao_realizada' || s === 'em_orcamento') return 2;
  if (s === 'orcamento_enviado') return 3;
  // 4 (Compatibilização) e 6 (Obra) ainda não têm status próprio no backend
  if (s === 'negocio_fechado') return 5;
  return 0;
}

function deriveStageColor(s: string | null): string {
  if (!s || s === 'negocio_perdido') return '#9e9e9e';
  if (s === 'negocio_fechado') return I.vd;
  if (s === 'orcamento_enviado') return I.rx;
  if (s === 'em_orcamento') return I.am;
  if (s === 'reuniao_realizada' || s === 'visita_realizada') return I.vd;
  if (s === 'reuniao_agendada') return I.rx;
  if (s === 'visita_agendada') return I.lj;
  return I.azul;
}

// Mapeamento para o dropdown de filtro: inclui negocio_perdido no Fechamento
// (Timeline já trata perdido como linha cinza separada via deriveStage).
function statusToFunilStage(s: string | null): Stage {
  if (!s) return 0;
  if (s === 'visita_agendada' || s === 'reuniao_agendada') return 1;
  if (s === 'visita_realizada' || s === 'reuniao_realizada' || s === 'em_orcamento') return 2;
  if (s === 'orcamento_enviado') return 3;
  if (s === 'negocio_fechado' || s === 'negocio_perdido') return 5;
  return 0;
}

const FUNIL_STAGE_LABELS: Record<Stage, string> = {
  0: 'Contato',
  1: 'Visita agendada',
  2: 'Visita realizada',
  3: 'Proposta enviada',
  4: 'Compatibilização',
  5: 'Fechamento',
  6: 'Obra',
};

type Group = 'urgent' | 'active' | 'done';

function deriveGroup(s: string | null): Group {
  if (s === 'negocio_fechado' || s === 'negocio_perdido') return 'done';
  if (s === 'visita_agendada' || s === 'reuniao_agendada' || s === 'em_orcamento') return 'urgent';
  return 'active';
}

const ATENCAO_POS_ATENDIMENTO_DIAS = 3;

function isAtencaoPosAtendimento(c: CandidaturaOrcamento): boolean {
  const s = c.statusAcompanhamento;
  if (s !== 'visita_realizada' && s !== 'reuniao_realizada') return false;
  if (c.propostaEnviada) return false;
  if (!c.horarioVisitaAgendado) return false;
  const diasDesdeAtendimento =
    (Date.now() - new Date(c.horarioVisitaAgendado).getTime()) / 86_400_000;
  return diasDesdeAtendimento >= ATENCAO_POS_ATENDIMENTO_DIAS;
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
// 7 etapas alinhadas ao funil oficial Reforma100 (CRM SDR)
const STAGES_DEF = [
  { label: 'Contato'           },
  { label: 'Visita agendada'   },
  { label: 'Visita realizada'  },
  { label: 'Proposta enviada'  },
  { label: 'Compatibilização'  },
  { label: 'Fechamento'        },
  { label: 'Obra'              },
];

const STAGE_COLORS_TL = [I.azul, I.lj, I.am, I.rx, I.rx, I.vd, I.vd];

const STAGE_DESCRIPTIONS: Record<Stage, string> = {
  0: 'Aguardando contato inicial com o cliente',
  1: 'Visita ou reunião marcada',
  2: 'Atendimento concluído',
  3: 'Proposta enviada e em análise',
  4: 'Cliente comparando propostas',
  5: 'Negócio fechado',
  6: 'Obra em execução',
};

// Hint operacional para a etapa atual (B5.20+). Não usado em etapas passadas/futuras.
const STAGE_PARA_AVANCAR: Record<Stage, string> = {
  0: 'aguarde o contato inicial da Reforma100',
  1: 'confirme presença e compareça ao atendimento',
  2: 'envie sua proposta comercial',
  3: 'aguarde a análise da Reforma100',
  4: 'aguarde a decisão do cliente na compatibilização',
  5: 'aguarde os próximos passos do contrato',
  6: 'acompanhe a execução da obra',
};

function tempoNaEtapa(dataAtualizacao: Date): string {
  const diff = Date.now() - dataAtualizacao.getTime();
  const horas = diff / 3_600_000;
  const dias  = diff / 86_400_000;
  if (dias >= 1) {
    const d = Math.floor(dias);
    return d === 1 ? 'Nesta etapa há 1 dia' : `Nesta etapa há ${d} dias`;
  }
  if (horas >= 1) {
    const h = Math.floor(horas);
    return h === 1 ? 'Nesta etapa há 1 hora' : `Nesta etapa há ${h} horas`;
  }
  return 'Etapa iniciada há pouco';
}

function Timeline({ activeStage, isReu, dataAtualizacao }: { activeStage: Stage; isReu: boolean; dataAtualizacao?: Date }) {
  return (
    <TooltipProvider delayDuration={120} skipDelayDuration={300}>
      <div
        className="cop-timeline-scroll"
        style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: 16, paddingBottom: 4 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 440 }}>
        {STAGES_DEF.map((st, i) => {
          const done    = i < activeStage;
          const current = i === activeStage;
          // Etapas que ainda não têm sinal no backend (Compatibilização e Obra)
          const aspirational = i === 4 || i === 6;
          const dotClr  = done || current ? STAGE_COLORS_TL[i] : I.bd;
          const stageIdx = i as Stage;
          let label = st.label;
          let descricao = STAGE_DESCRIPTIONS[stageIdx];
          if (isReu && i === 1) { label = 'Reunião agendada';  descricao = 'Reunião online marcada'; }
          if (isReu && i === 2) { label = 'Reunião realizada'; descricao = 'Reunião online concluída'; }
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', cursor: 'help' }}
                >
                  {i > 0 && (
                    <div style={{
                      position: 'absolute', top: 10, left: 0, right: '50%', height: 2,
                      background: i <= activeStage ? STAGE_COLORS_TL[i - 1] : I.bd,
                    }} />
                  )}
                  {i < STAGES_DEF.length - 1 && (
                    <div style={{
                      position: 'absolute', top: 10, left: '50%', right: 0, height: 2,
                      background: i < activeStage ? STAGE_COLORS_TL[i] : I.bd,
                    }} />
                  )}
                  <div style={{ position: 'relative', width: 22, height: 22, zIndex: 1 }}>
                    {current && (
                      <span className="cop-current-halo" style={{ background: dotClr }} aria-hidden />
                    )}
                    <div style={{
                      position: 'relative', zIndex: 1,
                      width: '100%', height: '100%', borderRadius: '50%',
                      background: done || current ? dotClr : I.br,
                      border: `2px solid ${dotClr}`,
                      boxShadow: current ? `0 0 0 3px ${dotClr}55` : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 8, fontWeight: 700,
                      color: done || current ? '#fff' : I.cz,
                      transition: 'all .2s',
                    }}>
                      {done ? '✓' : aspirational && !current ? '·' : current ? '●' : i + 1}
                    </div>
                  </div>
                  <div className="cop-timeline-label" style={{
                    fontSize: 9, fontWeight: current ? 700 : 500, marginTop: current ? 5 : 3, textAlign: 'center',
                    color: current ? dotClr : done ? I.cz : '#9CA3AF',
                    whiteSpace: 'nowrap', lineHeight: 1.2,
                  }}>
                    {label}
                  </div>
                  {current && (
                    <div style={{
                      marginTop: 3,
                      background: dotClr,
                      color: '#fff',
                      fontSize: 8,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 4,
                      letterSpacing: '.05em',
                      textTransform: 'uppercase',
                      fontFamily: "'Syne',sans-serif",
                    }}>
                      Atual
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6} className="max-w-[230px]">
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 12, marginBottom: 2 }}>
                  {label}
                </div>
                <div style={{ fontSize: 11, lineHeight: 1.4 }}>
                  {descricao}
                </div>
                {current && (
                  <>
                    {dataAtualizacao && (
                      <div style={{ fontSize: 10, marginTop: 6, opacity: .8 }}>
                        {tempoNaEtapa(dataAtualizacao)}
                      </div>
                    )}
                    <div style={{ fontSize: 11, marginTop: 4, lineHeight: 1.4, fontWeight: 600 }}>
                      Para avançar: {STAGE_PARA_AVANCAR[stageIdx]}
                    </div>
                  </>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ── Skeleton loading ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="cop-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="cop-skeleton" style={{ width: 90,  height: 14, borderRadius: 999 }} />
        <div className="cop-skeleton" style={{ width: 60,  height: 12 }} />
      </div>
      <div className="cop-skeleton" style={{ width: '85%', height: 16, marginBottom: 8 }} />
      <div className="cop-skeleton" style={{ width: '60%', height: 14, marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, minWidth: 0 }}>
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="cop-skeleton" style={{ width: 18, height: 18, borderRadius: '50%' }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, borderTop: '1px solid #E5E7EB', paddingTop: 12 }}>
        <div className="cop-skeleton" style={{ width: 90,  height: 12 }} />
        <div className="cop-skeleton" style={{ width: 70,  height: 12 }} />
        <div className="cop-skeleton" style={{ width: 60,  height: 12, marginLeft: 'auto' }} />
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div style={{ paddingTop: 4 }}>
      <div className="cop-skeleton" style={{ width: 130, height: 12, marginBottom: 14, opacity: .8 }} />
      {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  borderColor, icon, value, label, sub, onClick, active,
}: {
  borderColor: string; icon: string; value: string | number;
  label: string; sub?: string; onClick?: () => void; active?: boolean;
}) {
  return (
    <div
      className={`cop-kpi${onClick ? ' cop-kpi-clickable' : ''}`}
      role={onClick ? 'button' : undefined}
      aria-pressed={onClick ? !!active : undefined}
      style={{
        borderTopColor: borderColor,
        background: active ? `${borderColor}10` : '#fff',
        boxShadow: active
          ? `0 0 0 2px ${borderColor}, 0 1px 5px rgba(0,0,0,.06)`
          : undefined,
      }}
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

// ── Motivo operacional por status ─────────────────────────────────────────────
function deriveMotivoAcao(c: CandidaturaOrcamento): { label: string; color: string } | null {
  if (isAtencaoPosAtendimento(c)) {
    const dias = Math.floor(
      (Date.now() - new Date(c.horarioVisitaAgendado!).getTime()) / 86_400_000
    );
    return { label: `Anexar proposta — atendimento há ${dias} dia(s)`, color: I.vm };
  }
  const s  = c.statusAcompanhamento;
  const dt = c.horarioVisitaAgendado;
  if (s === 'visita_agendada') {
    if (dt) {
      const h = Math.round((new Date(dt).getTime() - Date.now()) / 3_600_000);
      if (h > 0 && h <= 24) return { label: `Visita hoje às ${fmtTm(dt)}`, color: I.vm };
    }
    return { label: 'Confirmar presença na visita', color: I.am };
  }
  if (s === 'reuniao_agendada') {
    if (dt) {
      const h = Math.round((new Date(dt).getTime() - Date.now()) / 3_600_000);
      if (h > 0 && h <= 24) return { label: `Reunião hoje às ${fmtTm(dt)}`, color: I.vm };
    }
    return { label: 'Entrar na reunião', color: I.rx };
  }
  if (s === 'em_orcamento')     return { label: 'Enviar proposta', color: I.azul };
  if (s === 'orcamento_enviado') return { label: 'Aguardando retorno da Reforma100', color: I.vd };
  if (s === 'visita_realizada' || s === 'reuniao_realizada') return { label: 'Atendimento realizado', color: I.vd };
  if (s === 'negocio_fechado')  return { label: 'Negócio fechado ✓', color: I.vd };
  if (s === 'negocio_perdido')  return { label: 'Processo encerrado', color: I.cz };
  return null;
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
  const isUrgente =
    s === 'visita_agendada' || s === 'reuniao_agendada' || s === 'em_orcamento'
    || isAtencaoPosAtendimento(candidatura);
  const motivo   = deriveMotivoAcao(candidatura);

  return (
    <div
      className="cop-card"
      style={{ borderTop: `4px solid ${stageClr}`, cursor: 'pointer' }}
      onClick={onClick}
    >
      <div className="cop-card-body" style={{ padding: '18px 20px 16px' }}>
        {/* Título + badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
          <div className="cop-card-title" style={{ flex: 1, minWidth: 0 }}>
            {candidatura.necessidade}
          </div>
          <div style={{ flexShrink: 0, paddingTop: 2 }}>
            <StatusBadge status={s} />
          </div>
        </div>

        {/* Próxima ação — bloco explícito */}
        {motivo && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            borderRadius: 8, padding: '9px 12px',
            background: motivo.color + '12',
            borderLeft: `3px solid ${motivo.color}`,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: motivo.color, lineHeight: 1.3 }}>
              {isUrgente ? '⚡ ' : ''}{motivo.label}
            </span>
          </div>
        )}

        {/* Local */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          {candidatura.local && (
            <span style={{ fontSize: 11, color: I.cz }}>📍 {candidatura.local}</span>
          )}
          {candidatura.tamanhoImovel > 0 && (
            <span style={{ fontSize: 11, color: I.cz }}>· {candidatura.tamanhoImovel} m²</span>
          )}
        </div>

        {!isPerdido && <Timeline activeStage={stage} isReu={isReu} dataAtualizacao={candidatura.dataAtualizacao} />}

        {/* Meta row */}
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
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: isUrgente ? I.vm : I.azul }}>
            Ver ficha →
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
type GrupoFiltro = 'todos' | 'urgent' | 'active' | 'done';
type PeriodoFiltro = 'todos' | '7' | '30' | '90';
type Ordem = 'recente' | 'antigo' | 'urgencia';

const ORDEM_NEXT: Record<Ordem, Ordem> = {
  recente:  'urgencia',
  urgencia: 'antigo',
  antigo:   'recente',
};
const ORDEM_LABEL: Record<Ordem, { icon: string; text: string }> = {
  recente:  { icon: '↓', text: 'Mais recente' },
  urgencia: { icon: '⚡', text: 'Urgência' },
  antigo:   { icon: '↑', text: 'Mais antigo' },
};
const GRUPO_PESO: Record<'urgent' | 'active' | 'done', number> = {
  urgent: 0, active: 1, done: 2,
};

export function CentralOperacionalFornecedor() {
  useCentralStyles();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { candidaturas, loading } = useMeusCandidaturas(profile?.id);
  const [repKpi, setRepKpi] = useState<{ media: number; total: number } | null>(null);
  const [fichaAberta, setFichaAberta] = useState<CandidaturaOrcamento | null>(null);

  // B5.18: estado inicial dos filtros lido da URL (?q, ?grupo, ?etapa, ?periodo, ?ordem)
  const [busca, setBusca] = useState(() => searchParams.get('q') ?? '');
  const [grupoFiltro, setGrupoFiltro] = useState<GrupoFiltro>(() => {
    const v = searchParams.get('grupo');
    return (v === 'urgent' || v === 'active' || v === 'done') ? v : 'todos';
  });
  const [funilFiltro, setFunilFiltro] = useState<Stage | 'todos'>(() => {
    const v = searchParams.get('etapa');
    if (v === null) return 'todos';
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 && n <= 6 ? (n as Stage) : 'todos';
  });
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>(() => {
    const v = searchParams.get('periodo');
    return (v === '7' || v === '30' || v === '90') ? v : 'todos';
  });
  const [ordem, setOrdem] = useState<Ordem>(() => {
    const v = searchParams.get('ordem');
    return v === 'antigo' || v === 'urgencia' ? v : 'recente';
  });

  // B5.18: sincronizar filtros → URL preservando view e orc; só escreve quando muda
  useEffect(() => {
    const current = new URLSearchParams(window.location.search);
    const next = new URLSearchParams(current);
    const setOrDel = (k: string, v: string | null) => {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    };
    setOrDel('q',       busca.trim() || null);
    setOrDel('grupo',   grupoFiltro === 'todos' ? null : grupoFiltro);
    setOrDel('etapa',   funilFiltro === 'todos' ? null : String(funilFiltro));
    setOrDel('periodo', periodoFiltro === 'todos' ? null : periodoFiltro);
    setOrDel('ordem',   ordem === 'recente' ? null : ordem);
    if (next.toString() !== current.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [busca, grupoFiltro, funilFiltro, periodoFiltro, ordem, setSearchParams]);

  // Auto-abrir Ficha quando vier via ?orc=<id> (ex.: "Ver na Central" do Disponíveis)
  useEffect(() => {
    const orcId = searchParams.get('orc');
    if (!orcId || loading || candidaturas.length === 0) return;
    const alvo = candidaturas.find(c => c.id === orcId);
    if (alvo) {
      setFichaAberta(alvo);
      // limpar param para não reabrir em re-renders
      const next = new URLSearchParams(searchParams);
      next.delete('orc');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, candidaturas, loading, setSearchParams]);

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

  // Filtragem combinada (afeta apenas a lista, não os KPIs)
  const candidaturasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const cutoffMs = periodoFiltro === 'todos'
      ? 0
      : Date.now() - Number(periodoFiltro) * 86_400_000;

    return candidaturas.filter(c => {
      // Busca textual
      if (q) {
        const local   = (c.local ?? '').toLowerCase();
        const texto   = c.necessidade.toLowerCase();
        const codigo  = c.id.toLowerCase();
        const cliente = (c.dadosContato?.nome ?? '').toLowerCase();
        if (!local.includes(q) && !texto.includes(q) && !codigo.includes(q) && !cliente.includes(q)) {
          return false;
        }
      }
      // Grupo (urgente / em andamento / finalizada)
      if (grupoFiltro !== 'todos') {
        const grupo = deriveGroup(c.statusAcompanhamento);
        const atencao = isAtencaoPosAtendimento(c);
        const grupoEfetivo: GrupoFiltro =
          (grupo === 'urgent' || atencao) ? 'urgent'
          : grupo === 'done' ? 'done'
          : 'active';
        if (grupoEfetivo !== grupoFiltro) return false;
      }
      // Etapa do funil (mapeada a partir do statusAcompanhamento)
      if (funilFiltro !== 'todos' && statusToFunilStage(c.statusAcompanhamento) !== funilFiltro) {
        return false;
      }
      // Período (data da candidatura)
      if (cutoffMs > 0) {
        const dt = c.dataCandidatura instanceof Date
          ? c.dataCandidatura.getTime()
          : new Date(c.dataCandidatura).getTime();
        if (dt < cutoffMs) return false;
      }
      return true;
    });
  }, [candidaturas, busca, grupoFiltro, funilFiltro, periodoFiltro]);

  const candidaturasOrdenadas = useMemo(() => {
    const arr = [...candidaturasFiltradas];
    const toMs = (d: Date | string) =>
      (d instanceof Date ? d.getTime() : new Date(d).getTime());
    arr.sort((a, b) => {
      if (ordem === 'urgencia') {
        const ga = (deriveGroup(a.statusAcompanhamento) === 'urgent' || isAtencaoPosAtendimento(a))
          ? 'urgent' : deriveGroup(a.statusAcompanhamento);
        const gb = (deriveGroup(b.statusAcompanhamento) === 'urgent' || isAtencaoPosAtendimento(b))
          ? 'urgent' : deriveGroup(b.statusAcompanhamento);
        const peso = GRUPO_PESO[ga] - GRUPO_PESO[gb];
        if (peso !== 0) return peso;
        return toMs(b.dataCandidatura) - toMs(a.dataCandidatura);
      }
      const da = toMs(a.dataCandidatura);
      const db = toMs(b.dataCandidatura);
      return ordem === 'recente' ? db - da : da - db;
    });
    return arr;
  }, [candidaturasFiltradas, ordem]);

  const filtrosAtivos = busca.trim() !== ''
    || grupoFiltro !== 'todos'
    || funilFiltro !== 'todos'
    || periodoFiltro !== 'todos';

  // B5.24: contagens absolutas usadas em chips/dropdowns (sobre candidaturas, não filtradas)
  const counts = useMemo(() => {
    const grupos: Record<'urgent' | 'active' | 'done', number> = { urgent: 0, active: 0, done: 0 };
    const stages: Record<Stage, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const periodos: Record<'7' | '30' | '90', number> = { '7': 0, '30': 0, '90': 0 };
    const agora = Date.now();
    candidaturas.forEach(c => {
      const g = deriveGroup(c.statusAcompanhamento);
      const ge: 'urgent' | 'active' | 'done' =
        (g === 'urgent' || isAtencaoPosAtendimento(c)) ? 'urgent'
        : g === 'done' ? 'done'
        : 'active';
      grupos[ge]++;
      stages[statusToFunilStage(c.statusAcompanhamento)]++;
      const ms = c.dataCandidatura instanceof Date
        ? c.dataCandidatura.getTime()
        : new Date(c.dataCandidatura).getTime();
      const dias = (agora - ms) / 86_400_000;
      if (dias <= 7)  periodos['7']++;
      if (dias <= 30) periodos['30']++;
      if (dias <= 90) periodos['90']++;
    });
    return { grupos, stages, periodos };
  }, [candidaturas]);

  // B5.23: chips de filtros ativos (acima da lista, removíveis individualmente)
  const chipsAtivos = useMemo(() => {
    const arr: Array<{ key: string; label: string; clear: () => void }> = [];
    const q = busca.trim();
    if (q) arr.push({ key: 'q', label: `Busca: ${q}`, clear: () => setBusca('') });
    if (grupoFiltro === 'urgent') arr.push({ key: 'grupo', label: 'Requer ação',  clear: () => setGrupoFiltro('todos') });
    if (grupoFiltro === 'active') arr.push({ key: 'grupo', label: 'Em andamento', clear: () => setGrupoFiltro('todos') });
    if (grupoFiltro === 'done')   arr.push({ key: 'grupo', label: 'Finalizadas',  clear: () => setGrupoFiltro('todos') });
    if (funilFiltro !== 'todos') {
      arr.push({
        key: 'etapa',
        label: `Etapa: ${FUNIL_STAGE_LABELS[funilFiltro as Stage]}`,
        clear: () => setFunilFiltro('todos'),
      });
    }
    if (periodoFiltro !== 'todos') {
      arr.push({ key: 'periodo', label: `Últimos ${periodoFiltro} dias`, clear: () => setPeriodoFiltro('todos') });
    }
    if (ordem === 'antigo')   arr.push({ key: 'ordem', label: 'Mais antigo primeiro', clear: () => setOrdem('recente') });
    if (ordem === 'urgencia') arr.push({ key: 'ordem', label: 'Ordem: Urgência',      clear: () => setOrdem('recente') });
    return arr;
  }, [busca, grupoFiltro, funilFiltro, periodoFiltro, ordem]);

  // Grupos (usam lista filtrada e ordenada). B4: pós-atendimento sem proposta há ≥3 dias entra em urgentes.
  const urgentes  = candidaturasOrdenadas.filter(
    c => deriveGroup(c.statusAcompanhamento) === 'urgent' || isAtencaoPosAtendimento(c)
  );
  const ativas    = candidaturasOrdenadas.filter(
    c => deriveGroup(c.statusAcompanhamento) === 'active' && !isAtencaoPosAtendimento(c)
  );
  const finais    = candidaturasOrdenadas.filter(c => deriveGroup(c.statusAcompanhamento) === 'done');

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="cop" style={{ padding: '0 0 40px' }}>

      <FichaOperacionalFornecedor
        candidatura={fichaAberta}
        onClose={() => setFichaAberta(null)}
      />

      {/* Header premium */}
      <PremiumPageHeader
        title={profile?.empresa ?? profile?.nome ?? 'Painel do Parceiro'}
        subtitle="Central Operacional · Reforma100 — acompanhe suas negociações ativas"
      />

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

        {/* KPI cards — clicáveis como atalho de filtro (B5.19) */}
        <div className="cop-kpi-row">
          <KpiCard
            borderColor={urgentes.length > 0 ? I.vm : I.vd}
            icon={urgentes.length > 0 ? '⚡' : '✅'}
            value={urgentes.length}
            label={urgentes.length > 0 ? 'Requerem ação' : 'Tudo em dia'}
            sub={urgentes.length > 0 ? 'Atenção necessária agora' : 'Sem pendências urgentes'}
            active={grupoFiltro === 'urgent'}
            onClick={() => setGrupoFiltro(grupoFiltro === 'urgent' ? 'todos' : 'urgent')}
          />
          <KpiCard
            borderColor={I.azul}
            icon="🤝"
            value={ativas.length}
            label="Em andamento"
            sub={ativas.length === 1 ? '1 negociação ativa' : `${ativas.length} negociações ativas`}
            active={grupoFiltro === 'active'}
            onClick={() => setGrupoFiltro(grupoFiltro === 'active' ? 'todos' : 'active')}
          />
          <KpiCard
            borderColor={I.vd}
            icon="📋"
            value={candidaturas.filter(c => c.statusAcompanhamento === 'orcamento_enviado').length}
            label="Propostas enviadas"
            sub="Aguardando análise"
            active={funilFiltro === 3}
            onClick={() => setFunilFiltro(funilFiltro === 3 ? 'todos' : 3)}
          />
          <KpiCard
            borderColor={repKpi ? I.lj : I.azul}
            icon={repKpi ? '⭐' : '🏅'}
            value={repKpi ? repKpi.media.toFixed(1) : 'Nova'}
            label="Reputação"
            sub={repKpi ? `${repKpi.total} avaliação${repKpi.total !== 1 ? 'ões' : ''}` : 'Complete perfil →'}
          />
        </div>

        {/* Busca + filtros */}
        {!loading && candidaturas.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 15, pointerEvents: 'none', lineHeight: 1,
                }}>🔍</span>
                <input
                  type="search"
                  className="cop-search-input"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar por local, cliente ou código…"
                />
                {busca && (
                  <button
                    type="button"
                    onClick={() => setBusca('')}
                    aria-label="Limpar busca"
                    className="cop-search-clear"
                  >
                    ×
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOrdem(ORDEM_NEXT[ordem])}
                title={`Ordenar por ${ORDEM_LABEL[ordem].text.toLowerCase()} (clique para alternar)`}
                style={{
                  padding: '0 12px',
                  borderRadius: 10,
                  border: `1.5px solid ${ordem === 'urgencia' ? I.vm : I.bd}`,
                  background: ordem === 'urgencia' ? I.vm2 : '#fff',
                  color: ordem === 'urgencia' ? I.vm : I.nv,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Syne',sans-serif",
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>
                  {ORDEM_LABEL[ordem].icon}
                </span>
                {ORDEM_LABEL[ordem].text}
              </button>
            </div>

            {/* Chips de grupo (com contadores B5.24) */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {([
                { v: 'todos',  l: 'Todos',        c: I.azul, n: candidaturas.length         },
                { v: 'urgent', l: 'Requer ação',  c: I.vm,   n: counts.grupos.urgent        },
                { v: 'active', l: 'Em andamento', c: I.azul, n: counts.grupos.active        },
                { v: 'done',   l: 'Finalizadas',  c: I.cz,   n: counts.grupos.done          },
              ] as { v: GrupoFiltro; l: string; c: string; n: number }[]).map(opt => {
                const ativo = grupoFiltro === opt.v;
                return (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setGrupoFiltro(opt.v)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 999,
                      border: `1.5px solid ${ativo ? opt.c : I.bd}`,
                      background: ativo ? opt.c : '#fff',
                      color: ativo ? '#fff' : I.cz,
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: "'Syne',sans-serif",
                      cursor: 'pointer',
                      transition: 'all .15s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    {opt.l}
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 10,
                      background: ativo ? 'rgba(255,255,255,.22)' : I.cz2,
                      color: ativo ? '#fff' : I.cz,
                    }}>
                      {opt.n}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Dropdowns: status detalhado + período */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select
                value={funilFiltro === 'todos' ? 'todos' : String(funilFiltro)}
                onChange={e => {
                  const v = e.target.value;
                  setFunilFiltro(v === 'todos' ? 'todos' : (Number(v) as Stage));
                }}
                style={{
                  flex: '1 1 200px',
                  padding: '9px 10px',
                  borderRadius: 8,
                  border: `1.5px solid ${I.bd}`,
                  background: '#fff',
                  color: I.nv,
                  fontSize: 13,
                  fontFamily: "'DM Sans',sans-serif",
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="todos">Todas as etapas ({candidaturas.length})</option>
                {([0, 1, 2, 3, 4, 5, 6] as Stage[]).map(st => (
                  <option key={st} value={st}>{FUNIL_STAGE_LABELS[st]} ({counts.stages[st]})</option>
                ))}
              </select>
              <select
                value={periodoFiltro}
                onChange={e => setPeriodoFiltro(e.target.value as PeriodoFiltro)}
                style={{
                  flex: '1 1 140px',
                  padding: '9px 10px',
                  borderRadius: 8,
                  border: `1.5px solid ${I.bd}`,
                  background: '#fff',
                  color: I.nv,
                  fontSize: 13,
                  fontFamily: "'DM Sans',sans-serif",
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="todos">Todo o período ({candidaturas.length})</option>
                <option value="7">Últimos 7 dias ({counts.periodos['7']})</option>
                <option value="30">Últimos 30 dias ({counts.periodos['30']})</option>
                <option value="90">Últimos 90 dias ({counts.periodos['90']})</option>
              </select>
              {filtrosAtivos && (
                <button
                  type="button"
                  onClick={() => {
                    setBusca('');
                    setGrupoFiltro('todos');
                    setFunilFiltro('todos');
                    setPeriodoFiltro('todos');
                  }}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: `1.5px solid ${I.bd}`,
                    background: '#fff',
                    color: I.cz,
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "'Syne',sans-serif",
                    cursor: 'pointer',
                  }}
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        )}

        {/* B5.23: chips de filtros ativos — removíveis individualmente */}
        {!loading && chipsAtivos.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {chipsAtivos.map(f => (
              <button
                key={f.key}
                type="button"
                onClick={f.clear}
                aria-label={`Remover filtro: ${f.label}`}
                className="cop-filter-chip"
              >
                {f.label}
                <span className="cop-filter-chip-x">×</span>
              </button>
            ))}
          </div>
        )}

        {/* Sem resultado nos filtros — mensagem contextual por filtro ativo */}
        {!loading && filtrosAtivos && candidaturasFiltradas.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: I.cz, fontSize: 13, lineHeight: 1.5 }}>
            {(() => {
              const q = busca.trim();
              if (q) return <>Nenhum resultado para <strong style={{ color: I.nv }}>“{q}”</strong>.</>;
              if (grupoFiltro === 'urgent') return 'Nenhum processo requer ação agora.';
              if (grupoFiltro === 'active') return 'Nenhum processo em andamento no momento.';
              if (grupoFiltro === 'done')   return 'Nenhum processo finalizado ainda.';
              if (funilFiltro !== 'todos') {
                const msgPorEtapa: Record<Stage, string> = {
                  0: 'Nenhuma candidatura na etapa de contato.',
                  1: 'Nenhum atendimento agendado no momento.',
                  2: 'Nenhum atendimento realizado encontrado.',
                  3: 'Nenhuma proposta enviada encontrada.',
                  4: 'Nenhum processo em compatibilização.',
                  5: 'Nenhum fechamento registrado.',
                  6: 'Nenhuma obra registrada.',
                };
                return msgPorEtapa[funilFiltro as Stage];
              }
              if (periodoFiltro !== 'todos') {
                return `Nenhuma candidatura nos últimos ${periodoFiltro} dias.`;
              }
              return 'Nenhuma candidatura corresponde aos filtros aplicados.';
            })()}
          </div>
        )}

        {/* Loading — skeleton premium (B5.25) */}
        {loading && <SkeletonList />}

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
