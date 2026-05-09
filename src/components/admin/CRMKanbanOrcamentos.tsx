import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCRMOrcamentos } from '@/hooks/useCRMOrcamentos';
import { ColunaKanban } from './crm/ColunaKanban';
import { ModalDetalhesOrcamentoCRM } from './crm/ModalDetalhesOrcamentoCRM';
import { FiltrosAvancadosCRM } from './crm/FiltrosAvancadosCRM';
import { BarraAcoesMassa } from './crm/BarraAcoesMassa';
import { MarcarPerdidoModal } from './crm/MarcarPerdidoModal';
import { ApropriarOrcamentosGestor } from './crm/ApropriarOrcamentosGestor';
import { ModalCompatibilizacaoConsultor } from './consultor/ModalCompatibilizacaoConsultor';
import { CardProdutividadeConcierge } from './crm/CardProdutividadeConcierge';
import { ETAPAS_CRM, ETAPAS_ARQUIVADAS, isEtapaArquivada } from '@/constants/crmEtapas';
import { OrcamentoCRMComChecklist, HistoricoMovimentacao, FiltrosCRM, EtapaCRM, FornecedorInscrito } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Filter, RefreshCw, Eye, EyeOff, UserCheck, AlertTriangle, Download } from 'lucide-react';
import { exportarLeadsCRMExcel } from '@/utils/exportacaoCRM';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useEtapasConfig } from '@/hooks/useEtapasConfig';

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
  const [modalApropriar, setModalApropriar] = useState(false);
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
        setCardsSelecionados(prev => {
          const todosIds = new Set<string>();
          toast({
            title: `Selecionando todos os orçamentos...`,
          });
          return todosIds;
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

  const orcamentosPorEtapa = useMemo(() => {
    return etapasAtivas.reduce((acc, etapa) => {
      acc[etapa.valor] = orcamentosAtivos.filter((orc) => orc.etapa_crm === etapa.valor);
      return acc;
    }, {} as Record<string, OrcamentoCRMComChecklist[]>);
  }, [orcamentosAtivos, etapasAtivas]);

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
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-background">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">CRM de Acompanhamento</h2>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Popover open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros
                    {contarFiltrosAtivos() > 0 && (
                      <Badge variant="secondary">{contarFiltrosAtivos()}</Badge>
                    )}
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

              <Button 
                variant="outline" 
                size="icon"
                onClick={() => {
                  refetch();
                  toast({
                    title: "🔄 Atualizando...",
                    description: "Recarregando orçamentos do CRM"
                  });
                }}
                title="Atualizar orçamentos"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

              <Button
                variant={exibirArquivadas ? 'default' : 'outline'}
                onClick={() => setExibirArquivadas(!exibirArquivadas)}
                className="gap-2"
              >
                {exibirArquivadas ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {exibirArquivadas ? 'Ocultar' : 'Exibir'} Arquivadas
                {orcamentosArquivados.length > 0 && (
                  <Badge variant="secondary">{orcamentosArquivados.length}</Badge>
                )}
              </Button>

              <Button
                variant={filtros.temAlerta ? "destructive" : "outline"}
                onClick={toggleFiltroAlerta}
                className="gap-2"
              >
                <AlertTriangle className={orcamentosComAlerta > 0 && !filtros.temAlerta ? "h-4 w-4 text-orange-500" : "h-4 w-4"} />
                <span>Tarefas Atrasadas</span>
                {orcamentosComAlerta > 0 && (
                  <Badge variant={filtros.temAlerta ? "secondary" : "destructive"}>
                    {orcamentosComAlerta}
                  </Badge>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={async () => await exportarLeadsCRMExcel(orcamentosFiltrados)}
                className="gap-2"
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
                  className="gap-2"
                >
                  <UserCheck className="h-4 w-4" />
                  Apropriar Selecionados
                </Button>
              )}
              
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {orcamentosAtivos.length} orçamento(s) em andamento
                  {contarFiltrosAtivos() > 0 && (
                    <span className="ml-2 text-primary">
                      • {contarFiltrosAtivos()} filtro(s) ativo(s)
                    </span>
                  )}
                </p>
                {isFiltrandoFornecedores && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Aplicando filtros...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card de produtividade - apenas para concierges */}
      {(profile?.tipo_usuario === 'gestor_conta' || profile?.tipo_usuario === 'customer_success') && profile.id && (
        <div className="px-4 pb-3">
          <CardProdutividadeConcierge usuarioId={profile.id} />
        </div>
      )}

      <div className="flex-1 min-w-0 horizontal-scroll-container">
        <div className="crm-kanban-container">
          {etapasAtivas.map((etapa) => (
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

      <ModalDetalhesOrcamentoCRM
        orcamento={orcamentoSelecionado}
        historico={historico}
        fornecedoresInscritos={fornecedoresInscritos}
        onClose={handleFecharDetalhes}
        onMoverEtapa={(id, etapa, obs) => {
          moverEtapa({ orcamentoId: id, novaEtapa: etapa, observacao: obs });
          handleFecharDetalhes();
        }}
        onRegistrarFeedback={(id, nota, com) => {
          registrarFeedback({ orcamentoId: id, nota, comentario: com });
        }}
        onMarcarGanho={(orc) => {
          if (confirm('Confirma que este orçamento foi GANHO (fechado)?')) {
            marcarComoGanho({ orcamentoId: orc.id });
            handleFecharDetalhes();
          }
        }}
        onMarcarPerdido={(orc) => {
          handleAbrirModalPerdido(orc);
          handleFecharDetalhes();
        }}
        onApropriarOrcamento={handleApropriar}
        onEstimativaAtualizada={refetch}
      />

      <MarcarPerdidoModal
        orcamento={modalPerdido}
        isOpen={!!modalPerdido}
        onClose={() => setModalPerdido(null)}
        onConfirm={handleConfirmarPerdido}
        motivosPerda={motivosPerda}
        isProcessando={isProcessando}
      />

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
