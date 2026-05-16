import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCRMOrcamentos, useCongelarOrcamento } from '@/hooks/useCRMOrcamentos';
import { ColunaKanban } from './crm/ColunaKanban';
// Fase D: ModalDetalhesOrcamentoCRM mantido importado como fallback temporário
// (não chamado pela UI atual). Remover em cleanup separado após validação.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ModalDetalhesOrcamentoCRM as _LegacyModalDetalhes } from './crm/ModalDetalhesOrcamentoCRM';
import { FichaOperacionalAdmin } from './FichaOperacionalAdmin';
import type { Orcamento } from '@/types';
import { FiltrosAvancadosCRM } from './crm/FiltrosAvancadosCRM';
import { BarraAcoesMassa } from './crm/BarraAcoesMassa';
import { MarcarPerdidoModal } from './crm/MarcarPerdidoModal';
import { ModalCongelarOrcamento } from './crm/ModalCongelarOrcamento';
import { ApropriarOrcamentosGestor } from './crm/ApropriarOrcamentosGestor';
import { ModalCompatibilizacaoConsultor } from './consultor/ModalCompatibilizacaoConsultor';
import { QuadroAvisos, type Aviso } from './QuadroAvisos';
import { CardProdutividadeConcierge } from './crm/CardProdutividadeConcierge';
import { ETAPAS_CRM, ETAPAS_ARQUIVADAS, isEtapaArquivada } from '@/constants/crmEtapas';
import { OrcamentoCRMComChecklist, HistoricoMovimentacao, FiltrosCRM, EtapaCRM, FornecedorInscrito } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Filter, RefreshCw, Eye, EyeOff, UserCheck, AlertTriangle, Download, Inbox, Hourglass, X as XIcon, BarChart2 } from 'lucide-react';
import { exportarLeadsCRMExcel } from '@/utils/exportacaoCRM';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useEtapasConfig } from '@/hooks/useEtapasConfig';
import { PremiumPageHeader } from '@/components/ui/PremiumPageHeader';

// P3: filtros premium do Kanban (paralelos ao Gerenciar)
type PeriodoP3 = 'todos' | '7' | '30' | '90';
type CompatP3 = 'todos' | 'sem' | 'em_andamento' | 'revisao' | 'cliente' | 'aprovada';
type TarefasP3 = 'todos' | 'atrasadas';

// Formatação compacta de valores monetários
// Exemplos: 420000 → "R$ 420k" · 1_250_000 → "R$ 1.3M" · 850 → "R$ 850"
function fmtMoedaCompacta(valor: number): string {
  if (!Number.isFinite(valor) || valor <= 0) return 'R$ 0';
  if (valor >= 1_000_000) {
    const m = valor / 1_000_000;
    return `R$ ${m >= 10 ? Math.round(m) : m.toFixed(1).replace('.', ',')}M`;
  }
  if (valor >= 1_000) {
    return `R$ ${Math.round(valor / 1_000)}k`;
  }
  return `R$ ${Math.round(valor)}`;
}

function fmtMoedaCompleta(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor);
}

const STATUS_PARA_BUCKET_COMPAT_P3 = (s: string | undefined): CompatP3 => {
  if (!s || s === 'idle') return 'sem';
  if (['pending', 'processando', 'compatibilizando'].includes(s)) return 'em_andamento';
  if (['concluida', 'completed', 'pendente_revisao', 'revisado'].includes(s)) return 'revisao';
  if (s === 'enviado') return 'cliente';
  if (s === 'aprovado') return 'aprovada';
  return 'sem';
};

// P3: KPI card clicável (mesmo padrão do KpiCardAdmin do Gerenciar)
function KpiCardCRM({
  icon, label, value, valueTitle, color, active, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  /** Tooltip do valor (ex: valor completo em moeda) */
  valueTitle?: string;
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
        <div
          className="text-xl font-bold leading-none text-foreground tabular-nums shrink-0"
          title={valueTitle}
        >
          {value}
        </div>
      </div>
    </button>
  );
}

// Fase D: adapter de OrcamentoCRMComChecklist → Orcamento (tipo global).
// Não cria adapter de dados perdidos — apenas mapeia campos comuns. A
// FichaOperacionalAdmin recebe esse shim como `orcamento` e o objeto CRM
// original via prop `crm` para tabs operacionais.
function crmParaOrcamentoShim(crm: OrcamentoCRMComChecklist): Orcamento {
  let status: 'aberto' | 'fechado' | 'pausado' = 'aberto';
  if (crm.congelado) status = 'pausado';
  else if (isEtapaArquivada(crm.etapa_crm)) status = 'fechado';

  return {
    id: crm.id,
    dataPublicacao: new Date(crm.data_publicacao || crm.created_at),
    necessidade: crm.necessidade,
    arquivos: [],
    fotos: [],
    categorias: crm.categorias,
    local: crm.local,
    tamanhoImovel: crm.tamanho_imovel ?? 0,
    dataInicio: crm.data_inicio ? new Date(crm.data_inicio) : new Date(),
    prazoInicioTexto: crm.prazo_inicio_texto ?? undefined,
    quantidadeEmpresas: crm.fornecedores_inscritos_count,
    status,
    fornecedoresInscritos: [],
    gestor_conta_id: crm.gestor_conta_id ?? undefined,
    gestor_conta: crm.gestor_conta_id && crm.gestor_nome
      ? { id: crm.gestor_conta_id, nome: crm.gestor_nome, email: '', empresa: '', status: 'aprovado' }
      : undefined,
    dadosContato: crm.dados_contato ?? undefined,
  };
}

export const CRMKanbanOrcamentos = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { etapasAtivas: etapasConfigBanco } = useEtapasConfig('orcamentos');
  const {
    orcamentos,
    isLoading,
    refetch,
    buscarHistorico,
    buscarFornecedoresInscritos,
    moverEtapa,
    atualizarStatusContato,
    atualizarObservacoes,
    atualizarValorLead,
    registrarFeedback,
    moverEtapaEmMassa,
    isMovendoEmMassa,
    motivosPerda,
    marcarComoGanho,
    marcarComoPerdido,
    isProcessando,
    apropriarOrcamento,
    isApropriando
  } = useCRMOrcamentos(profile);

  // Hook separado para congelar/descongelar (Fase D1)
  const { congelarOrcamento, descongelarOrcamento } = useCongelarOrcamento();

  const [orcamentoSelecionado, setOrcamentoSelecionado] = useState<OrcamentoCRMComChecklist | null>(null);
  const [historico, setHistorico] = useState<HistoricoMovimentacao[]>([]);
  const [fornecedoresInscritos, setFornecedoresInscritos] = useState<FornecedorInscrito[]>([]);
  const [filtros, setFiltros] = useState<FiltrosCRM>({
    concierge: 'todos'
  });
  const [cardsSelecionados, setCardsSelecionados] = useState<Set<string>>(new Set());
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [exibirArquivadas, setExibirArquivadas] = useState<boolean>(() => {
    const saved = localStorage.getItem('crm-exibir-arquivadas');
    return saved ? JSON.parse(saved) : false;
  });
  const [modalPerdido, setModalPerdido] = useState<OrcamentoCRMComChecklist | null>(null);
  const [modalCongelar, setModalCongelar] = useState<OrcamentoCRMComChecklist | null>(null);
  const [modalApropriar, setModalApropriar] = useState(false);

  // P3: filtros premium com persistência URL
  const [buscaP3, setBuscaP3] = useState(() => searchParams.get('q') ?? '');
  const [periodoP3, setPeriodoP3] = useState<PeriodoP3>(() => {
    const v = searchParams.get('periodo');
    return (v === '7' || v === '30' || v === '90') ? v : 'todos';
  });
  const [compatP3, setCompatP3] = useState<CompatP3>(() => {
    const v = searchParams.get('compat');
    return (v === 'sem' || v === 'em_andamento' || v === 'revisao' || v === 'cliente' || v === 'aprovada') ? v : 'todos';
  });
  const [tarefasP3, setTarefasP3] = useState<TarefasP3>(() => {
    return searchParams.get('tarefas') === 'atrasadas' ? 'atrasadas' : 'todos';
  });
  const [compatStatusMapP3, setCompatStatusMapP3] = useState<Record<string, string>>({});
  // Pré-SDR: count separado (esses leads NÃO entram no Kanban operacional)
  const [preSDRCount, setPreSDRCount] = useState<number>(0);
  const [isFiltrandoFornecedores, setIsFiltrandoFornecedores] = useState(false);
  const [compatCRMOrcamento, setCompatCRMOrcamento] = useState<OrcamentoCRMComChecklist | null>(null);
  const [compatCRMModalOpen, setCompatCRMModalOpen] = useState(false);

  // Restaurar filtros do localStorage
  useEffect(() => {
    const filtrosSalvos = localStorage.getItem('crm-filtros');
    if (filtrosSalvos) {
      try {
        setFiltros(JSON.parse(filtrosSalvos));
      } catch (e) {
        console.error('Erro ao restaurar filtros:', e);
      }
    }
  }, []);

  // Salvar filtros no localStorage
  useEffect(() => {
    localStorage.setItem('crm-filtros', JSON.stringify(filtros));
  }, [filtros]);

  // Salvar preferência de exibição de arquivadas
  useEffect(() => {
    localStorage.setItem('crm-exibir-arquivadas', JSON.stringify(exibirArquivadas));
  }, [exibirArquivadas]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        // Usar ref ou callback para acessar o valor atual
        setCardsSelecionados(() => {
          const ids = new Set<string>(orcamentosAtivos.map(o => o.id));
          toast({ title: `${ids.size} orçamento(s) selecionado(s)` });
          return ids;
        });
      }

      if (e.key === 'Escape' && cardsSelecionados.size > 0) {
        setCardsSelecionados(new Set());
        toast({
          title: 'Seleção cancelada',
        });
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [cardsSelecionados.size, toast]);

  const calcularPeriodoFiltro = (tipo: string) => {
    const hoje = new Date();
    let inicio: Date, fim: Date = hoje;

    switch (tipo) {
      case 'ultimos_7_dias':
        inicio = new Date(hoje);
        inicio.setDate(inicio.getDate() - 7);
        break;
      case 'ultimos_30_dias':
        inicio = new Date(hoje);
        inicio.setDate(inicio.getDate() - 30);
        break;
      case 'mes_atual':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        break;
      case 'mes_anterior':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
        break;
      default:
        return null;
    }

    return {
      inicio: inicio.toISOString().split('T')[0],
      fim: fim.toISOString().split('T')[0]
    };
  };

  const aplicarFiltros = useCallback(async (orcamentos: OrcamentoCRMComChecklist[], filtros: FiltrosCRM, abortSignal?: AbortSignal) => {
    // Garantir que orcamentos sempre seja um array
    if (!orcamentos) return [];
    
    let resultado = orcamentos;

    // Primeiro, aplicar filtro de fornecedores se existir (requer consulta async)
    if (filtros.fornecedoresIds && filtros.fornecedoresIds.length > 0) {
      setIsFiltrandoFornecedores(true);
      
      try {
        const queryBuilder = supabase
          .from('candidaturas_fornecedores')
          .select('orcamento_id')
          .in('fornecedor_id', filtros.fornecedoresIds)
          .is('data_desistencia', null);

        // Adicionar abort signal se disponível
        const { data: candidaturas } = abortSignal 
          ? await queryBuilder.abortSignal(abortSignal)
          : await queryBuilder;

        // Verificar se a operação foi abortada
        if (abortSignal?.aborted) {
          return [];
        }

        const orcamentosComFornecedores = new Set(candidaturas?.map(c => c.orcamento_id) || []);
        resultado = resultado.filter(orc => orcamentosComFornecedores.has(orc.id));
      } catch (error) {
        if (abortSignal?.aborted) {
          return [];
        }
        console.error('Erro ao filtrar fornecedores:', error);
      } finally {
        setIsFiltrandoFornecedores(false);
      }
    }

    // Aplicar os demais filtros síncronos
    return resultado.filter((orc) => {
      if (filtros.concierge && filtros.concierge !== 'todos') {
        if (filtros.concierge === 'meus' && orc.concierge_responsavel_id !== profile?.id) return false;
        if (filtros.concierge === 'sem_responsavel' && orc.concierge_responsavel_id !== null) return false;
        if (filtros.concierge !== 'meus' && filtros.concierge !== 'sem_responsavel' && orc.concierge_responsavel_id !== filtros.concierge) return false;
      }

      if (filtros.statusContato?.length && !filtros.statusContato.includes(orc.status_contato)) {
        return false;
      }

      if (filtros.periodo) {
        let dataInicio: string, dataFim: string;
        
        if (filtros.periodo.tipo === 'personalizado') {
          if (!filtros.periodo.inicio || !filtros.periodo.fim) return true;
          dataInicio = filtros.periodo.inicio;
          dataFim = filtros.periodo.fim;
        } else {
          const periodo = calcularPeriodoFiltro(filtros.periodo.tipo);
          if (!periodo) return true;
          dataInicio = periodo.inicio;
          dataFim = periodo.fim;
        }

        const dataOrc = orc.created_at.split('T')[0];
        if (dataOrc < dataInicio || dataOrc > dataFim) return false;
      }

      if (filtros.fornecedoresInscritos) {
        const count = orc.fornecedores_inscritos_count;
        if (filtros.fornecedoresInscritos.min !== undefined && count < filtros.fornecedoresInscritos.min) return false;
        if (filtros.fornecedoresInscritos.max !== undefined && count > filtros.fornecedoresInscritos.max) return false;
      }

      if (filtros.propostasEnviadas) {
        const count = orc.propostas_enviadas_count;
        if (filtros.propostasEnviadas.min !== undefined && count < filtros.propostasEnviadas.min) return false;
        if (filtros.propostasEnviadas.max !== undefined && count > filtros.propostasEnviadas.max) return false;
      }

      if (filtros.categorias?.length) {
        const temCategoria = filtros.categorias.some(cat => orc.categorias.includes(cat));
        if (!temCategoria) return false;
      }

      if (filtros.iniciosPretendidos?.length) {
        if (!orc.prazo_inicio_texto || !filtros.iniciosPretendidos.includes(orc.prazo_inicio_texto)) {
          return false;
        }
      }

      if (filtros.busca) {
        const termo = filtros.busca.toLowerCase();
        const textoCompleto = [
          orc.dados_contato?.nome,
          orc.dados_contato?.telefone,
          orc.codigo_orcamento,
          orc.local,
          orc.necessidade
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!textoCompleto.includes(termo)) return false;
      }

      if (filtros.comFeedback !== null && filtros.comFeedback !== undefined) {
        const temFeedback = orc.feedback_cliente_nota !== null;
        if (filtros.comFeedback !== temFeedback) return false;
      }

      if (filtros.temAlerta !== undefined && filtros.temAlerta !== null) {
        if (filtros.temAlerta !== orc.tem_alertas) {
          return false;
        }
      }

      if (filtros.tags && filtros.tags.length > 0) {
        const temTag = orc.tags && orc.tags.some(tag => filtros.tags!.includes(tag.id));
        if (!temTag) return false;
      }

      // Filtrar por tarefas
      if (filtros.semTarefas) {
        if (orc.total_tarefas !== 0) return false;
      }
      
      if (filtros.tarefasAtrasadas) {
        if (!orc.tarefas_atrasadas || orc.tarefas_atrasadas === 0) return false;
      }
      
      if (filtros.tarefasHoje) {
        if (!orc.tarefas_hoje || orc.tarefas_hoje === 0) return false;
      }

      return true;
    });
  }, [profile?.id]);

  const [orcamentosFiltrados, setOrcamentosFiltrados] = useState<OrcamentoCRMComChecklist[]>([]);

  useEffect(() => {
    // Se não há orçamentos, não precisa filtrar
    if (!orcamentos) {
      setOrcamentosFiltrados([]);
      return;
    }

    const abortController = new AbortController();
    let timeoutId: NodeJS.Timeout;

    const aplicarFiltrosAsync = async () => {
      // Debounce de 300ms para evitar queries excessivas
      timeoutId = setTimeout(async () => {
        try {
          const filtrados = await aplicarFiltros(orcamentos, filtros, abortController.signal);
          
          // Só atualiza se não foi abortado
          if (!abortController.signal.aborted) {
            setOrcamentosFiltrados(filtrados || []);
          }
        } catch (error) {
          if (!abortController.signal.aborted) {
            console.error('Erro ao aplicar filtros:', error);
            setOrcamentosFiltrados([]);
          }
        }
      }, 300);
    };

    aplicarFiltrosAsync();

    // Cleanup: aborta a requisição anterior e cancela o timeout
    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [orcamentos, filtros, aplicarFiltros]);

  // Separar orçamentos ativos e arquivados
  const orcamentosAtivos = useMemo(
    () => orcamentosFiltrados.filter(o => !isEtapaArquivada(o.etapa_crm)),
    [orcamentosFiltrados]
  );

  const orcamentosArquivados = useMemo(
    () => orcamentosFiltrados.filter(o => isEtapaArquivada(o.etapa_crm)),
    [orcamentosFiltrados]
  );

  // Usar etapas do banco ou fallback para constantes
  const etapasAtivas = useMemo(() => {
    if (etapasConfigBanco && etapasConfigBanco.length > 0) {
      return etapasConfigBanco.filter(e => e.tipo === 'normal').map(e => ({
        valor: e.valor as any,
        titulo: e.titulo,
        descricao: e.descricao || '',
        cor: e.cor,
        icone: e.icone
      }));
    }
    return ETAPAS_CRM;
  }, [etapasConfigBanco]);

  const etapasArquivadas = useMemo(() => {
    if (etapasConfigBanco && etapasConfigBanco.length > 0) {
      return etapasConfigBanco.filter(e => e.tipo === 'arquivado').map(e => ({
        valor: e.valor as any,
        titulo: e.titulo,
        descricao: e.descricao || '',
        cor: e.cor,
        icone: e.icone
      }));
    }
    return ETAPAS_ARQUIVADAS;
  }, [etapasConfigBanco]);

  // Criar mapa de config por etapa para passar aos cards
  const configPorEtapa = useMemo(() => {
    const map: Record<string, typeof etapasConfigBanco[0]> = {};
    if (etapasConfigBanco) {
      etapasConfigBanco.forEach(e => {
        map[e.valor] = e;
      });
    }
    return map;
  }, [etapasConfigBanco]);

  // P3: batch fetch do status de compatibilização para todos os orçamentos ativos
  useEffect(() => {
    const ids = orcamentosAtivos.map(o => o.id);
    if (ids.length === 0) return;
    let cancelado = false;
    (async () => {
      const { data } = await (supabase as any)
        .from('compatibilizacoes_analises_ia')
        .select('orcamento_id, status')
        .in('orcamento_id', ids)
        .order('created_at', { ascending: false });
      if (cancelado || !data) return;
      const map: Record<string, string> = {};
      for (const row of data) {
        if (!map[row.orcamento_id]) map[row.orcamento_id] = row.status;
      }
      setCompatStatusMapP3(map);
    })();
    return () => { cancelado = true; };
  }, [orcamentosAtivos]);

  // Pré-SDR widget: count de leads em pré-atendimento (etapa null/orcamento_postado/contato_agendamento)
  // Esses leads não vêm em orcamentosAtivos (filtrados no hook); query separada barata.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const { count } = await (supabase as any)
        .from('orcamentos_crm_tracking')
        .select('orcamento_id', { count: 'exact', head: true })
        .in('etapa_crm', ['orcamento_postado', 'contato_agendamento']);
      if (cancelado) return;
      setPreSDRCount(count ?? 0);
    })();
    return () => { cancelado = true; };
  }, [orcamentos]);

  // P3: sincronizar filtros premium → URL (separado do filtros.* legado)
  useEffect(() => {
    const current = new URLSearchParams(window.location.search);
    const next = new URLSearchParams(current);
    const setOrDel = (k: string, v: string | null) => {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    };
    setOrDel('q',       buscaP3.trim() || null);
    setOrDel('periodo', periodoP3 === 'todos' ? null : periodoP3);
    setOrDel('compat',  compatP3 === 'todos' ? null : compatP3);
    setOrDel('tarefas', tarefasP3 === 'todos' ? null : tarefasP3);
    if (next.toString() !== current.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [buscaP3, periodoP3, compatP3, tarefasP3, setSearchParams]);

  // P3: aplicação dos filtros premium em cima de orcamentosAtivos
  const orcamentosAtivosFiltrados = useMemo(() => {
    const q = buscaP3.trim().toLowerCase();
    const cutoffMs = periodoP3 === 'todos' ? 0 : Date.now() - Number(periodoP3) * 86_400_000;

    return orcamentosAtivos.filter(o => {
      if (q) {
        const necessidade = (o.necessidade ?? '').toLowerCase();
        const local       = (o.local ?? '').toLowerCase();
        const codigo      = o.id.toLowerCase();
        const cliente     = (o.dados_contato?.nome ?? '').toLowerCase();
        if (!necessidade.includes(q) && !local.includes(q) && !codigo.includes(q) && !cliente.includes(q)) return false;
      }
      if (cutoffMs > 0) {
        const dt = new Date(o.created_at).getTime();
        if (dt < cutoffMs) return false;
      }
      if (compatP3 !== 'todos') {
        const bucket = STATUS_PARA_BUCKET_COMPAT_P3(compatStatusMapP3[o.id]);
        if (bucket !== compatP3) return false;
      }
      if (tarefasP3 === 'atrasadas' && (o.tarefas_atrasadas ?? 0) === 0) return false;
      return true;
    });
  }, [orcamentosAtivos, buscaP3, periodoP3, compatP3, tarefasP3, compatStatusMapP3]);

  // P3 + KPIs comerciais: contagens absolutas + valor carteira/fechamento
  const countsP3 = useMemo(() => {
    const k = { total: orcamentosAtivos.length, atrasadas: 0, valorCarteira: 0, valorFechamento: 0 };
    const periodos = { '7': 0, '30': 0, '90': 0 };
    const compat = { sem: 0, em_andamento: 0, revisao: 0, cliente: 0, aprovada: 0 };
    const agora = Date.now();
    orcamentosAtivos.forEach(o => {
      const ms = new Date(o.created_at).getTime();
      const dias = (agora - ms) / 86_400_000;
      if (dias <= 7) periodos['7']++;
      if (dias <= 30) periodos['30']++;
      if (dias <= 90) periodos['90']++;

      const bucket = STATUS_PARA_BUCKET_COMPAT_P3(compatStatusMapP3[o.id]);
      compat[bucket]++;

      if ((o.tarefas_atrasadas ?? 0) > 0) k.atrasadas++;

      // Valor por lead: prioriza valor manual do concierge; cai para estimativa IA legada
      const valor = (o.valor_lead_estimado ?? o.valor_estimado_ia_medio ?? 0) || 0;
      k.valorCarteira += valor;
      if (o.etapa_crm === 'fechamento_contrato' || o.etapa_crm === 'pos_venda_feedback') {
        k.valorFechamento += valor;
      }
    });
    return { kpis: k, periodos, compat };
  }, [orcamentosAtivos, compatStatusMapP3]);

  const filtrosP3Ativos = buscaP3.trim() !== ''
    || periodoP3 !== 'todos'
    || compatP3 !== 'todos'
    || tarefasP3 !== 'todos';

  const limparP3 = () => {
    setBuscaP3('');
    setPeriodoP3('todos');
    setCompatP3('todos');
    setTarefasP3('todos');
  };

  const chipsP3Ativos = useMemo(() => {
    const arr: Array<{ key: string; label: string; clear: () => void }> = [];
    const q = buscaP3.trim();
    if (q) arr.push({ key: 'q', label: `Busca: ${q}`, clear: () => setBuscaP3('') });
    if (periodoP3 !== 'todos') arr.push({ key: 'periodo', label: `Últimos ${periodoP3} dias`, clear: () => setPeriodoP3('todos') });
    if (compatP3 === 'em_andamento') arr.push({ key: 'compat', label: 'Compat. em andamento', clear: () => setCompatP3('todos') });
    if (compatP3 === 'revisao')      arr.push({ key: 'compat', label: 'Compat. pronta',  clear: () => setCompatP3('todos') });
    if (compatP3 === 'cliente')      arr.push({ key: 'compat', label: 'Enviada ao cliente',  clear: () => setCompatP3('todos') });
    if (compatP3 === 'aprovada')     arr.push({ key: 'compat', label: 'Compat. aprovada',    clear: () => setCompatP3('todos') });
    if (compatP3 === 'sem')          arr.push({ key: 'compat', label: 'Sem compatibilização', clear: () => setCompatP3('todos') });
    if (tarefasP3 === 'atrasadas')   arr.push({ key: 'tarefas', label: 'Tarefas atrasadas',  clear: () => setTarefasP3('todos') });
    return arr;
  }, [buscaP3, periodoP3, compatP3, tarefasP3]);

  // Nova esteira CRM: fusão visual em_orcamento + propostas_enviadas → coluna
  // "Agendar compatibilização". A coluna canônica é em_orcamento; leads em
  // propostas_enviadas aparecem nela e somem da própria coluna propostas_enviadas.
  const etapasKanbanOperacional = useMemo(() => {
    return etapasAtivas.filter(e => e.valor !== 'propostas_enviadas');
  }, [etapasAtivas]);

  const orcamentosPorEtapa = useMemo(() => {
    return etapasKanbanOperacional.reduce((acc, etapa) => {
      acc[etapa.valor] = orcamentosAtivosFiltrados.filter((orc) => {
        if (etapa.valor === 'em_orcamento') {
          // coluna "Agendar compatibilização" recebe em_orcamento + propostas_enviadas
          return orc.etapa_crm === 'em_orcamento' || orc.etapa_crm === 'propostas_enviadas';
        }
        return orc.etapa_crm === etapa.valor;
      });
      return acc;
    }, {} as Record<string, OrcamentoCRMComChecklist[]>);
  }, [orcamentosAtivosFiltrados, etapasKanbanOperacional]);

  const orcamentosArquivadosPorEtapa = useMemo(() => {
    return etapasArquivadas.reduce((acc, etapa) => {
      acc[etapa.valor] = orcamentosArquivados.filter((orc) => orc.etapa_crm === etapa.valor);
      return acc;
    }, {} as Record<string, OrcamentoCRMComChecklist[]>);
  }, [orcamentosArquivados, etapasArquivadas]);

  const handleAbrirDetalhes = async (orcamento: OrcamentoCRMComChecklist) => {
    setOrcamentoSelecionado(orcamento);
    const hist = await buscarHistorico(orcamento.id);
    setHistorico(hist);
    const fornecedores = await buscarFornecedoresInscritos(orcamento.id);
    setFornecedoresInscritos(fornecedores);
  };

  const handleFecharDetalhes = () => {
    setOrcamentoSelecionado(null);
    setHistorico([]);
    setFornecedoresInscritos([]);
  };

  // Detectar orcamentoId na URL para abrir card automaticamente (via notificação)
  useEffect(() => {
    const orcamentoIdParam = searchParams.get('orcamentoId');
    
    if (orcamentoIdParam && orcamentos && orcamentos.length > 0 && !orcamentoSelecionado) {
      const orcamento = orcamentos.find(o => o.id === orcamentoIdParam);
      
      if (orcamento) {
        handleAbrirDetalhes(orcamento);
        
        // Limpar parâmetros da URL após abrir
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('orcamentoId');
          newParams.delete('view');
          return newParams;
        });
      }
    }
  }, [searchParams, orcamentos, orcamentoSelecionado]);

  const handleToggleSelect = (id: string) => {
    setCardsSelecionados(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) {
        novo.delete(id);
      } else {
        novo.add(id);
      }
      return novo;
    });
  };

  const handleDesselecionar = () => {
    setCardsSelecionados(new Set());
  };

  const handleMoverEmMassa = (etapaDestino: EtapaCRM, observacao?: string) => {
    moverEtapaEmMassa({
      orcamentosIds: Array.from(cardsSelecionados),
      novaEtapa: etapaDestino,
      observacao
    });
    handleDesselecionar();
  };

  const handleMarcarGanho = (orcamentoId: string) => {
    if (confirm('Confirma que este orçamento foi GANHO (fechado)?')) {
      marcarComoGanho({ orcamentoId });
    }
  };

  const handleAbrirModalPerdido = (orcamento: OrcamentoCRMComChecklist) => {
    setModalPerdido(orcamento);
  };

  const handleConfirmarPerdido = (motivoPerdaId: string, justificativa?: string) => {
    if (modalPerdido) {
      marcarComoPerdido({
        orcamentoId: modalPerdido.id,
        motivoPerdaId,
        justificativa
      });
      setModalPerdido(null);
    }
  };

  const concierges = useMemo(() => {
    if (!orcamentos || orcamentos.length === 0) return [];
    
    return Array.from(
      new Map(
        orcamentos
          .filter((o) => o.concierge_responsavel_id && o.concierge_nome)
          .map((o) => [o.concierge_responsavel_id!, { id: o.concierge_responsavel_id!, nome: o.concierge_nome! }])
      ).values()
    );
  }, [orcamentos]);

  const orcamentosComAlerta = useMemo(() => {
    if (!orcamentos || orcamentos.length === 0) return 0;
    return orcamentos.filter(orc => orc.tem_alertas).length;
  }, [orcamentos]);

  // Avisos operacionais (QuadroAvisos) — montados a partir dos contadores já
  // calculados. Lista vazia => fallback "Tudo em dia". Críticos primeiro.
  const avisosOperacionais = useMemo<Aviso[]>(() => {
    const list: Aviso[] = [];
    if (countsP3.kpis.atrasadas > 0) list.push({
      id: 'tarefas-atrasadas',
      tom: 'red',
      icone: '⏰',
      contagem: countsP3.kpis.atrasadas,
      titulo: `${countsP3.kpis.atrasadas === 1 ? 'orçamento' : 'orçamentos'} com tarefas atrasadas`,
      descricao: 'Clique para filtrar e priorizar.',
      onClick: () => setTarefasP3(tarefasP3 === 'atrasadas' ? 'todos' : 'atrasadas'),
    });
    if (countsP3.compat.revisao > 0) list.push({
      id: 'compat-revisao',
      tom: 'amber',
      icone: '👁️',
      contagem: countsP3.compat.revisao,
      titulo: `${countsP3.compat.revisao === 1 ? 'compatibilização aguarda' : 'compatibilizações aguardam'} sua revisão`,
      descricao: 'IA concluída — pronto para revisar e aprovar.',
      onClick: () => setCompatP3(compatP3 === 'revisao' ? 'todos' : 'revisao'),
    });
    if (countsP3.compat.cliente > 0) list.push({
      id: 'compat-cliente',
      tom: 'blue',
      icone: '📤',
      contagem: countsP3.compat.cliente,
      titulo: `${countsP3.compat.cliente === 1 ? 'enviada ao cliente' : 'enviadas ao cliente'} · aguardando resposta`,
      descricao: 'Faça follow-up se passou de 3 dias.',
      onClick: () => setCompatP3(compatP3 === 'cliente' ? 'todos' : 'cliente'),
    });
    if (orcamentosComAlerta > 0) list.push({
      id: 'alertas-criticos',
      tom: 'red',
      icone: '⚠️',
      contagem: orcamentosComAlerta,
      titulo: `${orcamentosComAlerta === 1 ? 'orçamento com alerta' : 'orçamentos com alertas'} crítico${orcamentosComAlerta !== 1 ? 's' : ''}`,
      descricao: 'Verifique cards destacados no kanban abaixo.',
    });
    if (countsP3.periodos['7'] > 0) list.push({
      id: 'leads-recentes',
      tom: 'green',
      icone: '✋',
      contagem: countsP3.periodos['7'],
      titulo: `${countsP3.periodos['7'] === 1 ? 'lead novo' : 'leads novos'} esta semana`,
      descricao: 'Últimos 7 dias.',
      onClick: () => setPeriodoP3(periodoP3 === '7' ? 'todos' : '7'),
    });
    return list;
  }, [countsP3, orcamentosComAlerta, tarefasP3, compatP3, periodoP3]);

  const handleApropriar = (orcamentoId: string, gestorId: string | null) => {
    apropriarOrcamento({ orcamentoId, gestorId });
  };

  const contarFiltrosAtivos = () => {
    let count = 0;
    if (filtros.concierge && filtros.concierge !== 'todos') count++;
    if (filtros.statusContato?.length) count++;
    if (filtros.periodo) count++;
    if (filtros.fornecedoresInscritos) count++;
    if (filtros.propostasEnviadas) count++;
    if (filtros.categorias?.length) count++;
    if (filtros.fornecedoresIds?.length) count++;
    if (filtros.busca) count++;
    if (filtros.comFeedback !== null && filtros.comFeedback !== undefined) count++;
    if (filtros.temAlerta !== undefined && filtros.temAlerta !== null) count++;
    if (filtros.tags?.length) count++;
    if (filtros.iniciosPretendidos?.length) count++;
    if (filtros.semTarefas) count++;
    if (filtros.tarefasAtrasadas) count++;
    if (filtros.tarefasHoje) count++;
    return count;
  };

  const toggleFiltroAlerta = () => {
    if (filtros.temAlerta === true) {
      const { temAlerta, ...restoFiltros } = filtros;
      setFiltros(restoFiltros);
    } else {
      setFiltros({ ...filtros, temAlerta: true });
    }
  };

  const isAdminOrMaster = profile?.tipo_usuario === 'admin' || profile?.tipo_usuario === 'master';

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-4 gap-3 r100-fade">
        {/* skeleton KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[0,1,2,3].map(i => <div key={i} className="r100-skel" style={{ height: 72 }} />)}
        </div>
        {/* skeleton toolbar */}
        <div className="r100-skel" style={{ height: 44 }} />
        {/* skeleton colunas */}
        <div className="flex gap-3 overflow-hidden flex-1 min-h-0">
          {[0,1,2,3,4].map(col => (
            <div key={col} className="flex flex-col gap-2" style={{ flex: '0 0 320px' }}>
              <div className="r100-skel" style={{ height: 56, borderRadius: 12 }} />
              <div className="r100-skel" style={{ height: 110 }} />
              <div className="r100-skel" style={{ height: 110 }} />
              <div className="r100-skel" style={{ height: 110 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PremiumPageHeader
        title="CRM de Acompanhamento"
        subtitle="Acompanhe e mova os leads pelo pipeline"
        style={{ borderRadius: 0, marginBottom: 0 }}
      />

      {/* Quadro de avisos operacionais — carrossel premium com fallback */}
      <div className="px-4 pt-3">
        <QuadroAvisos avisos={avisosOperacionais} />
      </div>

      {/* KPIs operacionais + comerciais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 pt-3">
        <KpiCardCRM
          icon={<Inbox className="h-4 w-4" />}
          label="Total"
          value={countsP3.kpis.total}
          color="azul"
          active={!filtrosP3Ativos}
          onClick={limparP3}
        />
        <KpiCardCRM
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Tarefas atrasadas"
          value={countsP3.kpis.atrasadas}
          color="vm"
          active={tarefasP3 === 'atrasadas'}
          onClick={() => setTarefasP3(tarefasP3 === 'atrasadas' ? 'todos' : 'atrasadas')}
        />
        <KpiCardCRM
          icon={<BarChart2 className="h-4 w-4" />}
          label="Valor carteira"
          value={fmtMoedaCompacta(countsP3.kpis.valorCarteira)}
          valueTitle={`Carteira ativa: ${fmtMoedaCompleta(countsP3.kpis.valorCarteira)}`}
          color="vd"
        />
        <KpiCardCRM
          icon={<Hourglass className="h-4 w-4" />}
          label="Valor fechamento"
          value={fmtMoedaCompacta(countsP3.kpis.valorFechamento)}
          valueTitle={`Pipeline em fechamento: ${fmtMoedaCompleta(countsP3.kpis.valorFechamento)}`}
          color="lj"
        />
      </div>

      {/* Busca + dropdowns premium + ações secundárias (P5a — compacto) */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b bg-background">
        {/* Bloco esquerdo: busca + filtros principais */}
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="search"
            value={buscaP3}
            onChange={(e) => setBuscaP3(e.target.value)}
            placeholder="Buscar por necessidade, local, código ou cliente…"
            className="w-full h-9 pl-3 pr-9 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary"
          />
          {buscaP3 && (
            <button
              type="button"
              onClick={() => setBuscaP3('')}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted hover:bg-border flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <XIcon className="h-3 w-3" />
            </button>
          )}
        </div>

        <select
          value={periodoP3}
          onChange={(e) => setPeriodoP3(e.target.value as PeriodoP3)}
          className="h-9 px-3 rounded-lg border border-border bg-white text-sm cursor-pointer outline-none"
        >
          <option value="todos">Todo o período</option>
          <option value="7">Últimos 7 dias ({countsP3.periodos['7']})</option>
          <option value="30">Últimos 30 dias ({countsP3.periodos['30']})</option>
          <option value="90">Últimos 90 dias ({countsP3.periodos['90']})</option>
        </select>

        <select
          value={compatP3}
          onChange={(e) => setCompatP3(e.target.value as CompatP3)}
          className="h-9 px-3 rounded-lg border border-border bg-white text-sm cursor-pointer outline-none"
        >
          <option value="todos">Compatibilização</option>
          <option value="sem">Sem ({countsP3.compat.sem})</option>
          <option value="em_andamento">Em andamento ({countsP3.compat.em_andamento})</option>
          <option value="revisao">Compat. pronta ({countsP3.compat.revisao})</option>
          <option value="cliente">Enviada ao cliente ({countsP3.compat.cliente})</option>
          <option value="aprovada">Aprovada ({countsP3.compat.aprovada})</option>
        </select>

        {filtrosP3Ativos && (
          <Button variant="outline" size="sm" onClick={limparP3} className="h-9 text-xs">
            Limpar
          </Button>
        )}

        <Popover open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 h-9">
              <Filter className="h-4 w-4" />
              Avançado
              {contarFiltrosAtivos() > 0 && <Badge variant="secondary">{contarFiltrosAtivos()}</Badge>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <FiltrosAvancadosCRM
              filtros={filtros}
              onFiltrosChange={setFiltros}
              onClose={() => setFiltrosAbertos(false)}
              concierges={concierges}
            />
          </PopoverContent>
        </Popover>

        {/* Divisor flexível: empurra ações secundárias para a direita */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Pré-SDR widget — junto das ações secundárias (P5a) */}
          {preSDRCount > 0 && (
            <button
              type="button"
              onClick={() => setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set('view', 'lista');
                next.set('etapa', 'pre-sdr');
                return next;
              }, { replace: false })}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors text-xs font-bold"
              style={{ fontFamily: "'Syne', sans-serif" }}
              title="Abrir Gerenciar filtrado em Pré-SDR"
            >
              ⏳ Pré-SDR
              <span className="px-1.5 py-0.5 rounded-full bg-blue-200 text-blue-900 text-[10px] font-bold leading-none">
                {preSDRCount}
              </span>
              <span className="text-blue-500 text-sm leading-none">→</span>
            </button>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              refetch();
              toast({ title: '🔄 Atualizando...', description: 'Recarregando orçamentos do CRM' });
            }}
            title="Atualizar"
            className="h-9 w-9"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button
            variant={exibirArquivadas ? 'default' : 'outline'}
            onClick={() => setExibirArquivadas(!exibirArquivadas)}
            className="gap-2 h-9"
            size="sm"
          >
            {exibirArquivadas ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            Arquivadas
            {orcamentosArquivados.length > 0 && <Badge variant="secondary">{orcamentosArquivados.length}</Badge>}
          </Button>

          <Button
            variant="outline"
            onClick={async () => await exportarLeadsCRMExcel(orcamentosAtivosFiltrados)}
            className="gap-2 h-9"
            size="sm"
            title="Exportar leads filtrados para Excel"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>

          {isAdminOrMaster && (
            <Button
              variant="outline"
              onClick={() => setModalApropriar(true)}
              disabled={cardsSelecionados.size === 0}
              className="gap-2 h-9"
              size="sm"
            >
              <UserCheck className="h-4 w-4" />
              Apropriar ({cardsSelecionados.size})
            </Button>
          )}
        </div>

        {isFiltrandoFornecedores && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Aplicando filtros...</span>
          </div>
        )}
      </div>

      {/* Chips de filtros ativos P3 */}
      {chipsP3Ativos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b bg-background">
          {chipsP3Ativos.map(f => (
            <button
              key={`${f.key}-${f.label}`}
              type="button"
              onClick={f.clear}
              aria-label={`Remover filtro: ${f.label}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/15 transition-colors"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              {f.label}
              <span className="opacity-60 text-sm leading-none">×</span>
            </button>
          ))}
          <span className="text-xs text-muted-foreground self-center ml-1">
            {orcamentosAtivosFiltrados.length} de {orcamentosAtivos.length} leads
          </span>
        </div>
      )}

      {/* Card de produtividade - apenas para concierges */}
      {(profile?.tipo_usuario === 'gestor_conta' || profile?.tipo_usuario === 'customer_success') && profile.id && (
        <div className="px-4 pb-3">
          <CardProdutividadeConcierge usuarioId={profile.id} />
        </div>
      )}

      <div className="flex-1 min-w-0 horizontal-scroll-container">
        <div className="crm-kanban-container">
          {etapasKanbanOperacional.map((etapa) => (
            <ColunaKanban
              key={etapa.valor}
              etapa={etapa}
              orcamentos={orcamentosPorEtapa[etapa.valor] || []}
              onAtualizarStatusContato={atualizarStatusContato}
              onAtualizarValorLead={atualizarValorLead}
              onAbrirDetalhes={handleAbrirDetalhes}
              onCompatibilizacao={(orc) => { setCompatCRMOrcamento(orc); setCompatCRMModalOpen(true); }}
              cardsSelecionados={cardsSelecionados}
              onToggleSelect={handleToggleSelect}
              modoSelecao={cardsSelecionados.size > 0}
              configEtapa={configPorEtapa[etapa.valor]}
            />
          ))}

          {exibirArquivadas && etapasArquivadas.map((etapa) => (
            <ColunaKanban
              key={etapa.valor}
              etapa={etapa}
              orcamentos={orcamentosArquivadosPorEtapa[etapa.valor] || []}
              onAtualizarStatusContato={atualizarStatusContato}
              onAtualizarValorLead={atualizarValorLead}
              onAbrirDetalhes={handleAbrirDetalhes}
              onCompatibilizacao={(orc) => { setCompatCRMOrcamento(orc); setCompatCRMModalOpen(true); }}
              cardsSelecionados={cardsSelecionados}
              onToggleSelect={handleToggleSelect}
              modoSelecao={cardsSelecionados.size > 0}
              arquivada={true}
              configEtapa={configPorEtapa[etapa.valor]}
            />
          ))}
        </div>
      </div>

      {cardsSelecionados.size > 0 && (
        <BarraAcoesMassa
          quantidadeSelecionada={cardsSelecionados.size}
          onMoverEmMassa={handleMoverEmMassa}
          onDesselecionar={handleDesselecionar}
          isMovendo={isMovendoEmMassa}
        />
      )}

      {/* Fase D: drawer lateral premium substitui ModalDetalhesOrcamentoCRM */}
      <FichaOperacionalAdmin
        orcamento={orcamentoSelecionado ? crmParaOrcamentoShim(orcamentoSelecionado) : null}
        crm={orcamentoSelecionado}
        onClose={handleFecharDetalhes}
        onAbrirCompat={orcamentoSelecionado ? () => {
          setCompatCRMOrcamento(orcamentoSelecionado);
          setCompatCRMModalOpen(true);
        } : undefined}
        onMoverEtapa={orcamentoSelecionado ? (novaEtapa, obs) => {
          moverEtapa({ orcamentoId: orcamentoSelecionado.id, novaEtapa, observacao: obs });
        } : undefined}
        onMarcarGanho={orcamentoSelecionado ? () => {
          if (confirm('Confirma que este orçamento foi GANHO (fechado)?')) {
            marcarComoGanho({ orcamentoId: orcamentoSelecionado.id });
            handleFecharDetalhes();
          }
        } : undefined}
        onMarcarPerdido={orcamentoSelecionado ? () => {
          handleAbrirModalPerdido(orcamentoSelecionado);
        } : undefined}
        onCongelar={orcamentoSelecionado ? () => {
          setModalCongelar(orcamentoSelecionado);
        } : undefined}
        onDescongelar={orcamentoSelecionado ? () => {
          if (confirm('Confirma descongelar este orçamento?')) {
            descongelarOrcamento({ orcamentoId: orcamentoSelecionado.id });
          }
        } : undefined}
      />

      <MarcarPerdidoModal
        orcamento={modalPerdido}
        isOpen={!!modalPerdido}
        onClose={() => setModalPerdido(null)}
        onConfirm={handleConfirmarPerdido}
        motivosPerda={motivosPerda}
        isProcessando={isProcessando}
      />

      {modalCongelar && (
        <ModalCongelarOrcamento
          orcamento={modalCongelar}
          open={!!modalCongelar}
          onClose={() => setModalCongelar(null)}
        />
      )}

      <ApropriarOrcamentosGestor
        isOpen={modalApropriar}
        onClose={() => {
          setModalApropriar(false);
          setCardsSelecionados(new Set());
        }}
        orcamentosIds={Array.from(cardsSelecionados)}
      />

      <ModalCompatibilizacaoConsultor
        orcamento={compatCRMOrcamento ? {
          id:           compatCRMOrcamento.id,
          nome_contato: compatCRMOrcamento.dados_contato?.nome ?? null,
          necessidade:  compatCRMOrcamento.necessidade ?? null,
        } : null}
        isOpen={compatCRMModalOpen}
        onClose={() => setCompatCRMModalOpen(false)}
      />
    </div>
  );
};
