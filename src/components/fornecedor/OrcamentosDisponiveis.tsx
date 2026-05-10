import React, { useState, useMemo, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Loader2, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useOrcamentosGlobal, OrcamentoGlobal } from '@/hooks/useOrcamentosGlobal';
import { OrcamentoFilters } from './OrcamentoFilters';
import { InscricaoModal } from './InscricaoModal';
import { AtualizacaoObrigatoriaModal } from './AtualizacaoObrigatoriaModal';
import { PenalidadesAtivas } from './PenalidadesAtivas';
import { useFornecedorInscricao } from '@/hooks/useFornecedorInscricao';
import { useVerificacaoAtualizacaoDiaria, OrcamentoPendente } from '@/hooks/useVerificacaoAtualizacaoDiaria';

// ── Tokens Isabella ───────────────────────────────────────────────────────────
const D = {
  azul:  '#2D3395',
  azul2: '#1E2882',
  azul3: '#eef0ff',
  vd:    '#1B7A4A',
  vd2:   '#e0f5ec',
  lj:    '#F7A226',
  lj2:   '#fff5e6',
  rx:    '#534AB7',
  rx2:   '#ede9ff',
  cz:    '#6B7280',
  cz2:   '#F3F4F6',
  nv:    '#1A2030',
  bd:    '#E5E7EB',
  bg:    '#F4F5FB',
  br:    '#FFFFFF',
} as const;

// ── CSS injection ─────────────────────────────────────────────────────────────
function useDisponivelStyles() {
  useEffect(() => {
    const id = 'disp-styles';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `
      .disp { font-family:'DM Sans',sans-serif; background:${D.bg}; min-height:100vh; }
      .disp-serif { font-family:'DM Serif Display',serif; }
      .disp-syne  { font-family:'Syne',sans-serif; }
      .disp-content { padding:10px 16px 48px; }
      .disp-card {
        background:#fff; border-radius:14px;
        box-shadow:0 1px 6px rgba(0,0,0,.07),0 0 1px rgba(0,0,0,.04);
        padding:16px 18px; margin-bottom:10px;
        transition:box-shadow .18s,transform .18s;
      }
      .disp-card:hover { box-shadow:0 6px 24px rgba(0,0,0,.10),0 1px 4px rgba(0,0,0,.05); transform:translateY(-2px); }
      .disp-chip {
        font-size:10px; font-weight:700; padding:3px 10px;
        border-radius:20px; white-space:nowrap; display:inline-flex;
        align-items:center; gap:4px;
      }
      .disp-chip-horario {
        font-size:11px; font-weight:600; padding:8px 12px;
        border-radius:8px; cursor:pointer; border:1.5px solid ${D.azul}44;
        background:${D.azul3}; color:${D.azul}; min-height:40px;
        transition:background .15s,transform .1s; white-space:nowrap;
      }
      .disp-chip-horario:hover { background:${D.azul}15; transform:scale(1.02); }
      .disp-btn-participar {
        width:100%; padding:14px 0; border-radius:10px;
        background:${D.azul}; color:#fff; border:none;
        font-size:15px; font-weight:700; cursor:pointer;
        min-height:48px; font-family:'Syne',sans-serif;
        transition:opacity .15s,transform .1s; letter-spacing:.02em;
      }
      .disp-btn-participar:hover { opacity:.9; transform:translateY(-1px); }
      .disp-btn-participar:active { transform:translateY(0); }
      .disp-btn-participar:disabled { opacity:.5; cursor:default; transform:none; }
      .disp-sep {
        display:flex; align-items:center; gap:12px; padding:4px 0; margin:4px 0;
      }
      .disp-sep-line { flex:1; height:1px; background:${D.bd}; }
      .disp-sep-label {
        font-size:11px; font-weight:600; color:${D.cz};
        font-family:'Syne',sans-serif; letter-spacing:.06em;
        text-transform:uppercase; white-space:nowrap;
      }
      .disp-load-more {
        width:100%; padding:13px; border-radius:10px;
        border:1.5px solid ${D.bd}; background:${D.br};
        color:${D.cz}; font-size:13px; font-weight:600; cursor:pointer;
        display:flex; align-items:center; justify-content:center; gap:8px;
        transition:background .15s; margin-top:4px; min-height:48px;
      }
      .disp-load-more:hover { background:${D.cz2}; }
      .disp-empty {
        background:${D.br}; border-radius:14px;
        box-shadow:0 1px 6px rgba(0,0,0,.07);
        padding:48px 24px; text-align:center; color:${D.cz};
      }
      @keyframes disp-spin { to { transform:rotate(360deg); } }
      .disp-spinner { animation:disp-spin 1s linear infinite; }
      @keyframes disp-glow-pulse {
        0%,100% { opacity:0.18; transform:scale(1); }
        50%      { opacity:0.40; transform:scale(1.2); }
      }
      @keyframes disp-shine-sweep {
        0%   { transform:translateX(-100%) skewX(-15deg); opacity:0; }
        15%  { opacity:1; }
        85%  { opacity:1; }
        100% { transform:translateX(320%) skewX(-15deg); opacity:0; }
      }
      .disp-header {
        position:relative; overflow:hidden;
        background:linear-gradient(150deg,#1A2030 0%,#252f5a 50%,${D.azul} 100%);
        padding:16px 20px 14px; color:#fff;
      }
      .disp-header-glow {
        position:absolute; width:200px; height:200px; border-radius:50%;
        background:radial-gradient(circle,${D.lj} 0%,transparent 68%);
        opacity:0.18; top:-80px; right:-50px;
        animation:disp-glow-pulse 3.5s ease-in-out infinite; pointer-events:none;
      }
      .disp-header-glow2 {
        position:absolute; width:110px; height:110px; border-radius:50%;
        background:radial-gradient(circle,${D.lj} 0%,transparent 65%);
        opacity:0.11; bottom:-40px; left:22%;
        animation:disp-glow-pulse 4.8s ease-in-out infinite reverse; pointer-events:none;
      }
      .disp-header-shine {
        position:absolute; inset:0;
        background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.05) 50%,transparent 70%);
        animation:disp-shine-sweep 9s ease-in-out infinite; pointer-events:none;
      }
      .disp-header-dots {
        position:absolute; inset:0;
        background-image:radial-gradient(circle,rgba(255,255,255,0.06) 1px,transparent 1px);
        background-size:32px 32px; pointer-events:none;
      }
      .disp-fila-box {
        border-radius:10px; padding:12px 14px; margin-top:8px;
        background:#F3F4F6; border:1.5px solid #E5E7EB;
      }
    `;
    document.head.appendChild(s);
  }, []);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtChip(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
    + ' · '
    + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
}

function fmtInscrito(dt: Date): string {
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ── CardDisponivel ────────────────────────────────────────────────────────────
function CardDisponivel({
  orcamento,
  onOpenModal,
}: {
  orcamento: OrcamentoGlobal;
  onOpenModal: (id: string, horarioId?: string, filaEspera?: boolean) => void;
}) {
  const [showTodos, setShowTodos] = useState(false);

  const horariosLivres = (orcamento.horariosVisita || []).filter(h => !h.fornecedor_id);
  const temHorarios    = horariosLivres.length > 0;
  const aberto         = orcamento.status === 'aberto';
  const inscrito       = orcamento.estaInscrito;

  // Chips visiveis (máx 3, expandível)
  const chipsVisiveis  = showTodos ? horariosLivres : horariosLivres.slice(0, 3);
  const temMaisChips   = horariosLivres.length > 3 && !showTodos;

  const tipoInfo = orcamento.tipoAtendimento === 'presencial'
    ? { label: 'Presencial', bg: D.lj2,  fg: '#9A6200', icon: '📍' }
    : orcamento.tipoAtendimento === 'online'
    ? { label: 'Online',     bg: D.rx2,  fg: D.rx,      icon: '🎥' }
    : null;

  const borderColor = inscrito ? D.vd : aberto ? D.azul : D.cz;

  const descTrunc = orcamento.necessidade.length > 110
    ? orcamento.necessidade.slice(0, 110) + '…'
    : orcamento.necessidade;

  const localTrunc = (orcamento.local || '').length > 45
    ? orcamento.local.slice(0, 45) + '…'
    : orcamento.local;

  return (
    <div className="disp-card" style={{ borderTop: `4px solid ${borderColor}` }}>

      {/* ── Linha de chips superiores ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        {tipoInfo && (
          <span className="disp-chip" style={{ background: tipoInfo.bg, color: tipoInfo.fg }}>
            {tipoInfo.icon} {tipoInfo.label}
          </span>
        )}
        {orcamento.categorias.slice(0, 2).map(c => (
          <span key={c} className="disp-chip" style={{ background: D.azul3, color: D.azul }}>
            {c}
          </span>
        ))}
        {orcamento.categorias.length > 2 && (
          <span style={{ fontSize: 10, color: D.cz }}>+{orcamento.categorias.length - 2}</span>
        )}
        {orcamento.tamanhoImovel > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: D.nv }}>
            {orcamento.tamanhoImovel} m²
          </span>
        )}
      </div>

      {/* ── Local ── */}
      {localTrunc && (
        <div style={{ fontSize: 12, color: D.cz, marginBottom: 7, display: 'flex', alignItems: 'center', gap: 4 }}>
          📍 {localTrunc}
        </div>
      )}

      {/* ── Descrição ── */}
      <div style={{
        fontSize: 14, fontWeight: 600, color: D.nv,
        lineHeight: 1.45, marginBottom: 10,
        fontFamily: "'Syne', sans-serif",
      }}>
        {descTrunc}
      </div>

      {/* ── Prazo + empresas ── */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        {orcamento.prazoInicioTexto && (
          <span style={{ fontSize: 11, color: D.cz }}>⏱ {orcamento.prazoInicioTexto}</span>
        )}
        {orcamento.quantidadeEmpresas > 0 && (
          <span style={{ fontSize: 11, color: D.cz }}>
            👥 {orcamento.quantidadeEmpresas}/{orcamento.quantidadeEmpresas} inscrita(s)
          </span>
        )}
      </div>

      {/* ── Ação ── */}
      {inscrito ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          borderTop: `1px solid ${D.bd}`, paddingTop: 12,
        }}>
          <span style={{
            fontSize: 12, fontWeight: 700, color: D.vd,
            background: D.vd2, padding: '4px 12px', borderRadius: 20,
          }}>
            ✓ Inscrito
          </span>
          {orcamento.inscritoEm && (
            <span style={{ fontSize: 11, color: D.cz }}>
              em {fmtInscrito(orcamento.inscritoEm)}
            </span>
          )}
          <span style={{
            marginLeft: 'auto', fontSize: 11, color: D.azul,
            fontWeight: 600, cursor: 'pointer',
          }}>
            Ver na Central →
          </span>
        </div>
      ) : aberto ? (
        <div>
          {temHorarios && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: D.cz, marginBottom: 8, fontFamily: "'Syne',sans-serif" }}>
                Escolha um horário disponível:
              </div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
                {chipsVisiveis.map(h => (
                  <button
                    key={h.id}
                    className="disp-chip-horario"
                    onClick={() => onOpenModal(orcamento.id, h.id)}
                  >
                    {fmtChip(h.data_hora)}
                  </button>
                ))}
                {temMaisChips && (
                  <button
                    className="disp-chip-horario"
                    style={{ background: D.cz2, color: D.cz, border: `1.5px solid ${D.bd}` }}
                    onClick={() => setShowTodos(true)}
                  >
                    +{horariosLivres.length - 3} mais…
                  </button>
                )}
              </div>
            </div>
          )}
          {temHorarios ? (
            <div className="disp-fila-box">
              <div style={{ fontSize: 11, color: D.cz, lineHeight: 1.55, marginBottom: 10 }}>
                Você entrará na fila de espera caso uma empresa falte, desista ou não confirme.
              </div>
              <button
                className="disp-btn-participar"
                style={{ background: D.cz, fontSize: 13 }}
                onClick={() => onOpenModal(orcamento.id, undefined, true)}
              >
                Entrar na fila de espera
              </button>
            </div>
          ) : (
            <button
              className="disp-btn-participar"
              onClick={() => onOpenModal(orcamento.id)}
            >
              Participar
            </button>
          )}
        </div>
      ) : (
        <div style={{
          borderTop: `1px solid ${D.bd}`, paddingTop: 10,
          fontSize: 11, color: D.cz,
        }}>
          Orçamento encerrado — novas inscrições não disponíveis
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export const OrcamentosDisponiveis: React.FC = () => {
  useDisponivelStyles();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { verificar, marcarDiaComoAtualizado } = useVerificacaoAtualizacaoDiaria();

  const [filtros, setFiltros] = useState({
    local: '', categoria: '', prazoInicio: '',
    metragemMin: '', metragemMax: '', dataInicio: '',
    dataFim: '', ordenacao: 'recentes',
  });

  const {
    orcamentos, loading, loadingMais, recarregar,
    carregarMaisFechados, diasFechados, podeCarregarMais,
  } = useOrcamentosGlobal();

  const { inscreverFornecedor } = useFornecedorInscricao(recarregar);

  const [selectedOrcamento,     setSelectedOrcamento]     = useState<string>('');
  const [selectedHorarioVisitaId, setSelectedHorarioVisitaId] = useState<string | undefined>(undefined);
  const [isFilaEspera,          setIsFilaEspera]          = useState(false);
  const [isOpen,       setIsOpen]       = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showAtualizacaoModal,    setShowAtualizacaoModal]    = useState(false);
  const [pendenciasAtualizacao,   setPendenciasAtualizacao]   = useState<OrcamentoPendente[]>([]);
  const [orcamentoDesejado,       setOrcamentoDesejado]       = useState<string | null>(null);
  const [podeUsarConfirmacaoRapida, setPodeUsarConfirmacaoRapida] = useState(true);
  const [diasConsecutivos,        setDiasConsecutivos]        = useState(0);
  const [formData, setFormData] = useState({ nome: '', email: '', telefone: '', empresa: '' });

  // ── Filtros ───────────────────────────────────────────────────────────────
  const obterPrioridadePrazo = (prazo: string | Date) => {
    if (typeof prazo !== 'string') return 999;
    const p: Record<string, number> = {
      'Imediatamente': 1, 'Em até 1 semana': 2, 'Em até 1 mês': 3,
      'Em até 3 meses': 4, 'Em até 6 meses': 5, 'Flexível': 6,
    };
    return p[prazo] ?? 999;
  };

  const orcamentosFiltrados = useMemo(() => {
    let f = orcamentos.filter(o => {
      if (filtros.categoria   && filtros.categoria   !== 'todas' && !o.categorias.includes(filtros.categoria))             return false;
      if (filtros.prazoInicio && filtros.prazoInicio !== 'todos' && o.prazoInicioTexto !== filtros.prazoInicio)             return false;
      if (filtros.local       && !o.local.toLowerCase().includes(filtros.local.toLowerCase()))                             return false;
      if (filtros.metragemMin && o.tamanhoImovel < parseInt(filtros.metragemMin))                                          return false;
      if (filtros.metragemMax && o.tamanhoImovel > parseInt(filtros.metragemMax))                                          return false;
      if (filtros.dataInicio  && o.dataPublicacao < new Date(filtros.dataInicio))                                          return false;
      if (filtros.dataFim     && o.dataPublicacao > new Date(filtros.dataFim))                                             return false;
      return true;
    });
    switch (filtros.ordenacao) {
      case 'antigos':        f.sort((a, b) => a.dataPublicacao.getTime() - b.dataPublicacao.getTime()); break;
      case 'prazo_urgente':  f.sort((a, b) => obterPrioridadePrazo(a.dataInicio) - obterPrioridadePrazo(b.dataInicio)); break;
      case 'maior_metragem': f.sort((a, b) => b.tamanhoImovel - a.tamanhoImovel); break;
      case 'menor_metragem': f.sort((a, b) => a.tamanhoImovel - b.tamanhoImovel); break;
      default:
        f.sort((a, b) => {
          if (a.status !== b.status) return a.status === 'aberto' ? -1 : 1;
          return b.dataPublicacao.getTime() - a.dataPublicacao.getTime();
        });
    }
    return f;
  }, [orcamentos, filtros]);

  const orcamentosAbertos  = useMemo(() => orcamentosFiltrados.filter(o => o.status === 'aberto'),  [orcamentosFiltrados]);
  const orcamentosFechados = useMemo(() => orcamentosFiltrados.filter(o => o.status === 'fechado'), [orcamentosFiltrados]);

  const handleFiltroChange  = (field: string, value: string) => setFiltros(prev => ({ ...prev, [field]: value }));
  const handleLimparFiltros = () => setFiltros({ local: '', categoria: '', prazoInicio: '', metragemMin: '', metragemMax: '', dataInicio: '', dataFim: '', ordenacao: 'recentes' });
  const contarFiltrosAtivos = () => Object.entries(filtros).filter(([k, v]) => v && k !== 'ordenacao' && v !== 'recentes').length;

  // ── Inscrição ────────────────────────────────────────────────────────────
  const procederComInscricao = (orcamentoId: string, horarioVisitaId?: string, filaEspera?: boolean) => {
    setSelectedOrcamento(orcamentoId);
    setSelectedHorarioVisitaId(horarioVisitaId);
    setIsFilaEspera(filaEspera ?? false);
    if (profile) setFormData({ nome: profile.nome || '', email: profile.email || '', telefone: profile.telefone || '', empresa: profile.empresa || '' });
    setIsOpen(true);
  };

  const openModal = async (orcamentoId: string, horarioVisitaId?: string, filaEspera?: boolean) => {
    if (!user) { procederComInscricao(orcamentoId, horarioVisitaId, filaEspera); return; }
    try {
      const resultado = await verificar(user.id);
      if (resultado.jaAtualizou) { procederComInscricao(orcamentoId, horarioVisitaId, filaEspera); return; }
      if (resultado.pendencias.length === 0) {
        await marcarDiaComoAtualizado(user.id, 'individual');
        procederComInscricao(orcamentoId, horarioVisitaId, filaEspera);
        return;
      }
      setOrcamentoDesejado(orcamentoId);
      setSelectedHorarioVisitaId(horarioVisitaId);
      setIsFilaEspera(filaEspera ?? false);
      setPendenciasAtualizacao(resultado.pendencias);
      setPodeUsarConfirmacaoRapida(resultado.podeUsarConfirmacaoRapida);
      setDiasConsecutivos(resultado.diasConsecutivos);
      setShowAtualizacaoModal(true);
    } catch {
      procederComInscricao(orcamentoId, horarioVisitaId, filaEspera);
    }
  };

  const handleInscricao = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const sucesso = await inscreverFornecedor(selectedOrcamento, formData, selectedHorarioVisitaId);
      if (sucesso) {
        setFormData({ nome: '', email: '', telefone: '', empresa: '' });
        setIsOpen(false);
        // Após inscrição bem-sucedida → ir para Central Operacional
        setTimeout(() => navigate('/dashboard?view=central'), 300);
      }
    } catch { /* silent */ } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmacaoRapida = async () => {
    if (!user) return;
    const sucesso = await marcarDiaComoAtualizado(user.id, 'rapida');
    if (sucesso && orcamentoDesejado) { setShowAtualizacaoModal(false); procederComInscricao(orcamentoDesejado, selectedHorarioVisitaId); }
  };

  const handleConcluirAtualizacao = async () => {
    if (!user) return;
    await marcarDiaComoAtualizado(user.id, 'individual');
    if (orcamentoDesejado) { setShowAtualizacaoModal(false); procederComInscricao(orcamentoDesejado, selectedHorarioVisitaId); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="disp">

      {/* Header animado Isabella */}
      <div className="disp-header">
        <div className="disp-header-dots" />
        <div className="disp-header-glow" />
        <div className="disp-header-glow2" />
        <div className="disp-header-shine" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="disp-syne" style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: D.lj, opacity: .85, marginBottom: 5 }}>
            Reforma100 · Oportunidades
          </div>
          <div className="disp-syne" style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.25, marginBottom: 10, letterSpacing: '-.2px' }}>
            Orçamentos Disponíveis
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
            {!loading && (
              <>
                <span style={{ fontSize: 11, background: 'rgba(255,255,255,.18)', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                  {orcamentosAbertos.length} abertos
                </span>
                {orcamentosFechados.length > 0 && (
                  <span style={{ fontSize: 11, background: 'rgba(255,255,255,.1)', padding: '3px 10px', borderRadius: 20, color: 'rgba(255,255,255,.7)' }}>
                    {orcamentosFechados.length} fechados
                  </span>
                )}
                <span style={{ fontSize: 10, opacity: .5 }}>últimos {diasFechados} dias</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="disp-content">

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '56px 0', color: D.cz }}>
            <Loader2 className="disp-spinner" style={{ width: 28, height: 28, margin: '0 auto 10px', display: 'block' }} />
            <div style={{ fontSize: 13 }}>Carregando oportunidades…</div>
          </div>
        )}

        {!loading && (
          <>
            <PenalidadesAtivas />

            <div style={{ marginBottom: 10 }}>
              <OrcamentoFilters
                filtros={filtros}
                onFiltroChange={handleFiltroChange}
                onLimparFiltros={handleLimparFiltros}
                filtrosAtivos={contarFiltrosAtivos()}
              />
            </div>

            {orcamentosFiltrados.length === 0 ? (
              <div className="disp-empty">
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                <div style={{ fontWeight: 700, color: D.nv, fontSize: 15, marginBottom: 6, fontFamily: "'Syne',sans-serif" }}>
                  Nenhum orçamento encontrado
                </div>
                <div style={{ fontSize: 13 }}>Ajuste os filtros para ver mais resultados.</div>
              </div>
            ) : (
              <Dialog open={isOpen} onOpenChange={setIsOpen}>

                {/* Abertos */}
                {orcamentosAbertos.map(o => (
                  <CardDisponivel key={o.id} orcamento={o} onOpenModal={openModal} />
                ))}

                {/* Separador fechados */}
                {orcamentosFechados.length > 0 && (
                  <div className="disp-sep">
                    <div className="disp-sep-line" />
                    <span className="disp-sep-label">Encerrados · últimos {diasFechados} dias</span>
                    <div className="disp-sep-line" />
                  </div>
                )}

                {/* Fechados */}
                {orcamentosFechados.map(o => (
                  <CardDisponivel key={o.id} orcamento={o} onOpenModal={openModal} />
                ))}

                {/* Carregar mais */}
                {podeCarregarMais && (
                  <button className="disp-load-more" onClick={carregarMaisFechados} disabled={loadingMais}>
                    {loadingMais
                      ? <><Loader2 className="disp-spinner" style={{ width: 14, height: 14 }} /> Carregando…</>
                      : <><ChevronDown style={{ width: 14, height: 14 }} /> Carregar mais encerrados</>
                    }
                  </button>
                )}

                <InscricaoModal
                  isOpen={isOpen}
                  onOpenChange={setIsOpen}
                  formData={formData}
                  onFormDataChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
                  onSubmit={handleInscricao}
                  isSubmitting={isSubmitting}
                  hasProfile={!!profile}
                  isFilaEspera={isFilaEspera}
                  horarioSelecionado={selectedHorarioVisitaId ? (() => {
                    const orc = orcamentos.find(o => o.id === selectedOrcamento);
                    const hor = orc?.horariosVisita?.find((h: any) => h.id === selectedHorarioVisitaId);
                    return hor ? { id: hor.id, data_hora: hor.data_hora } : null;
                  })() : null}
                />
              </Dialog>
            )}
          </>
        )}
      </div>

      <AtualizacaoObrigatoriaModal
        isOpen={showAtualizacaoModal}
        onOpenChange={setShowAtualizacaoModal}
        pendencias={pendenciasAtualizacao}
        podeUsarConfirmacaoRapida={podeUsarConfirmacaoRapida}
        diasConsecutivos={diasConsecutivos}
        onConfirmacaoRapida={handleConfirmacaoRapida}
        onConcluir={handleConcluirAtualizacao}
        recarregarOrcamentos={recarregar}
        onStatusUpdated={(inscricaoId, novoStatus) =>
          setPendenciasAtualizacao(prev =>
            prev.map(p => p.inscricao_id === inscricaoId ? { ...p, status_acompanhamento: novoStatus } : p)
          )
        }
      />
    </div>
  );
};
