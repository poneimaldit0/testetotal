import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OrcamentoCRMComChecklist, HistoricoMovimentacao, EtapaCRM, FornecedorInscrito, ArquivoProposta } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ChecklistEtapaCRM } from './ChecklistEtapaCRM';
import { PainelVisitaReuniao } from './PainelVisitaReuniao';
import { SeletorGestorConta } from './SeletorGestorConta';
import { NotasCRMTab } from './NotasCRMTab';
import { TarefasCRMTab } from './TarefasCRMTab';
import { AvaliacaoInternaLead } from './AvaliacaoInternaLead';
import { ModalCongelarOrcamento } from './ModalCongelarOrcamento';
import { isEtapaArquivada } from '@/constants/crmEtapas';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useEtapasConfig } from '@/hooks/useEtapasConfig';
import { useCongelarOrcamento } from '@/hooks/useCRMOrcamentos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, User, MessageSquare, Star, CheckCircle, XCircle, Phone, Mail, Building2, UserCheck, Calendar, Download, Loader2, Zap, Snowflake, Flame, ArrowRightLeft, CalendarClock, Copy, ExternalLink, Upload, AlertCircle, ChevronDown, ChevronUp, Ban, RefreshCw, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePropostasArquivos } from '@/hooks/usePropostasArquivos';
import { useAnalisePropostaIA } from '@/hooks/useAnalisePropostaIA';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { STATUS_LABELS, STATUS_COLORS, StatusAcompanhamento } from '@/hooks/useStatusAcompanhamento';
import { useStatusAcompanhamentoConcierge, STATUS_CONCIERGE_OPTIONS, STATUS_CONCIERGE_LABELS, STATUS_CONCIERGE_COLORS, StatusAcompanhamentoConcierge } from '@/hooks/useStatusAcompanhamentoConcierge';
import { cn } from '@/lib/utils';
import { calcularValorTecnico, formatarBRL, formatarGap } from '@/utils/valorTecnico';

// â”€â”€ Upload de proposta por fornecedor (CRM) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function resolverStatusAnalise(
  statusAnalise: string,
  analise: { qualidade_leitura: string | null; valor_proposta: number | null; created_at: string } | null,
): { label: string; color: string; isOk: boolean; canResubmit?: boolean; canRemove?: boolean } | null {
  if (statusAnalise === 'idle' || statusAnalise === 'cancelada' || statusAnalise === 'failed') return null;

  if (
    statusAnalise === 'invalid' ||
    analise?.qualidade_leitura === 'proposta_incompleta' ||
    (statusAnalise === 'completed' && !analise?.valor_proposta)
  ) {
    return { label: 'Proposta sem valor', color: 'text-orange-600', isOk: false, canRemove: true };
  }

  if (statusAnalise === 'processing') {
    const travada =
      analise?.created_at != null &&
      Date.now() - new Date(analise.created_at).getTime() > 5 * 60 * 1000;
    return travada
      ? { label: 'Falha na leitura â€” reenvie a proposta', color: 'text-yellow-700', isOk: false, canResubmit: true, canRemove: true }
      : { label: 'AnÃ¡lise em andamento', color: 'text-blue-600', isOk: false };
  }

  if (statusAnalise === 'completed') {
    return { label: 'AnÃ¡lise concluÃ­da', color: 'text-green-600', isOk: true };
  }

  return null;
}

function FornecedorPropostaUpload({
  candidaturaId,
  orcamentoId,
  temPropostaInicial,
  onArquivoSubido,
}: {
  candidaturaId:    string;
  orcamentoId:      string;
  temPropostaInicial: boolean;
  onArquivoSubido?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { arquivos, uploading, uploadArquivo, removerArquivo } = usePropostasArquivos(candidaturaId, orcamentoId);
  const { analise, statusAnalise, solicitarAnalise, resetAnalise } = useAnalisePropostaIA(candidaturaId);
  const [removendo, setRemovendo] = useState(false);
  const temProposta = arquivos.length > 0;

  useEffect(() => {
    if (arquivos.length > 0) onArquivoSubido?.();
  }, [arquivos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const arquivoId = await uploadArquivo(file);
    if (arquivoId) await solicitarAnalise(arquivoId);
  };

  const handleExcluirProposta = async () => {
    setRemovendo(true);
    try {
      for (const arquivo of arquivos) {
        await removerArquivo(arquivo);
      }
      await supabase
        .from('propostas_analises_ia')
        .update({ status: 'cancelada' })
        .eq('candidatura_id', candidaturaId)
        .in('status', ['pending', 'processing', 'failed', 'invalid', 'completed']);
      resetAnalise();
    } finally {
      setRemovendo(false);
    }
  };

  const statusInfo = resolverStatusAnalise(statusAnalise, analise ?? null);
  const isProcessing = uploading || statusAnalise === 'processing' || removendo;

  return (
    <div className="flex flex-col gap-1 items-end">
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1"
        disabled={isProcessing}
        onClick={() => fileRef.current?.click()}
      >
        {isProcessing
          ? <Loader2 className="h-3 w-3 animate-spin" />
          : <Upload className="h-3 w-3" />
        }
        {temProposta ? 'Anexar nova versÃ£o' : 'Anexar proposta'}
      </Button>
      {statusInfo && (
        <div className="flex items-center gap-2">
          <span className={`text-[11px] flex items-center gap-1 ${statusInfo.color}`}>
            {statusInfo.isOk
              ? <CheckCircle className="h-3 w-3" />
              : <AlertCircle className="h-3 w-3" />
            }
            {statusInfo.label}
          </span>
          {statusInfo.canResubmit && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[11px] px-2 gap-1 border-yellow-400 text-yellow-700 hover:bg-yellow-50"
              disabled={isProcessing}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-3 w-3" />
              Reenviar
            </Button>
          )}
        </div>
      )}
      {arquivos.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[11px] px-2 gap-1 text-destructive hover:bg-destructive/10"
          disabled={removendo || uploading}
          onClick={handleExcluirProposta}
        >
          {removendo
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <XCircle className="h-3 w-3" />
          }
          Excluir proposta
        </Button>
      )}
      {statusAnalise === 'completed' && analise?.valor_proposta && (
        <span className="text-[11px] text-muted-foreground">
          {analise.valor_proposta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      )}
    </div>
  );
}

interface ModalDetalhesOrcamentoCRMProps {
  orcamento: OrcamentoCRMComChecklist | null;
  historico: HistoricoMovimentacao[];
  fornecedoresInscritos?: FornecedorInscrito[];
  onClose: () => void;
  onMoverEtapa: (orcamentoId: string, novaEtapa: EtapaCRM, observacao?: string) => void;
  onRegistrarFeedback: (orcamentoId: string, nota: number, comentario?: string) => void;
  onMarcarGanho?: (orcamento: OrcamentoCRMComChecklist) => void;
  onMarcarPerdido?: (orcamento: OrcamentoCRMComChecklist) => void;
  onApropriarOrcamento?: (orcamentoId: string, gestorId: string | null) => void;
  onEstimativaAtualizada?: () => void;
}

// Fase A do sprint admin UX: estimativa IA legada (gerar-estimativa-tecnica)
// fica oculta da UI operacional do CRM. Dados, edge function e usos no
// DashboardOperacional/SDR permanecem intactos. Para reativar visualmente,
// trocar para true.
const MOSTRAR_ESTIMATIVA_IA_LEGADA = false;

export const ModalDetalhesOrcamentoCRM = ({
  orcamento,
  historico,
  fornecedoresInscritos = [],
  onClose,
  onMoverEtapa,
  onRegistrarFeedback,
  onMarcarGanho,
  onMarcarPerdido,
  onApropriarOrcamento,
  onEstimativaAtualizada,
}: ModalDetalhesOrcamentoCRMProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { atualizarStatusConcierge } = useStatusAcompanhamentoConcierge();
  const { descongelarOrcamento, isDescongelando } = useCongelarOrcamento();
  const { etapas: etapasConfig, isLoading: isLoadingEtapas } = useEtapasConfig('orcamentos');
  const [novaEtapa, setNovaEtapa] = useState<EtapaCRM | ''>('');
  const [observacaoMovimento, setObservacaoMovimento] = useState('');
  const [notaFeedback, setNotaFeedback] = useState(5);
  const [comentarioFeedback, setComentarioFeedback] = useState('');
  const [fornecedores, setFornecedores] = useState<FornecedorInscrito[]>(fornecedoresInscritos);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [modalCongelarAberto, setModalCongelarAberto] = useState(false);
  const [horariosVisita, setHorariosVisita] = useState<Array<{ id: string; data_hora: string; fornecedor_id: string | null; fornecedor_nome: string | null }>>([]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [invalidadosPorConsultor, setInvalidadosPorConsultor] = useState<Set<string>>(new Set());
  const [recalculandoIA, setRecalculandoIA] = useState(false);

  const podeRecalcularIA = ['master', 'admin', 'gestor_conta', 'sdr'].includes(
    profile?.tipo_usuario ?? ''
  );

  const etapasNormais = useMemo(() => 
    etapasConfig.filter(e => e.tipo === 'normal' && e.ativo),
    [etapasConfig]
  );
  
  const etapasArquivadas = useMemo(() => 
    etapasConfig.filter(e => e.tipo === 'arquivado' && e.ativo),
    [etapasConfig]
  );

  const getTituloEtapa = (valor: string) => {
    return etapasConfig.find(e => e.valor === valor)?.titulo || valor;
  };

  useEffect(() => {
    if (orcamento) {
      setNotaFeedback(orcamento.feedback_cliente_nota || 5);
      setComentarioFeedback(orcamento.feedback_cliente_comentario || '');
    }
  }, [orcamento]);

  useEffect(() => {
    setFornecedores(fornecedoresInscritos);
  }, [fornecedoresInscritos]);

  // Carregar horÃ¡rios de visita tÃ©cnica
  useEffect(() => {
    if (!orcamento) return;
    const fetchHorarios = async () => {
      const { data } = await supabase
        .from('horarios_visita_orcamento')
        .select('id, data_hora, fornecedor_id, fornecedor:profiles!horarios_visita_orcamento_fornecedor_id_fkey(nome)')
        .eq('orcamento_id', orcamento.id);
      if (data) {
        setHorariosVisita(data.map((h: any) => ({
          id: h.id,
          data_hora: h.data_hora,
          fornecedor_id: h.fornecedor_id,
          fornecedor_nome: h.fornecedor?.nome || null,
        })));
      }
    };
    fetchHorarios();
  }, [orcamento?.id]);

  if (!orcamento) return null;

  const isAdminOrMaster = profile?.tipo_usuario === 'admin' || profile?.tipo_usuario === 'master';
  const vt = calcularValorTecnico(orcamento);

  const comProposta = fornecedores.filter(f => (f.arquivos_proposta?.length ?? 0) > 0 || f.proposta_enviada);
  const semProposta = fornecedores.filter(f => !f.proposta_enviada && !(f.arquivos_proposta?.length));

  const toggleCard = (id: string) =>
    setExpandedCards(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleInvalidar = (id: string) =>
    setInvalidadosPorConsultor(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const getBadgeStatus = (f: FornecedorInscrito) => {
    const isExternal = f.email === 'externo@reforma100.com';
    const temArquivo = (f.arquivos_proposta?.length ?? 0) > 0;
    if (!temArquivo && !f.proposta_enviada) return { label: 'Sem proposta',      cls: 'bg-gray-100 text-gray-600 border-gray-200' };
    if (isExternal)                         return { label: 'Proposta externa',   cls: 'bg-purple-100 text-purple-700 border-purple-200' };
    return                                         { label: 'Proposta recebida',  cls: 'bg-blue-100 text-blue-700 border-blue-200' };
  };

  const handleMoverEtapa = () => {
    if (novaEtapa) {
      onMoverEtapa(orcamento.id, novaEtapa, observacaoMovimento);
      setNovaEtapa('');
      setObservacaoMovimento('');
    }
  };

  const handleRegistrarFeedback = () => {
    onRegistrarFeedback(orcamento.id, notaFeedback, comentarioFeedback);
  };


  const handleAtualizarStatusConcierge = async (candidaturaId: string, novoStatus: string) => {
    const sucesso = await atualizarStatusConcierge(
      candidaturaId,
      novoStatus as StatusAcompanhamentoConcierge
    );

    if (sucesso) {
      // Atualizar localmente para refletir imediatamente
      setFornecedores(prev => 
        prev.map(f => 
          f.id === candidaturaId 
            ? { ...f, status_acompanhamento_concierge: novoStatus }
            : f
        )
      );
    }
  };

  const handleRecalcularIA = async () => {
    if (recalculandoIA || !orcamento) return;
    setRecalculandoIA(true);
    try {
      const { error } = await supabase.functions.invoke('gerar-estimativa-tecnica', {
        body: { orcamento_id: orcamento.id },
      });
      if (error) throw error;
      toast.success('Estimativa IA recalculada com sucesso!');
      onEstimativaAtualizada?.();
    } catch (err) {
      console.error('[recalcularIA] Erro:', err);
      toast.error('Erro ao recalcular estimativa IA. Tente novamente.');
    } finally {
      setRecalculandoIA(false);
    }
  };

  const handleDownloadProposta = async (arquivo: ArquivoProposta, fornecedorId: string) => {
    setDownloadingId(fornecedorId);
    try {
      const { data, error } = await supabase.storage
        .from('propostas-fornecedores')
        .download(arquivo.caminho_storage);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = arquivo.nome_arquivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar proposta:', error);
      toast({
        title: "Erro",
        description: "NÃ£o foi possÃ­vel baixar o arquivo da proposta",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Dialog open={!!orcamento} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Detalhes do OrÃ§amento #{orcamento.codigo_orcamento || orcamento.id.slice(0, 8)}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="detalhes">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="tarefas">
              Tarefas
              {orcamento.tarefas_atrasadas > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 px-1 text-xs">
                  {orcamento.tarefas_atrasadas}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="visita">Visita</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="notas">Notas</TabsTrigger>
          </TabsList>

          <TabsContent value="detalhes" className="space-y-4">
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Dados do Cliente
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Nome</label>
                  <p className="text-sm font-medium">{orcamento.dados_contato?.nome || 'NÃ£o informado'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Telefone</label>
                  <p className="text-sm flex items-center gap-1">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    {orcamento.dados_contato?.telefone || 'NÃ£o informado'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">E-mail</label>
                  <p className="text-sm flex items-center gap-1">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    {orcamento.dados_contato?.email || 'NÃ£o informado'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">LocalizaÃ§Ã£o</label>
                <p className="text-sm">{orcamento.local}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Tamanho do ImÃ³vel</label>
                <p className="text-sm">{orcamento.tamanho_imovel ? `${orcamento.tamanho_imovel}mÂ²` : 'NÃ£o informado'}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                InÃ­cio Pretendido
              </label>
              <p className="text-sm">
                {orcamento.data_inicio 
                  ? format(new Date(orcamento.data_inicio), "dd/MM/yyyy", { locale: ptBR })
                  : orcamento.prazo_inicio_texto || 'NÃ£o informado'
                }
              </p>
            </div>

            <div className="border rounded-lg p-4 bg-amber-50/40 border-amber-200">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Estimativa Técnica
                </h4>
                {vt.budgetCliente != null && (
                  <Badge variant="outline" className="bg-amber-100 border-amber-300 text-amber-800">
                    Confidencial
                  </Badge>
                )}
              </div>
              {vt.medio != null ? (
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Mínimo</p>
                    <p className="font-medium">{formatarBRL(vt.min)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Médio</p>
                    <p className="font-semibold text-gray-900">{formatarBRL(vt.medio)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Máximo</p>
                    <p className="font-medium">{formatarBRL(vt.max)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Estimativa técnica ainda não gerada.</p>
              )}
              {vt.budgetCliente != null && (
                <div className="flex items-center justify-between border-t pt-2 mt-3">
                  <div>
                    <p className="text-xs text-gray-500">Budget do cliente</p>
                    <p className="text-sm font-medium">{formatarBRL(vt.budgetCliente)}</p>
                  </div>
                  {vt.gapPercentual != null && (
                    <div className={`text-right ${vt.budgetAnomalo ? 'text-orange-600' : 'text-gray-600'}`}>
                      <p className="text-xs">Diferença</p>
                      <p className="text-sm font-semibold">{formatarGap(vt.gapPercentual)}</p>
                      {vt.budgetAnomalo && (
                        <p className="text-xs font-medium text-orange-600">⚠ Budget atípico</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              {vt.budgetCliente != null && (
                <p className="text-xs text-muted-foreground mt-2">
                  Informação visível apenas para gestores e administradores
                </p>
              )}
            </div>
            {/* Estimativa IA legada — oculta na UI do CRM (Fase A admin UX) */}
            {MOSTRAR_ESTIMATIVA_IA_LEGADA && podeRecalcularIA && (
              <div className="border rounded-lg p-4 bg-violet-50/50 border-violet-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2 text-violet-800">
                    <Brain className="h-4 w-4" />
                    Estimativa IA
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 border-violet-300 text-violet-700 hover:bg-violet-100"
                    disabled={recalculandoIA}
                    onClick={handleRecalcularIA}
                  >
                    {recalculandoIA
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <RefreshCw className="h-3 w-3" />
                    }
                    {recalculandoIA ? 'Recalculando...' : 'Recalcular'}
                  </Button>
                </div>
                {orcamento.valor_estimado_ia_medio ? (
                  <div className="space-y-1">
                    <p className="text-lg font-bold text-violet-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.valor_estimado_ia_medio)}
                    </p>
                    {(orcamento.valor_estimado_ia_min || orcamento.valor_estimado_ia_max) && (
                      <p className="text-xs text-violet-600">
                        Faixa:{' '}
                        {orcamento.valor_estimado_ia_min
                          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.valor_estimado_ia_min)
                          : 'â€”'
                        }
                        {' '}â€“{' '}
                        {orcamento.valor_estimado_ia_max
                          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.valor_estimado_ia_max)
                          : 'â€”'
                        }
                      </p>
                    )}
                    {orcamento.valor_estimado_ia_confianca && (
                      <p className="text-xs text-violet-600">
                        ConfianÃ§a: <span className="font-medium capitalize">{orcamento.valor_estimado_ia_confianca}</span>
                      </p>
                    )}
                    {orcamento.valor_estimado_ia_justificativa && (
                      <p className="text-xs text-muted-foreground italic mt-1">
                        {orcamento.valor_estimado_ia_justificativa}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-violet-600 italic">
                    Ainda sem estimativa. Clique em "Recalcular" para gerar.
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Necessidade</label>
              <p className="text-sm text-muted-foreground">{orcamento.necessidade}</p>
            </div>

            <div>
              <label className="text-sm font-medium">Categorias</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {orcamento.categorias.map((cat, idx) => (
                  <Badge key={idx}>{cat}</Badge>
                ))}
              </div>
            </div>

            {/* SeÃ§Ã£o Visita TÃ©cnica */}
            {horariosVisita.length > 0 && (
              <div className="border rounded-lg p-4 bg-accent/10 border-accent/20">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  Visita TÃ©cnica
                </h4>
                <div className="space-y-2">
                  {horariosVisita.map((h) => (
                    <div key={h.id} className="flex items-center gap-2 text-sm">
                      {h.fornecedor_id ? (
                        <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100">
                          âœ… {format(new Date(h.data_hora), "EEE, dd/MM 'Ã s' HH:mm", { locale: ptBR })} â€” {h.fornecedor_nome || 'Fornecedor'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                          â³ {format(new Date(h.data_hora), "EEE, dd/MM 'Ã s' HH:mm", { locale: ptBR })} â€” DisponÃ­vel
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* â”€â”€ Fornecedores â”€â”€ */}
            <div className="space-y-3">

              {/* Propostas recebidas */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Propostas recebidas ({comProposta.length})
                </h4>
                {comProposta.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nenhuma proposta recebida ainda</p>
                ) : (
                  <div className="space-y-2">
                    {comProposta.map((fornecedor) => {
                      const isExpanded  = expandedCards.has(fornecedor.id);
                      const isInvalid   = invalidadosPorConsultor.has(fornecedor.id);
                      const badge       = getBadgeStatus(fornecedor);
                      const temArquivo  = (fornecedor.arquivos_proposta?.length ?? 0) > 0;

                      return (
                        <div key={fornecedor.id} className={cn("border rounded-lg bg-background transition-all", isInvalid && "opacity-60 border-red-200")}>
                          {/* â”€â”€ CabeÃ§alho compacto â”€â”€ */}
                          <div
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none rounded-lg hover:bg-muted/30"
                            onClick={() => toggleCard(fornecedor.id)}
                          >
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-sm">{fornecedor.nome}</span>
                                {fornecedor.empresa !== fornecedor.nome && (
                                  <span className="text-xs text-muted-foreground">Â· {fornecedor.empresa}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <Badge className={cn("text-[10px] h-4 px-1.5 border", badge.cls)}>
                                  {badge.label}
                                </Badge>
                                {isInvalid && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-red-300 text-red-600">
                                    Invalidada
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {temArquivo && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[11px] px-2 gap-1"
                                  onClick={(e) => { e.stopPropagation(); handleDownloadProposta(fornecedor.arquivos_proposta![0], fornecedor.id); }}
                                  disabled={downloadingId === fornecedor.id}
                                >
                                  {downloadingId === fornecedor.id
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : <Download className="h-3 w-3" />}
                                  Baixar
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => { e.stopPropagation(); toggleCard(fornecedor.id); }}
                              >
                                {isExpanded
                                  ? <ChevronUp className="h-3 w-3" />
                                  : <ChevronDown className="h-3 w-3" />}
                              </Button>
                            </div>
                          </div>

                          {/* â”€â”€ Detalhes expandidos â”€â”€ */}
                          {isExpanded && (
                            <div className="border-t px-3 py-3 space-y-3">
                              <div className="flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-6 text-[11px] px-2 gap-1",
                                    isInvalid
                                      ? "text-blue-600 hover:bg-blue-50"
                                      : "text-red-600 hover:bg-red-50"
                                  )}
                                  onClick={() => toggleInvalidar(fornecedor.id)}
                                >
                                  <Ban className="h-3 w-3" />
                                  {isInvalid ? 'Revalidar proposta' : 'Invalidar proposta'}
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <span className="truncate">{fornecedor.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  <span>{fornecedor.telefone}</span>
                                </div>
                              </div>

                              <div className="space-y-2 pt-2 border-t">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                                      <User className="h-3 w-3" />
                                      Status do Fornecedor
                                    </label>
                                    {fornecedor.status_acompanhamento ? (
                                      <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[fornecedor.status_acompanhamento as StatusAcompanhamento])}>
                                        {STATUS_LABELS[fornecedor.status_acompanhamento as StatusAcompanhamento]}
                                      </Badge>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">NÃ£o informado</p>
                                    )}
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                                      <UserCheck className="h-3 w-3" />
                                      Acompanhamento Concierge
                                    </label>
                                    <Select
                                      value={fornecedor.status_acompanhamento_concierge || ''}
                                      onValueChange={(value) => handleAtualizarStatusConcierge(fornecedor.id, value)}
                                    >
                                      <SelectTrigger className="h-7 text-xs">
                                        <SelectValue placeholder="Selecionar status" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {STATUS_CONCIERGE_OPTIONS.map((status) => (
                                          <SelectItem key={status.valor} value={status.valor} className="text-xs">
                                            <div className="flex items-center gap-2">
                                              <div className={cn("w-2 h-2 rounded-full", STATUS_CONCIERGE_COLORS[status.valor])} />
                                              {status.label}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>

                              {/* Agendamento â€” visita ou reuniÃ£o */}
                              {(() => {
                                const agendamento = horariosVisita.find(h => h.fornecedor_id === fornecedor.id);
                                const st = fornecedor.status_acompanhamento as StatusAcompanhamento | null;
                                const isVisita  = st === 'visita_agendada'  || st === 'visita_realizada';
                                const isReuniao = st === 'reuniao_agendada' || st === 'reuniao_realizada';
                                const isRealizada = st === 'visita_realizada' || st === 'reuniao_realizada';
                                if (!agendamento && !isVisita && !isReuniao) return null;
                                const linkReuniao = (fornecedor as { link_reuniao?: string | null }).link_reuniao;
                                const label = st === 'visita_agendada'   ? 'Visita agendada'
                                            : st === 'visita_realizada'  ? 'Visita realizada'
                                            : st === 'reuniao_agendada'  ? 'ReuniÃ£o online agendada'
                                            : 'ReuniÃ£o online realizada';
                                return (
                                  <div className="pt-2 border-t space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                      <CalendarClock className="h-3 w-3" />
                                      {label}
                                    </label>
                                    {agendamento ? (
                                      <p className="text-sm font-medium">
                                        {format(new Date(agendamento.data_hora), "dd/MM/yyyy 'Ã s' HH:mm", { locale: ptBR })}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">
                                        {isRealizada ? 'Data nÃ£o registrada' : 'Aguardando confirmaÃ§Ã£o de data'}
                                      </p>
                                    )}
                                    {isReuniao && linkReuniao && (
                                      <a
                                        href={linkReuniao}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-primary underline flex items-center gap-1"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        Entrar na reuniÃ£o
                                      </a>
                                    )}
                                  </div>
                                );
                              })()}

                              <div className="pt-1">
                                <FornecedorPropostaUpload
                                  candidaturaId={fornecedor.id}
                                  orcamentoId={orcamento!.id}
                                  temPropostaInicial={fornecedor.proposta_enviada}
                                  onArquivoSubido={() => setFornecedores(prev =>
                                    prev.map(f => f.id === fornecedor.id ? { ...f, proposta_enviada: true } : f)
                                  )}
                                />
                              </div>

                              <p className="text-xs text-muted-foreground">
                                Inscrito em {format(new Date(fornecedor.data_candidatura), "dd/MM/yyyy 'Ã s' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Inscritos sem proposta */}
              {semProposta.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    Inscritos sem proposta ({semProposta.length})
                  </h4>
                  <div className="space-y-2">
                    {semProposta.map((fornecedor) => {
                      const isExpanded = expandedCards.has(fornecedor.id);
                      const badge      = getBadgeStatus(fornecedor);

                      return (
                        <div key={fornecedor.id} className="border rounded-lg bg-muted/10">
                          {/* CabeÃ§alho compacto */}
                          <div
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none rounded-lg hover:bg-muted/30"
                            onClick={() => toggleCard(fornecedor.id)}
                          >
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-sm">{fornecedor.nome}</span>
                                {fornecedor.empresa !== fornecedor.nome && (
                                  <span className="text-xs text-muted-foreground">Â· {fornecedor.empresa}</span>
                                )}
                              </div>
                              <Badge className={cn("mt-0.5 text-[10px] h-4 px-1.5 border", badge.cls)}>
                                {badge.label}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0"
                              onClick={e => { e.stopPropagation(); toggleCard(fornecedor.id); }}
                            >
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </Button>
                          </div>

                          {/* Detalhes */}
                          {isExpanded && (
                            <div className="border-t px-3 py-3 space-y-3">
                              <div className="flex gap-4 text-sm">
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Mail className="h-3 w-3" />{fornecedor.email}
                                </span>
                              </div>
                              {/* Agendamento â€” visita ou reuniÃ£o */}
                              {(() => {
                                const agendamento = horariosVisita.find(h => h.fornecedor_id === fornecedor.id);
                                const st = fornecedor.status_acompanhamento as StatusAcompanhamento | null;
                                const isVisita  = st === 'visita_agendada'  || st === 'visita_realizada';
                                const isReuniao = st === 'reuniao_agendada' || st === 'reuniao_realizada';
                                const isRealizada = st === 'visita_realizada' || st === 'reuniao_realizada';
                                if (!agendamento && !isVisita && !isReuniao) return null;
                                const linkReuniao = (fornecedor as { link_reuniao?: string | null }).link_reuniao;
                                const label = st === 'visita_agendada'   ? 'Visita agendada'
                                            : st === 'visita_realizada'  ? 'Visita realizada'
                                            : st === 'reuniao_agendada'  ? 'ReuniÃ£o online agendada'
                                            : 'ReuniÃ£o online realizada';
                                return (
                                  <div className="pt-2 border-t space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                      <CalendarClock className="h-3 w-3" />
                                      {label}
                                    </label>
                                    {agendamento ? (
                                      <p className="text-sm font-medium">
                                        {format(new Date(agendamento.data_hora), "dd/MM/yyyy 'Ã s' HH:mm", { locale: ptBR })}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">
                                        {isRealizada ? 'Data nÃ£o registrada' : 'Aguardando confirmaÃ§Ã£o de data'}
                                      </p>
                                    )}
                                    {isReuniao && linkReuniao && (
                                      <a
                                        href={linkReuniao}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-primary underline flex items-center gap-1"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        Entrar na reuniÃ£o
                                      </a>
                                    )}
                                  </div>
                                );
                              })()}
                              <div className="pt-1">
                                <FornecedorPropostaUpload
                                  candidaturaId={fornecedor.id}
                                  orcamentoId={orcamento!.id}
                                  temPropostaInicial={fornecedor.proposta_enviada}
                                  onArquivoSubido={() => setFornecedores(prev =>
                                    prev.map(f => f.id === fornecedor.id ? { ...f, proposta_enviada: true } : f)
                                  )}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Inscrito em {format(new Date(fornecedor.data_candidatura), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Nenhum fornecedor */}
              {fornecedores.length === 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Fornecedores Inscritos (0)
                  </h4>
                  <p className="text-sm text-muted-foreground italic">Nenhum fornecedor inscrito ainda</p>
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Concierge ResponsÃ¡vel
                </label>
                {!isAdminOrMaster && (
                  <Badge variant="secondary" className="text-xs">
                    Somente visualizaÃ§Ã£o
                  </Badge>
                )}
              </div>
              
              {isAdminOrMaster && onApropriarOrcamento ? (
                <SeletorGestorConta
                  value={orcamento.concierge_responsavel_id}
                  onValueChange={(gestorId) => onApropriarOrcamento(orcamento.id, gestorId)}
                  placeholder="Atribuir gestor responsÃ¡vel"
                  permitirRemover={true}
                />
              ) : (
                <p className="text-sm">
                  {orcamento.concierge_nome || (
                    <span className="text-muted-foreground italic">NÃ£o atribuÃ­do</span>
                  )}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Etapa Atual</label>
              <div className="mt-2">
                <Badge className="text-base py-2 px-4">
                  {getTituloEtapa(orcamento.etapa_crm)}
                </Badge>
              </div>
            </div>

            {/* SeÃ§Ã£o de Congelamento */}
            {!isEtapaArquivada(orcamento.etapa_crm) && (
              <div className="pt-4 border-t">
                {orcamento.congelado ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Snowflake className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-blue-700">Lead Congelado</span>
                    </div>
                    {orcamento.data_reativacao_prevista && (
                      <p className="text-sm text-blue-600 mb-2">
                        ReativaÃ§Ã£o prevista: {format(new Date(orcamento.data_reativacao_prevista), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    )}
                    {orcamento.motivo_congelamento && (
                      <p className="text-sm text-muted-foreground italic mb-3">
                        "{orcamento.motivo_congelamento}"
                      </p>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => descongelarOrcamento({ orcamentoId: orcamento.id })}
                      disabled={isDescongelando}
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      <Flame className="h-4 w-4 mr-2" />
                      {isDescongelando ? 'Reativando...' : 'Reativar Agora'}
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={() => setModalCongelarAberto(true)}
                    className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    <Snowflake className="h-4 w-4 mr-2" />
                    Congelar Lead
                  </Button>
                )}
              </div>
            )}

            {/* Rota100 â€” painel do cliente */}
            {orcamento.rota100_token && (
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Rota100 â€” painel do cliente</h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      const url = `${window.location.origin}/rota100/${orcamento.rota100_token}`;
                      navigator.clipboard.writeText(url);
                      toast.success('Link Rota100 copiado!');
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copiar link
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1" asChild>
                    <a href={`/rota100/${orcamento.rota100_token}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Abrir Rota100
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {/* AÃ§Ãµes de Ganho/Perdido */}
            {!isEtapaArquivada(orcamento.etapa_crm) && !orcamento.congelado && (onMarcarGanho || onMarcarPerdido) && (
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-3">AÃ§Ãµes do OrÃ§amento</h4>
                <div className="flex gap-3">
                  {onMarcarGanho && (
                    <Button 
                      onClick={() => onMarcarGanho(orcamento)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Marcar como Ganho
                    </Button>
                  )}
                  {onMarcarPerdido && (
                    <Button 
                      onClick={() => onMarcarPerdido(orcamento)}
                      variant="destructive"
                      className="flex-1"
                      size="lg"
                    >
                      <XCircle className="h-5 w-5 mr-2" />
                      Marcar como Perdido
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* InformaÃ§Ãµes de OrÃ§amento Arquivado */}
            {isEtapaArquivada(orcamento.etapa_crm) && (
              <Alert className="mt-4">
                <AlertDescription>
                  {orcamento.etapa_crm === 'perdido' ? (
                    <div className="space-y-2">
                      <p className="font-semibold text-destructive">OrÃ§amento Perdido</p>
                      {orcamento.motivo_perda_nome && (
                        <p className="text-sm">
                          <strong>Motivo:</strong> {orcamento.motivo_perda_nome}
                        </p>
                      )}
                      {orcamento.justificativa_perda && (
                        <p className="text-sm">
                          <strong>Justificativa:</strong> {orcamento.justificativa_perda}
                        </p>
                      )}
                      {orcamento.data_conclusao && (
                        <p className="text-xs text-muted-foreground">
                          ConcluÃ­do em {format(new Date(orcamento.data_conclusao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-green-600">OrÃ§amento Ganho</p>
                      {orcamento.data_conclusao && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ConcluÃ­do em {format(new Date(orcamento.data_conclusao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {isEtapaArquivada(orcamento.etapa_crm) && (
              <Alert className="mb-4">
                <AlertDescription className="text-sm">
                  â„¹ï¸ Este orÃ§amento estÃ¡ arquivado. VocÃª pode movÃª-lo de volta para o funil de vendas selecionando uma das etapas abaixo.
                </AlertDescription>
              </Alert>
            )}

            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-3">Mover para Nova Etapa</h4>
              <div className="space-y-3">
                <Select value={novaEtapa} onValueChange={(v) => setNovaEtapa(v as EtapaCRM)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione nova etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {etapasNormais.filter(e => e.valor !== orcamento.etapa_crm).map((etapa) => (
                      <SelectItem key={etapa.valor} value={etapa.valor}>
                        {etapa.icone} {etapa.titulo}
                      </SelectItem>
                    ))}
                    
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
                      Etapas Finais
                    </div>
                    
                    {etapasArquivadas.filter(e => e.valor !== orcamento.etapa_crm).map((etapa) => (
                      <SelectItem key={etapa.valor} value={etapa.valor}>
                        {etapa.icone} {etapa.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Textarea
                  placeholder="ObservaÃ§Ã£o sobre a movimentaÃ§Ã£o (opcional)"
                  value={observacaoMovimento}
                  onChange={(e) => setObservacaoMovimento(e.target.value)}
                />

                <Button onClick={handleMoverEtapa} disabled={!novaEtapa} className="w-full">
                  Mover para Nova Etapa
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="visita" className="space-y-4">
            <PainelVisitaReuniao
              orcamentoId={orcamento.id}
              fornecedores={fornecedores}
              onFornecedoresUpdated={setFornecedores}
            />
          </TabsContent>

          <TabsContent value="checklist" className="space-y-4">
            <ChecklistEtapaCRM
              orcamentoId={orcamento.id}
              etapaAtual={orcamento.etapa_crm}
              temAlertas={orcamento.tem_alertas}
              diasNaEtapa={orcamento.tempo_na_etapa_dias}
              dadosCliente={orcamento.dados_contato ? {
                nome: orcamento.dados_contato.nome,
                telefone: orcamento.dados_contato.telefone
              } : undefined}
              nomeGestor={orcamento.concierge_nome || profile?.nome}
            />
          </TabsContent>

          <TabsContent value="tarefas" className="space-y-4">
            <TarefasCRMTab orcamentoId={orcamento.id} />
          </TabsContent>

          <TabsContent value="timeline">
            <div className="space-y-4">
              {historico.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma movimentaÃ§Ã£o registrada
                </p>
              ) : (
                historico.map((item) => (
                  <div key={item.id} className={`border-l-2 pl-4 pb-4 ${item.tipo_movimentacao === 'transferencia' ? 'border-amber-400' : item.tipo_movimentacao === 'automatica' ? 'border-blue-400' : 'border-primary'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {item.tipo_movimentacao === 'transferencia' ? (
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                              <ArrowRightLeft className="h-3 w-3 mr-1" />
                              TransferÃªncia de Gestor
                            </Badge>
                          ) : (
                            <>
                              <Badge variant="outline">
                                {getTituloEtapa(item.etapa_nova)}
                              </Badge>
                              {item.etapa_anterior && (
                                <>
                                  <span className="text-xs text-muted-foreground">â†</span>
                                  <span className="text-xs text-muted-foreground">
                                    {getTituloEtapa(item.etapa_anterior)}
                                  </span>
                                </>
                              )}
                            </>
                          )}
                          {item.tipo_movimentacao === 'automatica' && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              <Zap className="h-3 w-3 mr-1" />
                              AutomÃ¡tico
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {item.movido_por_nome}
                        </p>
                        {item.observacao && (
                          <p className="text-sm mt-2 flex items-start gap-2">
                            <MessageSquare className="h-4 w-4 mt-0.5" />
                            {item.observacao}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(item.data_movimentacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            {/* SeÃ§Ã£o 1: AvaliaÃ§Ã£o Interna do Lead */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-4 text-base">AvaliaÃ§Ã£o Interna do Lead</h4>
              <AvaliacaoInternaLead orcamentoId={orcamento.id} />
            </div>

            {/* Separador */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Feedback do Cliente
                </span>
              </div>
            </div>

            {/* SeÃ§Ã£o 2: Feedback do Cliente */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Nota do Cliente (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Button
                      key={n}
                      variant={notaFeedback === n ? "default" : "outline"}
                      size="lg"
                      onClick={() => setNotaFeedback(n)}
                    >
                      <Star className={notaFeedback >= n ? "fill-current" : ""} />
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">ComentÃ¡rio do Cliente</label>
                <Textarea
                  value={comentarioFeedback}
                  onChange={(e) => setComentarioFeedback(e.target.value)}
                  placeholder="Feedback do cliente sobre o atendimento..."
                  rows={4}
                />
              </div>

              <Button onClick={handleRegistrarFeedback} className="w-full">
                Salvar Feedback
              </Button>

              {orcamento.feedback_cliente_nota && (
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2">Feedback Atual</h4>
                  <div className="flex items-center gap-2 mb-2">
                    {[...Array(orcamento.feedback_cliente_nota)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-current text-yellow-500" />
                    ))}
                  </div>
                  {orcamento.feedback_cliente_comentario && (
                    <p className="text-sm text-muted-foreground">
                      {orcamento.feedback_cliente_comentario}
                    </p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Aba Notas */}
          <TabsContent value="notas" className="space-y-4">
            <NotasCRMTab orcamentoId={orcamento.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Modal de Congelar */}
      <ModalCongelarOrcamento
        orcamento={orcamento}
        open={modalCongelarAberto}
        onClose={() => setModalCongelarAberto(false)}
      />
    </Dialog>
  );
};

