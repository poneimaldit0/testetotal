import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isFullAccess } from '@/utils/accessControl';
import { useGerarEstimativaIA } from '@/hooks/useGerarEstimativaIA';
import { sortLeads, SORT_LABELS } from '@/utils/sortLeads';
import type { SortMode, SortDir } from '@/utils/sortLeads';
import type { OrcamentoCRMComChecklist, EtapaCRM, StatusContato } from '@/types/crm';
import { PremiumPageHeader } from '@/components/ui/PremiumPageHeader';
import { QuadroAvisos, type Aviso } from '@/components/admin/QuadroAvisos';

// Tokens Isabella mapeados para variáveis locais
const C = {
  NV:      '#1A2030',
  NV2:     '#1A2E42',
  LJ:      '#E08B00',  // amber — stale badges, progress bar
  FD:      '#F4F5FB',
  BD:      '#E5E7EB',
  CZ:      '#6B7280',
  text:    '#1A2030',
  white:   '#FFFFFF',
  green:   '#1B7A4A',
  greenBg: '#e0f5ec',
  blue:    '#2D3395',
  blueBg:  '#eef0ff',
};

// ─── Progress calculation ────────────────────────────────────────────────────

function calcProgress(
  etapa: EtapaCRM | string,
  statusContato: StatusContato | string,
  fornecedores: number,
  propostas: number,
): number {
  void fornecedores;

  if (etapa === 'ganho') return 100;
  if (etapa === 'perdido') return 0;
  if (etapa === 'pos_venda_feedback') return 97;
  if (etapa === 'fechamento_contrato') return 90;
  if (etapa === 'compatibilizacao') return 80;

  const status = statusContato as string;
  const isRealizada =
    statusContato === 'visita_realizada' || status === 'reuniao_realizada';
  const isAgendada =
    statusContato === 'visita_agendada' || status === 'reuniao_agendada';

  let pct = 5;

  if (etapa === 'propostas_enviadas' || etapa === 'em_orcamento') {
    pct = 50;
    if (propostas >= 2) pct = 70;
    else if (propostas === 1) pct = 60;
    else if (isRealizada) pct = 40;
  } else if (etapa === 'contato_agendamento') {
    if (isRealizada) pct = 40;
    else if (isAgendada) pct = 20;
    else if (statusContato === 'em_contato') pct = 10;
    else pct = 5;
  }

  if (isRealizada && pct < 40) pct = 40;
  if (propostas >= 2 && pct < 70) pct = 70;
  else if (propostas >= 1 && pct < 60) pct = 60;

  return pct;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function startOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

function fmtBRL(val: number): string {
  if (val >= 1_000_000)
    return `R$ ${(val / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (val >= 1_000)
    return `R$ ${(val / 1_000).toFixed(0)}k`;
  return `R$ ${val.toFixed(0)}`;
}

// Regra de carteira:
//   1º fonte: valor_estimado_ia_medio (estimativa IA aprovada)
//   2º fonte: valor_lead_estimado (fallback temporário enquanto IA não foi gerada)
// Leads sem nenhum dos dois contribuem 0 e são contados em semEstimativaIA.
function getValorParaCarteira(lead: OrcamentoCRMComChecklist): number {
  return lead.valor_estimado_ia_medio ?? lead.valor_lead_estimado ?? 0;
}

function hasEstimativaIA(lead: OrcamentoCRMComChecklist): boolean {
  return typeof lead.valor_estimado_ia_medio === 'number' && lead.valor_estimado_ia_medio > 0;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  value,
  label,
  sub,
  highlight,
  loading,
  icon,
}: {
  value: string | number;
  label: string;
  sub?: string;
  highlight?: boolean;
  loading?: boolean;
  icon?: string;
}) {
  return (
    <div style={{
      background:   C.white,
      borderRadius: 12,
      padding:      '20px 22px',
      border:       `1px solid ${C.BD}`,
      borderTop:    `3px solid ${highlight ? C.blue : C.BD}`,
      boxShadow:    highlight
        ? '0 2px 12px rgba(45,51,149,0.12)'
        : '0 1px 4px rgba(0,0,0,0.06)',
      display:       'flex',
      flexDirection: 'column',
      gap:           6,
    }}>
      {icon && (
        <span style={{ fontSize: 20, marginBottom: 2 }}>{icon}</span>
      )}
      {loading ? (
        <div style={{
          width: 70, height: 38,
          background:   C.BD,
          borderRadius: 6,
        }} />
      ) : (
        <div style={{
          fontFamily:   '"Syne", sans-serif',
          fontWeight:   800,
          fontSize:     34,
          lineHeight:   1,
          color:        highlight ? C.blue : C.NV,
          letterSpacing: '-1px',
        }}>
          {value}
        </div>
      )}
      <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: C.CZ }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ pct, ganho }: { pct: number; ganho?: boolean }) {
  const color = ganho ? C.green : pct >= 85 ? C.blue : C.LJ;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 7, background: '#E8EBF4', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width:  `${pct}%`,
          background:    color,
          borderRadius:  6,
          transition:    'width 0.5s ease',
        }} />
      </div>
      <span style={{ fontSize: 11, fontFamily: '"Syne", sans-serif', fontWeight: 700, color, minWidth: 30, textAlign: 'right' }}>
        {pct}%
      </span>
    </div>
  );
}

function Rota100Badge({ token, statusContato }: { token?: string | null; statusContato: string }) {
  const hasPendingVisit = statusContato === 'visita_agendada';
  if (!token) {
    return (
      <span style={{ fontSize: 11, color: C.CZ, background: C.FD, border: `1px solid ${C.BD}`, borderRadius: 5, padding: '2px 7px' }}>
        Sem Rota100
      </span>
    );
  }
  return (
    <a
      href={`/rota100/${token}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display:       'inline-flex',
        alignItems:    'center',
        gap:           4,
        fontSize:      11,
        fontWeight:    600,
        color:         hasPendingVisit ? C.LJ : C.green,
        background:    hasPendingVisit ? '#FFF0E8' : C.greenBg,
        border:        `1px solid ${hasPendingVisit ? C.LJ : C.green}44`,
        borderRadius:  5,
        padding:       '2px 8px',
        textDecoration: 'none',
      }}
      onClick={e => e.stopPropagation()}
    >
      {hasPendingVisit ? '📅 Visita pendente' : '✅ Rota100 ativa'}
    </a>
  );
}

function PendenciasBadges({
  tarefasAtrasadas,
  checklistPendentes,
  congelado,
  temAlertas,
}: {
  tarefasAtrasadas: number;
  checklistPendentes: number;
  congelado: boolean;
  temAlertas: boolean;
}) {
  const items: { label: string; clr: string; bg: string }[] = [];
  if (congelado) items.push({ label: '❄️ Congelado', clr: C.blue, bg: C.blueBg });
  if (tarefasAtrasadas > 0) items.push({ label: `⚠️ ${tarefasAtrasadas} tarefa${tarefasAtrasadas > 1 ? 's' : ''} atrasada${tarefasAtrasadas > 1 ? 's' : ''}`, clr: '#9A3A00', bg: '#FFF0E0' });
  if (checklistPendentes > 0) items.push({ label: `📋 ${checklistPendentes} checklist`, clr: C.CZ, bg: C.FD });
  if (items.length === 0) return <span style={{ fontSize: 11, color: C.CZ }}>—</span>;
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {items.map(item => (
        <span key={item.label} style={{
          fontSize: 11, fontWeight: 600, color: item.clr,
          background: item.bg, border: `1px solid ${item.clr}33`,
          borderRadius: 5, padding: '2px 7px',
        }}>
          {item.label}
        </span>
      ))}
    </div>
  );
}

const ETAPA_LABEL: Record<string, string> = {
  orcamento_postado:    'Novo',
  contato_agendamento:  'Contato',
  em_orcamento:         'Agendar compat.',
  propostas_enviadas:   'Agendar compat.',
  compatibilizacao:     'Compat. realizada',
  fechamento_contrato:  'Grupo criado',
  pos_venda_feedback:   'Contrato',
  ganho:                'Fechado ✓',
  perdido:              'Perdido',
};

const ETAPA_CLR: Record<string, { clr: string; bg: string }> = {
  orcamento_postado:    { clr: C.blue,    bg: C.blueBg  },
  contato_agendamento:  { clr: '#9A6200', bg: '#FFF5DC' },
  em_orcamento:         { clr: '#E08B00', bg: '#fff3cd' },
  propostas_enviadas:   { clr: '#534AB7', bg: '#ede9ff' },
  compatibilizacao:     { clr: C.green,   bg: C.greenBg },
  fechamento_contrato:  { clr: C.NV,      bg: '#E8EEF5' },
  pos_venda_feedback:   { clr: C.green,   bg: C.greenBg },
  ganho:                { clr: C.green,   bg: C.greenBg },
  perdido:              { clr: C.CZ,      bg: C.FD      },
};

// ─── Consultor filter ─────────────────────────────────────────────────────────

interface ConsultorOption { id: string; nome: string }

// ─── Main component ───────────────────────────────────────────────────────────

export function DashboardOperacional() {
  const { profile } = useAuth();

  const userRole  = profile?.tipo_usuario ?? '';
  const userId    = profile?.id ?? '';
  const isAdmin   = isFullAccess(userRole);   // single source of truth for full-access bypass
  const isGestor  = !isAdmin && userRole === 'gestor_conta';

  // IA bulk generation
  const { gerando: gerandoIA, progresso: progressoIA, dispararBatch } = useGerarEstimativaIA();

  // Filter state (admin/master only)
  const [filtroConsultor, setFiltroConsultor] = useState<string>('');
  const [consultores, setConsultores]         = useState<ConsultorOption[]>([]);

  // Data
  const [leads, setLeads]                 = useState<OrcamentoCRMComChecklist[]>([]);
  const [leadsLoading, setLeadsLoading]   = useState(true);
  const [compatStats, setCompatStats]     = useState({ agendadas: 0, realizadas: 0 });
  const [compatLoading, setCompatLoading] = useState(true);
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [busca, setBusca]                 = useState('');
  const [sortMode, setSortMode]           = useState<SortMode>('relevancia');
  const [sortDir, setSortDir]             = useState<SortDir>('desc');

  // ── Fetch consultores (admin/master only) ──────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from('view_orcamentos_crm_com_checklist')
      .select('concierge_responsavel_id, concierge_nome')
      .not('concierge_responsavel_id', 'is', null)
      .not('concierge_nome', 'is', null)
      .then(({ data }) => {
        if (!data) return;
        const map = new Map<string, string>();
        data.forEach(r => {
          if (r.concierge_responsavel_id && r.concierge_nome)
            map.set(r.concierge_responsavel_id, r.concierge_nome);
        });
        setConsultores(Array.from(map.entries()).map(([id, nome]) => ({ id, nome })));
      });
  }, [isAdmin]);

  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Fetch leads ────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    if (!profile) return;
    setLeadsLoading(true);
    setFetchError(null);
    try {
      let q = supabase
        .from('view_orcamentos_crm_com_checklist')
        .select('*')
        .not('etapa_crm', 'eq', 'perdido')
        .order('updated_at', { ascending: false })
        .limit(80);

      if (isGestor && userId) {
        q = q.eq('concierge_responsavel_id', userId);
      } else if (isAdmin && filtroConsultor) {
        q = q.eq('concierge_responsavel_id', filtroConsultor);
      }

      const { data, error } = await q;
      if (error) throw error;
      setLeads((data || []) as unknown as OrcamentoCRMComChecklist[]);
    } catch (e) {
      console.error('DashboardOperacional fetchLeads:', e);
      setFetchError('Erro ao carregar leads. Verifique sua conexão e tente novamente.');
    } finally {
      setLeadsLoading(false);
    }
  }, [profile, isAdmin, isGestor, userId, filtroConsultor]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // ── Fetch compat stats ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    const weekStart = startOfWeek();

    async function fetchCompat() {
      setCompatLoading(true);
      try {
        let baseIds: string[] | null = null;

        if (isGestor && userId) {
          // Need orcamento IDs for this consultor
          const { data: ids } = await supabase
            .from('view_orcamentos_crm_com_checklist')
            .select('id')
            .eq('concierge_responsavel_id', userId);
          baseIds = (ids || []).map(r => r.id);
        } else if (isAdmin && filtroConsultor) {
          const { data: ids } = await supabase
            .from('view_orcamentos_crm_com_checklist')
            .select('id')
            .eq('concierge_responsavel_id', filtroConsultor);
          baseIds = (ids || []).map(r => r.id);
        }

        const agendadasQ = supabase
          .from('compatibilizacoes_analises_ia')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', weekStart);

        const realizadasQ = supabase
          .from('compatibilizacoes_analises_ia')
          .select('id', { count: 'exact', head: true })
          .gte('updated_at', weekStart)
          .in('status', ['completed', 'aprovado', 'enviado']);

        const [{ count: ag }, { count: re }] = await Promise.all([agendadasQ, realizadasQ]);

        // If filtered by consultor, apply orcamento_id filter
        if (baseIds !== null && baseIds.length > 0) {
          const agFilt = await supabase
            .from('compatibilizacoes_analises_ia')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', weekStart)
            .in('orcamento_id', baseIds);
          const reFilt = await supabase
            .from('compatibilizacoes_analises_ia')
            .select('id', { count: 'exact', head: true })
            .gte('updated_at', weekStart)
            .in('status', ['completed', 'aprovado', 'enviado'])
            .in('orcamento_id', baseIds);
          setCompatStats({ agendadas: agFilt.count ?? 0, realizadas: reFilt.count ?? 0 });
        } else if (baseIds === null) {
          setCompatStats({ agendadas: ag ?? 0, realizadas: re ?? 0 });
        } else {
          setCompatStats({ agendadas: 0, realizadas: 0 });
        }
      } catch (e) {
        console.error('DashboardOperacional compat stats:', e);
      } finally {
        setCompatLoading(false);
      }
    }
    fetchCompat();
  }, [profile, isAdmin, isGestor, userId, filtroConsultor]);

  // ── Derived metrics ────────────────────────────────────────────────────────
  // Carteira ativa: leads que NÃO são ganho nem perdido
  // (perdido já excluído na query; ganho está no resultado mas filtrado aqui)
  // Congelados ENTRAM na carteira — só aparecem com badge ❄️
  const leadsAtivosParaCarteira = leads.filter(l => l.etapa_crm !== 'ganho');

  const valorCarteira = leadsAtivosParaCarteira.reduce(
    (sum, l) => sum + getValorParaCarteira(l), 0
  );

  // Leads ativos sem estimativa IA gerada (usam fallback valor_lead_estimado ou 0)
  const semEstimativaIA = leadsAtivosParaCarteira.filter(l => !hasEstimativaIA(l)).length;

  // Ganhos: apenas para o card "Total fechado" do admin
  const valorFechado = leads
    .filter(l => l.etapa_crm === 'ganho')
    .reduce((sum, l) => sum + getValorParaCarteira(l), 0);

  const fechamentosCount = leads.filter(l => l.etapa_crm === 'ganho').length;

  const leadsStale = leads.filter(l => l.tempo_na_etapa_dias >= 8 && l.etapa_crm !== 'ganho').length;

  // ── Search + Sort ────────────────────────────────────────────────────────────
  const leadsMatch = busca
    ? leads.filter(l => {
        const term = busca.toLowerCase();
        return (
          (l.necessidade || '').toLowerCase().includes(term) ||
          (l.local || '').toLowerCase().includes(term) ||
          (l.dados_contato?.nome || '').toLowerCase().includes(term) ||
          (l.codigo_orcamento || '').includes(busca)
        );
      })
    : leads;

  const leadsFiltrados = sortLeads(leadsMatch, sortMode, sortDir);

  const activeLeads = leadsFiltrados.filter(l => l.etapa_crm !== 'ganho');
  const closedLeads = leadsFiltrados.filter(l => l.etapa_crm === 'ganho');

  // Avisos operacionais — usa contadores já calculados.
  const avisosOperacionais: Aviso[] = useMemo(() => {
    const list: Aviso[] = [];
    if (leadsStale > 0) list.push({
      id: 'leads-parados',
      tom: 'amber',
      icone: '⏳',
      contagem: leadsStale,
      titulo: `${leadsStale === 1 ? 'lead parado' : 'leads parados'} há mais de 8 dias`,
      descricao: 'Revise o Kanban e movimente os leads travados.',
    });
    if (semEstimativaIA > 0) list.push({
      id: 'sem-estimativa-ia',
      tom: 'blue',
      icone: '🤖',
      contagem: semEstimativaIA,
      titulo: `${semEstimativaIA === 1 ? 'lead sem' : 'leads sem'} estimativa IA`,
      descricao: 'Gere as estimativas para enriquecer o valor da carteira.',
    });
    if (compatStats.agendadas > 0) list.push({
      id: 'compat-agendadas',
      tom: 'amber',
      icone: '📅',
      contagem: compatStats.agendadas,
      titulo: `${compatStats.agendadas === 1 ? 'compatibilização agendada' : 'compatibilizações agendadas'} esta semana`,
      descricao: 'Apresentações marcadas com clientes.',
    });
    if (compatStats.realizadas > 0) list.push({
      id: 'compat-realizadas',
      tom: 'green',
      icone: '✅',
      contagem: compatStats.realizadas,
      titulo: `${compatStats.realizadas === 1 ? 'compatibilização realizada' : 'compatibilizações realizadas'} esta semana`,
      descricao: 'Análises enviadas ou aprovadas.',
    });
    if (fechamentosCount > 0) list.push({
      id: 'fechamentos',
      tom: 'green',
      icone: '🏆',
      contagem: fechamentosCount,
      titulo: `${fechamentosCount === 1 ? 'fechamento realizado' : 'fechamentos realizados'} no total`,
      descricao: 'Leads que viraram contrato.',
    });
    return list;
  }, [leadsStale, semEstimativaIA, compatStats.agendadas, compatStats.realizadas, fechamentosCount]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: '"DM Sans", sans-serif', color: C.text }}>

      {/* Page header */}
      <PremiumPageHeader
        title="Dashboard Operacional"
        subtitle={isGestor ? 'Sua carteira de leads e orçamentos' : 'Visão geral da operação Reforma100'}
        right={isAdmin ? (
          <select
            value={filtroConsultor}
            onChange={e => setFiltroConsultor(e.target.value)}
            style={{
              fontSize:     13,
              padding:      '7px 12px',
              border:       '1px solid rgba(255,255,255,0.3)',
              borderRadius:  8,
              background:   'rgba(255,255,255,0.15)',
              color:        '#fff',
              fontFamily:   '"DM Sans", sans-serif',
              cursor:       'pointer',
              minWidth:     180,
            }}
          >
            <option value="" style={{ background: '#2D3395' }}>Todos os consultores</option>
            {consultores.map(c => (
              <option key={c.id} value={c.id} style={{ background: '#2D3395' }}>{c.nome}</option>
            ))}
          </select>
        ) : undefined}
      />

      {/* Quadro de avisos operacionais — carrossel premium */}
      <div style={{ marginBottom: 18 }}>
        <QuadroAvisos avisos={avisosOperacionais} />
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <MetricCard
          icon="💼"
          value={leadsLoading ? '...' : fmtBRL(valorCarteira)}
          label={isGestor ? 'Valor da sua carteira' : 'Carteira ativa estimada'}
          sub={
            leadsLoading
              ? 'carregando...'
              : semEstimativaIA > 0
              ? `⚠ ${semEstimativaIA} lead${semEstimativaIA > 1 ? 's' : ''} sem est. IA`
              : 'baseado em estimativas IA · inclui congelados'
          }
          loading={leadsLoading}
          highlight
        />
        <MetricCard
          icon={isAdmin ? '🏆' : '✅'}
          value={leadsLoading ? '...' : isAdmin ? fmtBRL(valorFechado) : fechamentosCount}
          label={isAdmin ? 'Total fechado' : 'Fechamentos realizados'}
          sub={isAdmin ? 'leads ganhos acumulados' : 'leads na etapa ganho'}
          loading={leadsLoading}
        />
        <MetricCard
          icon="📅"
          value={compatLoading ? '...' : compatStats.agendadas}
          label="Compat. na semana"
          sub="análises geradas esta semana"
          loading={compatLoading}
        />
        <MetricCard
          icon="✅"
          value={compatLoading ? '...' : compatStats.realizadas}
          label="Compat. realizadas"
          sub="enviadas/aprovadas esta semana"
          loading={compatLoading}
        />
      </div>

      {/* Alert: sem estimativa IA + botão de geração em batch */}
      {!leadsLoading && (semEstimativaIA > 0 || gerandoIA) && (
        <div className="r100-alert r100-alert-blue">
          <span style={{ fontSize: 18, flexShrink: 0 }}>🤖</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            {gerandoIA ? (
              <>
                <div style={{ fontWeight: 600, fontSize: 13, color: C.blue }}>
                  Gerando estimativas IA... {progressoIA.done}/{progressoIA.total}
                </div>
                <div style={{ marginTop: 6, height: 6, background: '#C5D0F0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progressoIA.percent}%`, background: C.blue, borderRadius: 4, transition: 'width 0.4s ease' }} />
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 600, fontSize: 13, color: C.blue }}>
                  {semEstimativaIA} lead{semEstimativaIA > 1 ? 's' : ''} sem estimativa IA
                </div>
                <div style={{ fontSize: 12, color: '#5058A0', marginTop: 2 }}>
                  O valor da carteira pode estar incompleto. Novos leads são calculados automaticamente.
                </div>
              </>
            )}
          </div>
          {!gerandoIA && semEstimativaIA > 0 && (
            <button
              onClick={() => { const ids = leadsAtivosParaCarteira.filter(l => !hasEstimativaIA(l)).map(l => l.id); dispararBatch(ids, fetchLeads); }}
              style={{ background: C.blue, color: C.white, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif', whiteSpace: 'nowrap' }}
            >
              Gerar {semEstimativaIA} estimativa{semEstimativaIA > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Alert: leads parados */}
      {!leadsLoading && leadsStale > 0 && (
        <div className="r100-alert r100-alert-amber">
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#7A4A00' }}>
              {leadsStale} lead{leadsStale > 1 ? 's' : ''} parado{leadsStale > 1 ? 's' : ''} há mais de 8 dias
            </div>
            <div style={{ fontSize: 12, color: '#9B6A10', marginTop: 2 }}>
              Revise o CRM Kanban e movimente os leads travados.
            </div>
          </div>
        </div>
      )}

      {/* Search + sort + count strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por cliente, local ou código..."
          style={{
            fontSize:     13,
            padding:      '7px 12px',
            border:       `1px solid ${C.BD}`,
            borderRadius:  8,
            background:   C.white,
            fontFamily:   '"DM Sans", sans-serif',
            color:        C.text,
            minWidth:     240,
          }}
        />

        {/* Sort controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: C.CZ, fontWeight: 600, whiteSpace: 'nowrap' }}>
            Ordenar:
          </span>
          <select
            value={sortMode}
            onChange={e => setSortMode(e.target.value as SortMode)}
            style={{
              fontSize:     12,
              padding:      '6px 10px',
              border:       `1px solid ${C.BD}`,
              borderRadius:  6,
              background:   C.white,
              color:        C.text,
              fontFamily:   '"DM Sans", sans-serif',
              cursor:       'pointer',
            }}
          >
            {(Object.entries(SORT_LABELS) as [SortMode, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <button
            onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            title={sortDir === 'desc' ? 'Maior para menor — clique para inverter' : 'Menor para maior — clique para inverter'}
            style={{
              fontSize:     13,
              fontWeight:   700,
              padding:      '5px 10px',
              border:       `1px solid ${C.BD}`,
              borderRadius:  6,
              background:   C.white,
              color:        C.NV,
              cursor:       'pointer',
              fontFamily:   '"DM Sans", sans-serif',
              lineHeight:   1,
              userSelect:   'none',
            }}
          >
            {sortDir === 'desc' ? '↓' : '↑'}
          </button>
        </div>

        <span style={{ fontSize: 12, color: C.CZ }}>
          {activeLeads.length} ativo{activeLeads.length !== 1 ? 's' : ''}{closedLeads.length > 0 ? ` · ${closedLeads.length} fechado${closedLeads.length !== 1 ? 's' : ''}` : ''}
        </span>
      </div>

      {/* Error state */}
      {fetchError && !leadsLoading && (
        <div className="r100-alert r100-alert-red">
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#C0392B' }}>{fetchError}</div>
          </div>
          <button
            onClick={fetchLeads}
            style={{ background: '#C0392B', color: C.white, border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Lead list */}
      <LeadList
        leads={leadsFiltrados}
        loading={leadsLoading}
        expandedId={expandedId}
        onToggle={id => setExpandedId(prev => prev === id ? null : id)}
      />
    </div>
  );
}

// ─── Lead list + card ─────────────────────────────────────────────────────────

function LeadList({
  leads,
  loading,
  expandedId,
  onToggle,
}: {
  leads: OrcamentoCRMComChecklist[];
  loading: boolean;
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: C.CZ, fontSize: 13 }}>
        Carregando leads...
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div style={{
        textAlign:    'center',
        padding:      48,
        background:   C.white,
        borderRadius: 12,
        border:       `1px solid ${C.BD}`,
        color:        C.CZ,
      }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📁</div>
        <div style={{ fontWeight: 600, color: C.NV, marginBottom: 4 }}>Nenhum lead encontrado</div>
        <div style={{ fontSize: 13 }}>Ajuste os filtros ou cadastre um novo lead.</div>
      </div>
    );
  }

  return (
    <div style={{
      background:   C.white,
      borderRadius: 12,
      border:       `1px solid ${C.BD}`,
      boxShadow:    '0 1px 4px rgba(0,0,0,0.06)',
      overflow:     'hidden',
    }}>
      {/* Table header */}
      <div style={{
        display:       'grid',
        gridTemplateColumns: '2fr 1fr 80px 90px 100px 130px',
        padding:       '9px 18px 9px 22px',
        borderBottom:  `1px solid ${C.BD}`,
        background:    C.FD,
        fontSize:      10,
        fontWeight:    700,
        color:         C.CZ,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
      }}>
        <span>Cliente / Lead</span>
        <span>Etapa</span>
        <span>Forns.</span>
        <span>Avanço</span>
        <span>Rota100</span>
        <span>Pendências</span>
      </div>

      {leads.map((lead, idx) => {
        const clienteNome  = lead.dados_contato?.nome || lead.necessidade;
        const pct          = calcProgress(lead.etapa_crm, lead.status_contato, lead.fornecedores_inscritos_count, lead.propostas_enviadas_count);
        const etapaClr     = ETAPA_CLR[lead.etapa_crm] ?? { clr: C.CZ, bg: C.FD };
        const isExpanded   = expandedId === lead.id;
        const isLast       = idx === leads.length - 1;
        const isStale      = lead.tempo_na_etapa_dias >= 8 && lead.etapa_crm !== 'ganho';

        return (
          <React.Fragment key={lead.id}>
            {/* Main row */}
            <button
              onClick={() => onToggle(lead.id)}
              style={{
                display:               'grid',
                gridTemplateColumns:   '2fr 1fr 80px 90px 100px 130px',
                padding:               '12px 18px 12px 16px',
                background:            isExpanded ? C.blueBg : isStale ? '#FFF8EC' : 'transparent',
                width:                 '100%',
                textAlign:             'left',
                border:                'none',
                borderLeft:            `3px solid ${etapaClr.clr}`,
                borderBottom:          isLast && !isExpanded ? 'none' : `1px solid ${C.BD}`,
                cursor:                'pointer',
                alignItems:            'center',
                gap:                   0,
              }}
              onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLButtonElement).style.background = C.FD; }}
              onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLButtonElement).style.background = isStale ? '#FFF8EC' : 'transparent'; }}
            >
              {/* Col 1: Cliente */}
              <div style={{ paddingRight: 12, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: C.NV, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {clienteNome}
                  </span>
                  {lead.codigo_orcamento && (
                    <span style={{ fontSize: 10, color: C.CZ, background: C.FD, border: `1px solid ${C.BD}`, borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>
                      #{lead.codigo_orcamento}
                    </span>
                  )}
                  {isStale && (
                    <span style={{ fontSize: 10, color: C.LJ, background: '#FFF0E8', border: `1px solid ${C.LJ}44`, borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>
                      {lead.tempo_na_etapa_dias}d
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: C.CZ, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span>📍 {lead.local}</span>
                  {lead.tamanho_imovel && <span>· {lead.tamanho_imovel}m²</span>}
                  {lead.concierge_nome && <span>· {lead.concierge_nome}</span>}
                </div>
              </div>

              {/* Col 2: Etapa */}
              <div>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color:      etapaClr.clr,
                  background: etapaClr.bg,
                  border:     `1px solid ${etapaClr.clr}33`,
                  borderRadius: 5,
                  padding:    '2px 8px',
                }}>
                  {ETAPA_LABEL[lead.etapa_crm] ?? lead.etapa_crm}
                </span>
              </div>

              {/* Col 3: Fornecedores */}
              <div>
                <span style={{
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 700,
                  fontSize:   16,
                  color:      lead.fornecedores_inscritos_count > 0 ? C.NV : C.CZ,
                }}>
                  {lead.fornecedores_inscritos_count}
                </span>
                {lead.propostas_enviadas_count > 0 && (
                  <span style={{ fontSize: 10, color: C.CZ, marginLeft: 4 }}>
                    ({lead.propostas_enviadas_count} prop.)
                  </span>
                )}
              </div>

              {/* Col 4: Progresso */}
              <div style={{ paddingRight: 12 }}>
                <ProgressBar pct={pct} ganho={lead.etapa_crm === 'ganho'} />
              </div>

              {/* Col 5: Rota100 */}
              <div>
                <Rota100Badge token={lead.rota100_token} statusContato={lead.status_contato} />
              </div>

              {/* Col 6: Pendências */}
              <div>
                <PendenciasBadges
                  tarefasAtrasadas={lead.tarefas_atrasadas ?? 0}
                  checklistPendentes={lead.checklist_pendentes ?? 0}
                  congelado={lead.congelado ?? false}
                  temAlertas={lead.tem_alertas ?? false}
                />
              </div>
            </button>

            {/* Expanded detail row */}
            {isExpanded && (
              <div style={{
                padding:     '14px 18px 14px 22px',
                borderBottom: isLast ? 'none' : `1px solid ${C.BD}`,
                borderLeft:  `3px solid ${etapaClr.clr}`,
                background:  C.blueBg,
                display:     'flex',
                gap:         24,
                flexWrap:    'wrap',
              }}>
                <DetailItem label="Necessidade" value={lead.necessidade} />
                <DetailItem label="Status contato" value={lead.status_contato?.replace(/_/g, ' ') ?? '—'} />
                <DetailItem
                  label="Valor estimado"
                  value={
                    lead.valor_estimado_ia_medio
                      ? `${fmtBRL(lead.valor_estimado_ia_medio)} (IA${lead.valor_estimado_ia_confianca ? ' · ' + lead.valor_estimado_ia_confianca : ''})`
                      : lead.valor_lead_estimado
                      ? `${fmtBRL(lead.valor_lead_estimado)} (declarado pelo cliente — sem est. IA)`
                      : 'Sem estimativa'
                  }
                />
                <DetailItem
                  label="Checklist"
                  value={`${lead.itens_checklist_concluidos ?? 0}/${lead.total_itens_checklist ?? 0} itens`}
                />
                <DetailItem
                  label="Tarefas"
                  value={`${lead.tarefas_hoje ?? 0} hoje · ${lead.tarefas_atrasadas ?? 0} atrasadas`}
                />
                {lead.observacoes_internas && (
                  <DetailItem label="Obs. internas" value={lead.observacoes_internas} wide />
                )}
                {lead.rota100_token && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.CZ, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rota100</span>
                    <a
                      href={`/rota100/${lead.rota100_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: C.LJ, fontWeight: 600, textDecoration: 'none' }}
                    >
                      Abrir Rota100 →
                    </a>
                  </div>
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function DetailItem({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: wide ? '100%' : 120, maxWidth: wide ? '100%' : 200 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: C.CZ, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 12, color: C.text }}>{value}</span>
    </div>
  );
}
