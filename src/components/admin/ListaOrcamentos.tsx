
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOrcamento } from '@/context/OrcamentoContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, Clock, Timer, BarChart2, AlertTriangle, Eye, Hourglass, Inbox, X as XIcon } from 'lucide-react';
import { ModalFornecedoresOrcamento } from './ModalFornecedoresOrcamento';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { ApropriacaoGestorModal } from './ApropriacaoGestorModal';
import { EditarOrcamentoModal } from './EditarOrcamentoModal';
import { AcoesOrcamentoDropdown } from './AcoesOrcamentoDropdown';
import { ConfirmarFechamentoModal } from './ConfirmarFechamentoModal';
import { useCanManageOrcamentos } from '@/hooks/useCanManageOrcamentos';
import { useIsMaster } from '@/hooks/useIsMaster';
import { useOrcamentoActions } from '@/hooks/useOrcamentoActions';
import { Orcamento } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { ModalCompatibilizacaoConsultor } from './consultor/ModalCompatibilizacaoConsultor';
import { PremiumPageHeader } from '@/components/ui/PremiumPageHeader';
import { FichaOperacionalAdmin } from './FichaOperacionalAdmin';
import { QuadroAvisos, type Aviso } from './QuadroAvisos';

// ── Badge de status de compatibilização ──────────────────────────────────────
function CompatStatusBadge({ status }: { status: string | undefined }) {
  if (!status || status === 'idle') return null;
  const map: Record<string, { label: string; cls: string }> = {
    pending:          { label: 'Compat. gerando...',   cls: 'border-gray-300 bg-gray-50 text-gray-600' },
    failed:           { label: 'Compat. falhou',       cls: 'border-red-300 bg-red-50 text-red-700' },
    completed:        { label: 'Aguardando revisão',   cls: 'border-orange-300 bg-orange-50 text-orange-700' },
    pendente_revisao: { label: 'Aguardando revisão',   cls: 'border-orange-300 bg-orange-50 text-orange-700' },
    revisado:         { label: 'Compat. revisada',     cls: 'border-blue-300 bg-blue-50 text-blue-700' },
    aprovado:         { label: 'Compat. aprovada',     cls: 'border-green-300 bg-green-50 text-green-700' },
    enviado:          { label: 'Compat. agendada',     cls: 'border-green-400 bg-green-100 text-green-800' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'border-gray-300 bg-gray-50 text-gray-600' };
  return (
    <Badge variant="outline" className={`flex items-center gap-1 text-xs ${cls}`}>
      <BarChart2 className="h-3 w-3" />
      {label}
    </Badge>
  );
}

// ── Filtros P2 ───────────────────────────────────────────────────────────────
type StatusFiltro = 'todos' | 'aberto' | 'pausado' | 'fechado';
type PeriodoFiltro = 'todos' | '7' | '30' | '90';
type CompatFiltro = 'todos' | 'sem' | 'em_andamento' | 'revisao' | 'cliente' | 'aprovada';

const STATUS_PARA_BUCKET_COMPAT = (s: string | undefined): CompatFiltro => {
  if (!s || s === 'idle') return 'sem';
  if (['pending', 'processando', 'compatibilizando'].includes(s)) return 'em_andamento';
  if (['concluida', 'completed', 'pendente_revisao', 'revisado'].includes(s)) return 'revisao';
  if (s === 'enviado') return 'cliente';
  if (s === 'aprovado') return 'aprovada';
  return 'sem';
};

const ETAPAS_PRE_SDR = ['orcamento_postado', 'contato_agendamento'];

// Rota100 % simplificado por etapa (alinhado a ETAPA_TO_STEP do useRota100Data).
// É uma estimativa rápida para o card; o painel real usa fórmula completa.
const R100_PCT_POR_ETAPA: Record<string, number> = {
  orcamento_postado:    14,
  contato_agendamento:  29,
  em_orcamento:         43,
  propostas_enviadas:   57,
  compatibilizacao:     71,
  fechamento_contrato:  86,
  pos_venda_feedback:   100,
  ganho:                100,
  perdido:              100,
};
function r100Percentual(etapa: string | null | undefined): number {
  if (!etapa) return 14;
  return R100_PCT_POR_ETAPA[etapa] ?? 14;
}

// ── KPI Card (P2/P5c — alinhado ao KpiCardCRM do Kanban) ─────────────────────
function KpiCardAdmin({
  icon, label, value, color, active, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: 'azul' | 'lj' | 'rx' | 'cz' | 'vm' | 'vd';
  active?: boolean;
  onClick?: () => void;
}) {
  const palette = {
    azul: { bd: '#2D3395', tint: 'rgba(45,51,149,0.06)' },
    lj:   { bd: '#F7A226', tint: 'rgba(247,162,38,0.07)' },
    rx:   { bd: '#534AB7', tint: 'rgba(83,74,183,0.07)' },
    cz:   { bd: '#6B7280', tint: 'rgba(107,114,128,0.07)' },
    vm:   { bd: '#C0392B', tint: 'rgba(192,57,43,0.07)' },
    vd:   { bd: '#1B7A4A', tint: 'rgba(27,122,74,0.07)' },
  }[color];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      className="text-left rounded-xl px-3 py-2.5 border transition-all hover:-translate-y-0.5"
      style={{
        background: active ? palette.tint : '#fff',
        borderColor: active ? palette.bd : '#E5E7EB',
        borderTopWidth: 3,
        borderTopColor: palette.bd,
        boxShadow: active ? `0 0 0 2px ${palette.bd}30` : '0 1px 4px rgba(0,0,0,0.04)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider min-w-0" style={{ color: palette.bd, fontFamily: "'Syne', sans-serif" }}>
          {icon}
          <span className="truncate">{label}</span>
        </div>
        <div className="text-xl font-bold leading-none text-foreground tabular-nums shrink-0">{value}</div>
      </div>
    </button>
  );
}

export const ListaOrcamentos: React.FC = () => {
  const { orcamentos, excluirOrcamento, isDeleting, carregarOrcamentos, recarregarComRetry, hasMore, carregarMais, isLoadingMore, totalCount } = useOrcamento();
  const canManage = useCanManageOrcamentos();
  const isMaster = useIsMaster();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedOrcamento, setSelectedOrcamento] = useState<Orcamento | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orcamentoToDelete, setOrcamentoToDelete] = useState<string | null>(null);
  const [apropriacaoModalOpen, setApropriacaoModalOpen] = useState(false);
  const [orcamentoParaApropriacao, setOrcamentoParaApropriacao] = useState<Orcamento | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [orcamentoParaEditar, setOrcamentoParaEditar] = useState<Orcamento | null>(null);
  const [fechamentoModalOpen, setFechamentoModalOpen] = useState(false);
  const [orcamentoParaFechar, setOrcamentoParaFechar] = useState<Orcamento | null>(null);
  const [compatOrcamento, setCompatOrcamento] = useState<Orcamento | null>(null);
  const [compatModalOpen, setCompatModalOpen] = useState(false);
  const [compatStatusMap, setCompatStatusMap] = useState<Record<string, string>>({});
  const [crmStageMap, setCrmStageMap] = useState<Record<string, string | null>>({});
  // Fase C: drawer Ficha (clique no card abre)
  const [fichaAberta, setFichaAberta] = useState<Orcamento | null>(null);

  // P2: filtros premium com persistência URL
  const [busca, setBusca] = useState(() => searchParams.get('q') ?? '');
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>(() => {
    const v = searchParams.get('status');
    return (v === 'aberto' || v === 'pausado' || v === 'fechado') ? v : 'todos';
  });
  const [etapaFiltro, setEtapaFiltro] = useState<string>(() => searchParams.get('etapa') ?? 'todos');
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>(() => {
    const v = searchParams.get('periodo');
    return (v === '7' || v === '30' || v === '90') ? v : 'todos';
  });
  const [compatFiltro, setCompatFiltro] = useState<CompatFiltro>(() => {
    const v = searchParams.get('compat');
    return (v === 'sem' || v === 'em_andamento' || v === 'revisao' || v === 'cliente' || v === 'aprovada') ? v : 'todos';
  });

  const { pausarOrcamento, reabrirOrcamento, fecharOrcamentoManualmente, isLoading: isActionLoading } = useOrcamentoActions(recarregarComRetry);

  // P2: sincronizar filtros → URL
  useEffect(() => {
    const current = new URLSearchParams(window.location.search);
    const next = new URLSearchParams(current);
    const setOrDel = (k: string, v: string | null) => {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    };
    setOrDel('q',       busca.trim() || null);
    setOrDel('status',  statusFiltro === 'todos' ? null : statusFiltro);
    setOrDel('etapa',   etapaFiltro === 'todos' ? null : etapaFiltro);
    setOrDel('periodo', periodoFiltro === 'todos' ? null : periodoFiltro);
    setOrDel('compat',  compatFiltro === 'todos' ? null : compatFiltro);
    if (next.toString() !== current.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [busca, statusFiltro, etapaFiltro, periodoFiltro, compatFiltro, setSearchParams]);

  // P2: filtro client-side combinado
  const orcamentosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const cutoffMs = periodoFiltro === 'todos' ? 0 : Date.now() - Number(periodoFiltro) * 86_400_000;

    return orcamentos.filter(o => {
      // Busca textual
      if (q) {
        const necessidade = (o.necessidade ?? '').toLowerCase();
        const local       = (o.local ?? '').toLowerCase();
        const codigo      = o.id.toLowerCase();
        const cliente     = (o.dadosContato?.nome ?? '').toLowerCase();
        if (!necessidade.includes(q) && !local.includes(q) && !codigo.includes(q) && !cliente.includes(q)) return false;
      }
      // Status
      if (statusFiltro !== 'todos' && o.status !== statusFiltro) return false;
      // Etapa CRM (pre-sdr / etapa específica)
      if (etapaFiltro !== 'todos') {
        const etapa = crmStageMap[o.id];
        if (etapaFiltro === 'pre-sdr') {
          if (etapa !== null && etapa !== undefined && !ETAPAS_PRE_SDR.includes(etapa)) return false;
        } else {
          if (etapa !== etapaFiltro) return false;
        }
      }
      // Período
      if (cutoffMs > 0) {
        const dt = o.dataPublicacao instanceof Date ? o.dataPublicacao.getTime() : new Date(o.dataPublicacao).getTime();
        if (dt < cutoffMs) return false;
      }
      // Compat
      if (compatFiltro !== 'todos') {
        const bucket = STATUS_PARA_BUCKET_COMPAT(compatStatusMap[o.id]);
        if (bucket !== compatFiltro) return false;
      }
      return true;
    });
  }, [orcamentos, busca, statusFiltro, etapaFiltro, periodoFiltro, compatFiltro, crmStageMap, compatStatusMap]);

  // P2: contagens absolutas para chips/dropdowns/KPIs
  const counts = useMemo(() => {
    const k = { total: orcamentos.length, revisao: 0, cliente: 0, preSDR: 0 };
    const status = { aberto: 0, pausado: 0, fechado: 0 };
    const periodos = { '7': 0, '30': 0, '90': 0 };
    const compat = { sem: 0, em_andamento: 0, revisao: 0, cliente: 0, aprovada: 0 };
    const etapas: Record<string, number> = {};
    const agora = Date.now();
    orcamentos.forEach(o => {
      if (o.status === 'aberto') status.aberto++;
      else if (o.status === 'pausado') status.pausado++;
      else if (o.status === 'fechado') status.fechado++;

      const ms = o.dataPublicacao instanceof Date ? o.dataPublicacao.getTime() : new Date(o.dataPublicacao).getTime();
      const dias = (agora - ms) / 86_400_000;
      if (dias <= 7) periodos['7']++;
      if (dias <= 30) periodos['30']++;
      if (dias <= 90) periodos['90']++;

      const compatBucket = STATUS_PARA_BUCKET_COMPAT(compatStatusMap[o.id]);
      compat[compatBucket]++;
      if (compatBucket === 'revisao') k.revisao++;
      if (compatBucket === 'cliente') k.cliente++;

      const etapa = crmStageMap[o.id];
      if (etapa === undefined) {
        // ainda carregando
      } else if (etapa === null || ETAPAS_PRE_SDR.includes(etapa)) {
        k.preSDR++;
      }
      if (etapa) etapas[etapa] = (etapas[etapa] ?? 0) + 1;
    });
    return { kpis: k, status, periodos, compat, etapas };
  }, [orcamentos, crmStageMap, compatStatusMap]);

  // Avisos operacionais (QuadroAvisos) — lista vazia = fallback "Tudo em dia".
  const avisosOperacionais = useMemo<Aviso[]>(() => {
    const list: Aviso[] = [];
    if (counts.kpis.revisao > 0) list.push({
      id: 'compat-revisao',
      tom: 'amber',
      icone: '👁️',
      contagem: counts.kpis.revisao,
      titulo: `${counts.kpis.revisao === 1 ? 'compatibilização aguarda' : 'compatibilizações aguardam'} sua revisão`,
      descricao: 'IA concluída — pronto para revisar e aprovar.',
      onClick: () => setCompatFiltro(compatFiltro === 'revisao' ? 'todos' : 'revisao'),
    });
    if (counts.kpis.cliente > 0) list.push({
      id: 'compat-cliente',
      tom: 'blue',
      icone: '📅',
      contagem: counts.kpis.cliente,
      titulo: `${counts.kpis.cliente === 1 ? 'compat. agendada' : 'compats. agendadas'} · aguardando confirmação do cliente`,
      descricao: 'Cliente confirma ou pede reagendamento da apresentação.',
      onClick: () => setCompatFiltro(compatFiltro === 'cliente' ? 'todos' : 'cliente'),
    });
    if (counts.kpis.preSDR > 0) list.push({
      id: 'pre-sdr',
      tom: 'amber',
      icone: '📞',
      contagem: counts.kpis.preSDR,
      titulo: `${counts.kpis.preSDR === 1 ? 'lead' : 'leads'} pré-SDR aguardando atribuição`,
      descricao: 'Atribua a um SDR para iniciar o contato.',
    });
    if (counts.periodos['7'] > 0) list.push({
      id: 'leads-recentes',
      tom: 'green',
      icone: '✋',
      contagem: counts.periodos['7'],
      titulo: `${counts.periodos['7'] === 1 ? 'orçamento novo' : 'orçamentos novos'} esta semana`,
      descricao: 'Últimos 7 dias.',
      onClick: () => setPeriodoFiltro(periodoFiltro === '7' ? 'todos' : '7'),
    });
    if (counts.kpis.total > 0) list.push({
      id: 'total-pipeline',
      tom: 'blue',
      icone: '📊',
      contagem: counts.kpis.total,
      titulo: `${counts.kpis.total === 1 ? 'orçamento no pipeline' : 'orçamentos no pipeline'}`,
      descricao: 'Volume total carregado nesta lista.',
    });
    return list;
  }, [counts, compatFiltro, periodoFiltro]);

  const filtrosAtivos = busca.trim() !== ''
    || statusFiltro !== 'todos'
    || etapaFiltro !== 'todos'
    || periodoFiltro !== 'todos'
    || compatFiltro !== 'todos';

  const limparTudo = () => {
    setBusca('');
    setStatusFiltro('todos');
    setEtapaFiltro('todos');
    setPeriodoFiltro('todos');
    setCompatFiltro('todos');
  };

  // Chips de filtros ativos (removíveis individualmente)
  const chipsAtivos = useMemo(() => {
    const arr: Array<{ key: string; label: string; clear: () => void }> = [];
    const q = busca.trim();
    if (q) arr.push({ key: 'q', label: `Busca: ${q}`, clear: () => setBusca('') });
    if (statusFiltro === 'aberto')  arr.push({ key: 'status', label: 'Aberto',  clear: () => setStatusFiltro('todos') });
    if (statusFiltro === 'pausado') arr.push({ key: 'status', label: 'Pausado', clear: () => setStatusFiltro('todos') });
    if (statusFiltro === 'fechado') arr.push({ key: 'status', label: 'Fechado', clear: () => setStatusFiltro('todos') });
    if (etapaFiltro === 'pre-sdr')  arr.push({ key: 'etapa', label: 'Pré-SDR',  clear: () => setEtapaFiltro('todos') });
    else if (etapaFiltro !== 'todos') arr.push({ key: 'etapa', label: `Etapa: ${etapaFiltro}`, clear: () => setEtapaFiltro('todos') });
    if (periodoFiltro !== 'todos') arr.push({ key: 'periodo', label: `Últimos ${periodoFiltro} dias`, clear: () => setPeriodoFiltro('todos') });
    if (compatFiltro === 'em_andamento') arr.push({ key: 'compat', label: 'Compat. em andamento', clear: () => setCompatFiltro('todos') });
    if (compatFiltro === 'revisao')      arr.push({ key: 'compat', label: 'Aguardando revisão', clear: () => setCompatFiltro('todos') });
    if (compatFiltro === 'cliente')      arr.push({ key: 'compat', label: 'Compat. agendada',   clear: () => setCompatFiltro('todos') });
    if (compatFiltro === 'aprovada')     arr.push({ key: 'compat', label: 'Compat. aprovada',    clear: () => setCompatFiltro('todos') });
    if (compatFiltro === 'sem')          arr.push({ key: 'compat', label: 'Sem compatibilização', clear: () => setCompatFiltro('todos') });
    return arr;
  }, [busca, statusFiltro, etapaFiltro, periodoFiltro, compatFiltro]);

  // Batch-fetch latest compat status for all visible orcamentos (single query)
  const fetchCompatStatus = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const { data } = await (supabase as any)
      .from('compatibilizacoes_analises_ia')
      .select('orcamento_id, status')
      .in('orcamento_id', ids)
      .order('created_at', { ascending: false });
    if (!data) return;
    const map: Record<string, string> = {};
    for (const row of data) {
      if (!map[row.orcamento_id]) map[row.orcamento_id] = row.status;
    }
    setCompatStatusMap(map);
  }, []);

  // Batch-fetch CRM stage for all visible orcamentos (single query)
  const fetchCrmStages = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const { data } = await supabase
      .from('orcamentos_crm_tracking')
      .select('orcamento_id, etapa_crm')
      .in('orcamento_id', ids);
    if (!data) return;
    const map: Record<string, string | null> = {};
    for (const row of data) {
      map[row.orcamento_id] = row.etapa_crm;
    }
    setCrmStageMap(map);
  }, []);

  useEffect(() => {
    const ids = orcamentos.map(o => o.id);
    fetchCompatStatus(ids);
    fetchCrmStages(ids);
  }, [orcamentos, fetchCompatStatus, fetchCrmStages]);

  const getStatusColor = (status: string) => {
    if (status === 'aberto') return 'bg-primary';
    if (status === 'pausado') return 'bg-amber-500';
    return 'bg-accent';
  };

  const abrirWhatsApp = (telefone: string, nome: string) => {
    const mensagem = `Olá ${nome}, entrando em contato sobre o orçamento.`;
    const telefoneFormatado = telefone.replace(/\D/g, '');
    const telefoneComCodigo = telefoneFormatado.startsWith('55') ? telefoneFormatado : `55${telefoneFormatado}`;
    const url = `https://api.whatsapp.com/send/?phone=${telefoneComCodigo}&text=${encodeURIComponent(mensagem)}&type=phone_number&app_absent=0`;
    window.open(url, '_blank');
  };

  const handleVerFornecedores = (orcamento: Orcamento) => {
    setSelectedOrcamento(orcamento);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (orcamentoId: string) => {
    setOrcamentoToDelete(orcamentoId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (orcamentoToDelete) {
      const success = await excluirOrcamento(orcamentoToDelete);
      if (success) {
        setDeleteDialogOpen(false);
        setOrcamentoToDelete(null);
      }
    }
  };

  const handleApropriacaoClick = (orcamento: Orcamento) => {
    setOrcamentoParaApropriacao(orcamento);
    setApropriacaoModalOpen(true);
  };

  const handleApropriacaoSuccess = async () => {
    console.log('🔄 Lista: Apropriação bem-sucedida, recarregando com retry...');
    await recarregarComRetry();
    console.log('✅ Lista: Recarregamento concluído após apropriação');
  };

  const handleEditClick = (orcamento: Orcamento) => {
    setOrcamentoParaEditar(orcamento);
    setEditModalOpen(true);
  };

  const handleEditSuccess = async () => {
    console.log('🔄 Lista: Edição bem-sucedida, recarregando...');
    await recarregarComRetry();
    console.log('✅ Lista: Recarregamento concluído após edição');
  };

  const handlePausarClick = async (orcamento: Orcamento) => {
    await pausarOrcamento(orcamento.id);
  };

  const handleReabrirClick = async (orcamento: Orcamento) => {
    await reabrirOrcamento(orcamento.id);
  };

  const handleFecharManualmenteClick = (orcamento: Orcamento) => {
    setOrcamentoParaFechar(orcamento);
    setFechamentoModalOpen(true);
  };

  const handleConfirmarFechamento = async (motivo?: string) => {
    if (orcamentoParaFechar) {
      const success = await fecharOrcamentoManualmente(orcamentoParaFechar.id, motivo);
      if (success) {
        setFechamentoModalOpen(false);
        setOrcamentoParaFechar(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      <PremiumPageHeader
        title="Orçamentos Cadastrados"
        subtitle="Gerencie e acompanhe todos os orçamentos"
        style={{ marginBottom: 0 }}
        right={totalCount > 0 ? (
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
            {orcamentosFiltrados.length} de {totalCount}
          </span>
        ) : undefined}
      />

      {/* Quadro de avisos operacionais — carrossel premium com fallback */}
      <QuadroAvisos avisos={avisosOperacionais} className="mb-3" />

      {/* KPIs operacionais clicáveis (P2/P5c) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <KpiCardAdmin
          icon={<Inbox className="h-4 w-4" />}
          label="Total"
          value={counts.kpis.total}
          color="azul"
          active={!filtrosAtivos}
          onClick={limparTudo}
        />
        <KpiCardAdmin
          icon={<Eye className="h-4 w-4" />}
          label="Aguardando revisão"
          value={counts.kpis.revisao}
          color="lj"
          active={compatFiltro === 'revisao'}
          onClick={() => setCompatFiltro(compatFiltro === 'revisao' ? 'todos' : 'revisao')}
        />
        <KpiCardAdmin
          icon={<Hourglass className="h-4 w-4" />}
          label="Compat. agendada"
          value={counts.kpis.cliente}
          color="rx"
          active={compatFiltro === 'cliente'}
          onClick={() => setCompatFiltro(compatFiltro === 'cliente' ? 'todos' : 'cliente')}
        />
        <KpiCardAdmin
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Pré-SDR"
          value={counts.kpis.preSDR}
          color="cz"
          active={etapaFiltro === 'pre-sdr'}
          onClick={() => setEtapaFiltro(etapaFiltro === 'pre-sdr' ? 'todos' : 'pre-sdr')}
        />
      </div>

      {/* Busca + dropdowns (P2) */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <BarChart2 className="h-4 w-4 opacity-0" />
          </span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por necessidade, local, código ou cliente…"
            className="w-full h-9 pl-3 pr-9 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted hover:bg-border flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <XIcon className="h-3 w-3" />
            </button>
          )}
        </div>

        <select
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value as StatusFiltro)}
          className="h-9 px-3 rounded-lg border border-border bg-white text-sm cursor-pointer outline-none"
        >
          <option value="todos">Todos status ({orcamentos.length})</option>
          <option value="aberto">Aberto ({counts.status.aberto})</option>
          <option value="pausado">Pausado ({counts.status.pausado})</option>
          <option value="fechado">Fechado ({counts.status.fechado})</option>
        </select>

        <select
          value={periodoFiltro}
          onChange={(e) => setPeriodoFiltro(e.target.value as PeriodoFiltro)}
          className="h-9 px-3 rounded-lg border border-border bg-white text-sm cursor-pointer outline-none"
        >
          <option value="todos">Todo o período</option>
          <option value="7">Últimos 7 dias ({counts.periodos['7']})</option>
          <option value="30">Últimos 30 dias ({counts.periodos['30']})</option>
          <option value="90">Últimos 90 dias ({counts.periodos['90']})</option>
        </select>

        <select
          value={compatFiltro}
          onChange={(e) => setCompatFiltro(e.target.value as CompatFiltro)}
          className="h-9 px-3 rounded-lg border border-border bg-white text-sm cursor-pointer outline-none"
        >
          <option value="todos">Compatibilização</option>
          <option value="sem">Sem ({counts.compat.sem})</option>
          <option value="em_andamento">Em andamento ({counts.compat.em_andamento})</option>
          <option value="revisao">Aguardando revisão ({counts.compat.revisao})</option>
          <option value="cliente">Compat. agendada ({counts.compat.cliente})</option>
          <option value="aprovada">Aprovada ({counts.compat.aprovada})</option>
        </select>

        {filtrosAtivos && (
          <button
            type="button"
            onClick={limparTudo}
            className="h-9 px-3 rounded-lg border border-border bg-white text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Chips de filtros ativos (P2 / padrão B5.23) */}
      {chipsAtivos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chipsAtivos.map(f => (
            <button
              key={`${f.key}-${f.label}`}
              type="button"
              onClick={f.clear}
              aria-label={`Remover filtro: ${f.label}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/15 transition-colors font-syne"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              {f.label}
              <span className="opacity-60 text-sm leading-none">×</span>
            </button>
          ))}
        </div>
      )}

      {orcamentosFiltrados.length === 0 ? (
        <div className="r100-empty r100-fade">
          <div className="r100-empty-icon" aria-hidden>{filtrosAtivos ? '🔎' : '📋'}</div>
          <div className="r100-empty-title">
            {filtrosAtivos
              ? (busca.trim() ? `Nada encontrado para "${busca.trim()}"` : 'Nenhum resultado com esses filtros')
              : 'Nenhum orçamento cadastrado'}
          </div>
          <div className="r100-empty-sub">
            {filtrosAtivos
              ? (compatFiltro === 'revisao'  ? 'Nenhuma compatibilização aguardando revisão.'
                : compatFiltro === 'cliente'  ? 'Nenhum lead aguardando cliente neste momento.'
                : compatFiltro === 'aprovada' ? 'Nenhuma compatibilização aprovada ainda.'
                : etapaFiltro === 'pre-sdr'   ? 'Nenhum lead em pré-atendimento SDR.'
                : statusFiltro === 'pausado'  ? 'Nenhum orçamento pausado.'
                : statusFiltro === 'fechado'  ? 'Nenhum orçamento fechado.'
                : 'Tente remover algum filtro acima.')
              : 'Os novos orçamentos aparecerão automaticamente aqui.'}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 max-w-full overflow-hidden">
          {orcamentosFiltrados.map((orcamento, idx) => (
            <Card
              key={orcamento.id}
              role="button"
              tabIndex={0}
              onClick={() => setFichaAberta(orcamento)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFichaAberta(orcamento); } }}
              className="r100-card r100-press r100-focus r100-stagger w-full max-w-full box-border overflow-hidden cursor-pointer"
              style={{ ['--i' as any]: Math.min(idx, 12) }}
            >
              <CardHeader className="max-w-full overflow-hidden pb-3 space-y-0">
                <div className="flex flex-col gap-2 max-w-full overflow-hidden mb-0">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <CardTitle className="text-sm font-semibold text-secondary r100-clamp-2 leading-snug">{orcamento.necessidade || 'Sem descrição'}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {orcamento.local} · #{orcamento.id.slice(0, 8)} · {format(orcamento.dataPublicacao, "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  {/* Badges com prioridade — max 4 visíveis + overflow +N (P5c) */}
                  {(() => {
                    type B = { key: string; el: React.ReactNode; tooltip: string; priority: number };
                    const bs: B[] = [];
                    const etapa = crmStageMap[orcamento.id];

                    // P1 — status do orçamento (sempre)
                    bs.push({
                      key: 'status', priority: 1,
                      tooltip: `Status: ${orcamento.status.toUpperCase()}`,
                      el: (
                        <Badge className={`${getStatusColor(orcamento.status)} max-w-[120px] truncate`}>
                          {orcamento.status.toUpperCase()}
                        </Badge>
                      ),
                    });

                    // P2 — embargo ativo (alerta)
                    if (orcamento.data_liberacao_fornecedores && new Date(orcamento.data_liberacao_fornecedores) > new Date()) {
                      bs.push({
                        key: 'embargo', priority: 2,
                        tooltip: `Em embargo até ${format(new Date(orcamento.data_liberacao_fornecedores), 'dd/MM HH:mm')}`,
                        el: (
                          <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-700 flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            Em embargo até {format(new Date(orcamento.data_liberacao_fornecedores), 'dd/MM HH:mm')}
                          </Badge>
                        ),
                      });
                    }

                    // P3 — compat status (operacional)
                    if (compatStatusMap[orcamento.id]) {
                      bs.push({
                        key: 'compat', priority: 3,
                        tooltip: `Compatibilização: ${compatStatusMap[orcamento.id]}`,
                        el: <CompatStatusBadge status={compatStatusMap[orcamento.id]} />,
                      });
                    }

                    // P3 — Pré-SDR (operacional)
                    if (etapa !== undefined && (etapa === null || etapa === 'orcamento_postado' || etapa === 'contato_agendamento')) {
                      bs.push({
                        key: 'pre-sdr', priority: 3,
                        tooltip: 'Pré-atendimento SDR',
                        el: (
                          <Badge variant="outline" className="border-blue-400 bg-blue-50 text-blue-700 flex items-center gap-1">
                            ⏳ Pré-atendimento SDR
                          </Badge>
                        ),
                      });
                    }

                    // P4 — R100 % (referência rápida)
                    if (etapa !== undefined) {
                      const pct = r100Percentual(etapa);
                      bs.push({
                        key: 'r100', priority: 4,
                        tooltip: `Progresso Rota100: ${pct}%`,
                        el: (
                          <Badge variant="outline" className="border-purple-300 bg-purple-50 text-purple-700 font-mono text-[10px] px-2">
                            R100 {pct}%
                          </Badge>
                        ),
                      });
                    }

                    // P5 — categorias (informativo, prioridade baixa)
                    orcamento.categorias.forEach((cat, idx) => {
                      bs.push({
                        key: `cat-${idx}`, priority: 5,
                        tooltip: cat,
                        el: (
                          <Badge variant="secondary" className="max-w-[150px] truncate">
                            {cat}
                          </Badge>
                        ),
                      });
                    });

                    bs.sort((a, b) => a.priority - b.priority);
                    const MAX = 4;
                    const visiveis = bs.slice(0, MAX);
                    const overflow = bs.slice(MAX);

                    return (
                      <div className="flex gap-2 flex-wrap max-w-full overflow-hidden shrink-0">
                        {visiveis.map(b => <React.Fragment key={b.key}>{b.el}</React.Fragment>)}
                        {overflow.length > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] cursor-help"
                            title={overflow.map(b => b.tooltip).join('\n')}
                          >
                            +{overflow.length}
                          </Badge>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </CardHeader>
              <CardContent className="max-w-full overflow-hidden pt-2 pb-4">
                <div className="flex items-center justify-between gap-3 max-w-full overflow-hidden">
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground min-w-0">
                    {orcamento.tamanhoImovel && (
                      <span><span className="font-medium text-foreground">{orcamento.tamanhoImovel} m²</span></span>
                    )}
                    <span>{orcamento.quantidadeEmpresas}/{orcamento.horariosVisita?.length || 3} empresas</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {orcamento.prazoInicioTexto || 'Início não informado'}
                    </span>
                  </div>

                  {/* Ações destrutivas: mantidas no card com stopPropagation para não disparar abertura do drawer */}
                  {canManage && (
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <AcoesOrcamentoDropdown
                        orcamento={orcamento}
                        onPausar={handlePausarClick}
                        onReabrir={handleReabrirClick}
                        onFecharManualmente={handleFecharManualmenteClick}
                      />
                      <Button
                        onClick={() => handleDeleteClick(orcamento.id)}
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                        disabled={isDeleting || isActionLoading}
                        aria-label="Excluir orçamento"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {/* Load more button — só quando não há filtros locais ativos */}
          {hasMore && !filtrosAtivos && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={carregarMais}
                disabled={isLoadingMore}
                variant="outline"
                className="min-w-[200px] r100-press r100-focus"
              >
                {isLoadingMore ? (
                  <>
                    <span className="r100-dots mr-2"><span/><span/><span/></span>
                    Carregando…
                  </>
                ) : (
                  `Carregar mais orçamentos`
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      <ModalFornecedoresOrcamento
        orcamento={selectedOrcamento}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <ConfirmDeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        orcamentoId={orcamentoToDelete || ''}
        isLoading={isDeleting}
      />

      <ApropriacaoGestorModal
        isOpen={apropriacaoModalOpen}
        onClose={() => setApropriacaoModalOpen(false)}
        orcamento={orcamentoParaApropriacao}
        onSuccess={handleApropriacaoSuccess}
      />

      <EditarOrcamentoModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        orcamento={orcamentoParaEditar}
        onSuccess={handleEditSuccess}
      />

      <ConfirmarFechamentoModal
        isOpen={fechamentoModalOpen}
        onClose={() => setFechamentoModalOpen(false)}
        onConfirm={handleConfirmarFechamento}
        orcamento={orcamentoParaFechar}
        isLoading={isActionLoading}
      />

      <ModalCompatibilizacaoConsultor
        orcamento={compatOrcamento}
        isOpen={compatModalOpen}
        onClose={() => {
          setCompatModalOpen(false);
          // Refresh compat status after modal closes (user may have approved/sent)
          const ids = orcamentos.map(o => o.id);
          fetchCompatStatus(ids);
        }}
      />

      {/* Fase C: drawer lateral premium — clique no card abre aqui */}
      <FichaOperacionalAdmin
        orcamento={fichaAberta}
        onClose={() => setFichaAberta(null)}
        onEditar={canManage ? () => {
          if (!fichaAberta) return;
          setOrcamentoParaEditar(fichaAberta);
          setEditModalOpen(true);
        } : undefined}
        onApropriar={canManage ? () => {
          if (!fichaAberta) return;
          setOrcamentoParaApropriacao(fichaAberta);
          setApropriacaoModalOpen(true);
        } : undefined}
        onAbrirCompat={canManage ? () => {
          if (!fichaAberta) return;
          setCompatOrcamento(fichaAberta);
          setCompatModalOpen(true);
        } : undefined}
      />
    </div>
  );
};
