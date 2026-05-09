import { useState, useEffect, useMemo } from "react";
import { LeadMarcenariaComChecklist, HistoricoMarcenaria, EtapaMarcenaria } from "@/types/crmMarcenaria";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, MoveRight, CheckCircle, XCircle, AlertCircle, Loader2, Calendar } from "lucide-react";
import { useCRMMarcenaria } from "@/hooks/useCRMMarcenaria";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { NotasMarcenariaTab } from "./NotasMarcenariaTab";
import { TarefasMarcenariaTab } from "./TarefasMarcenariaTab";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChecklistEtapaMarcenaria } from "./ChecklistEtapaMarcenaria";
import { SeletorGestorMarcenaria } from "./SeletorGestorMarcenaria";
import { isEtapaArquivada } from "@/constants/crmMarcenaria";
import { MarcarGanhoModal } from "./MarcarGanhoModal";
import { MarcarPerdidoModalMarcenaria } from "./MarcarPerdidoModalMarcenaria";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { AnexosMarcenariaTab } from "./AnexosMarcenariaTab";
import { useEtapasConfig } from "@/hooks/useEtapasConfig";

interface ModalDetalhesLeadMarcenariaProps {
  lead: LeadMarcenariaComChecklist;
  open: boolean;
  onClose: () => void;
}

export function ModalDetalhesLeadMarcenaria({ lead, open, onClose }: ModalDetalhesLeadMarcenariaProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { etapas: etapasConfig, isLoading: isLoadingEtapas } = useEtapasConfig('marcenaria');
  const { 
    buscarHistorico, 
    atualizarObservacoes,
    isAtualizandoObservacoes,
    moverEtapa,
    isMovendo,
    marcarComoGanho,
    isMarcangoGanho,
    marcarComoPerdido,
    isMarcandoPerdido,
    motivosPerda,
    apropriarLead,
    isApropriando
  } = useCRMMarcenaria(profile);
  
  const [historico, setHistorico] = useState<HistoricoMarcenaria[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [observacoes, setObservacoes] = useState(lead.observacoes_internas || '');
  const [valorEstimado, setValorEstimado] = useState<string>(
    lead.valor_estimado?.toString() || ''
  );
  const [isSalvandoValor, setIsSalvandoValor] = useState(false);
  const [etapaSelecionada, setEtapaSelecionada] = useState<string>(lead.etapa_marcenaria);
  const [observacaoMovimento, setObservacaoMovimento] = useState('');
  const [modalGanhoOpen, setModalGanhoOpen] = useState(false);
  const [modalPerdidoOpen, setModalPerdidoOpen] = useState(false);
  const [consultorSelecionado, setConsultorSelecionado] = useState<string | null>(
    lead.consultor_responsavel_id || null
  );

  const etapasNormais = useMemo(() => 
    etapasConfig.filter(e => e.tipo === 'normal' && e.ativo && e.valor !== 'identificacao_automatica'),
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
    if (open) {
      carregarHistorico();
      setObservacoes(lead.observacoes_internas || '');
      setEtapaSelecionada(lead.etapa_marcenaria);
      setConsultorSelecionado(lead.consultor_responsavel_id || null);
    }
  }, [open, lead.id, lead.observacoes_internas, lead.etapa_marcenaria, lead.consultor_responsavel_id]);

  const carregarHistorico = async () => {
    setLoadingHistorico(true);
    try {
      const hist = await buscarHistorico(lead.id);
      setHistorico(hist);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoadingHistorico(false);
    }
  };

  const handleSalvarObservacoes = () => {
    atualizarObservacoes({ leadId: lead.id, observacoes });
  };

  const handleSalvarValorEstimado = async () => {
    if (!valorEstimado || parseFloat(valorEstimado) < 0) {
      toast({
        variant: 'destructive',
        title: 'Valor inválido',
        description: 'Digite um valor válido'
      });
      return;
    }

    setIsSalvandoValor(true);
    try {
      const { error } = await supabase
        .from('crm_marcenaria_leads')
        .update({ 
          valor_estimado: parseFloat(valorEstimado),
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Valor estimado atualizado'
      });
      queryClient.invalidateQueries({ queryKey: ['crm-marcenaria-leads'] });
    } catch (error) {
      console.error('Erro ao atualizar valor estimado:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao atualizar valor estimado'
      });
    } finally {
      setIsSalvandoValor(false);
    }
  };

  const handleAlterarResponsavel = () => {
    if (consultorSelecionado === lead.consultor_responsavel_id) {
      toast({
        variant: 'destructive',
        title: 'Sem alteração',
        description: 'Selecione um consultor diferente do atual'
      });
      return;
    }

    apropriarLead({ 
      leadId: lead.id, 
      consultorId: consultorSelecionado 
    });
  };

  const handleMoverEtapa = () => {
    if (etapaSelecionada === lead.etapa_marcenaria) {
      toast({
        variant: 'destructive',
        title: 'Etapa não alterada',
        description: 'Selecione uma etapa diferente da atual'
      });
      return;
    }
    moverEtapa({ 
      leadId: lead.id, 
      novaEtapa: etapaSelecionada as EtapaMarcenaria, 
      observacao: observacaoMovimento || undefined 
    });
    setObservacaoMovimento('');
  };

  const handleConfirmarGanho = (valorContrato: number, observacoesGanho?: string) => {
    marcarComoGanho({ leadId: lead.id, valorContrato });
    setModalGanhoOpen(false);
    onClose();
  };

  const handleConfirmarPerdido = (motivoId: string, justificativa?: string) => {
    marcarComoPerdido({ leadId: lead.id, motivoId, justificativa });
    setModalPerdidoOpen(false);
    onClose();
  };

  const getEtapaConfig = () => {
    return etapasConfig.find(e => e.valor === lead.etapa_marcenaria);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                🪚 {lead.cliente_nome || 'Lead sem nome'}
                {lead.codigo_orcamento && (
                  <Badge variant="outline">#{lead.codigo_orcamento}</Badge>
                )}
              </DialogTitle>
              {lead.consultor_nome && (
                <p className="text-sm text-muted-foreground mt-1">
                  Consultor: {lead.consultor_nome}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="informacoes" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="informacoes">Informações</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="tarefas">
              Tarefas
              {lead.tarefas_atrasadas > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 px-1 text-xs">
                  {lead.tarefas_atrasadas}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notas">
              Notas {lead.total_notas > 0 && `(${lead.total_notas})`}
            </TabsTrigger>
            <TabsTrigger value="anexos">Anexos</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          {/* Aba: Informações */}
          <TabsContent value="informacoes" className="space-y-4">
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold">Dados do Lead</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Necessidade</p>
                  <p>{lead.necessidade || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Local</p>
                  <p>{lead.local || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p>{lead.cliente_email || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Telefone</p>
                  <p>{lead.cliente_telefone || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Criado em</p>
                  <p>{format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Dias desde criação</p>
                  <p>{lead.dias_desde_criacao} dias</p>
                </div>
              </div>

              <div className="pt-3 border-t">
                <p className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Início Pretendido
                </p>
                <p>
                  {lead.data_inicio 
                    ? format(new Date(lead.data_inicio), "dd/MM/yyyy", { locale: ptBR })
                    : lead.prazo_inicio_texto || 'Não informado'
                  }
                </p>
              </div>

              {/* Alterar Responsável - Apenas Gestores/Admins */}
              {(profile?.tipo_usuario === 'master' || 
                profile?.tipo_usuario === 'admin' || 
                profile?.tipo_usuario === 'gestor_marcenaria' ||
                profile?.tipo_usuario === 'customer_success') && (
                <div className="space-y-2 pt-3 border-t">
                  <Label htmlFor="consultor-responsavel">Consultor Responsável</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SeletorGestorMarcenaria
                        value={consultorSelecionado}
                        onValueChange={setConsultorSelecionado}
                        placeholder="Selecione o consultor responsável"
                        permitirRemover={true}
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleAlterarResponsavel}
                      disabled={isApropriando || consultorSelecionado === lead.consultor_responsavel_id}
                    >
                      {isApropriando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Alterar
                    </Button>
                  </div>
                  {lead.consultor_nome && (
                    <p className="text-xs text-muted-foreground">
                      Atual: {lead.consultor_nome}
                    </p>
                  )}
                  {!lead.consultor_responsavel_id && (
                    <p className="text-xs text-amber-600">
                      ⚠️ Lead não apropriado
                    </p>
                  )}
                </div>
              )}

              {/* Valor Estimado */}
              <div className="space-y-2 pt-3 border-t">
                <Label htmlFor="valor-estimado">Valor Estimado (Opcional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="valor-estimado"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="R$ 0,00"
                    value={valorEstimado}
                    onChange={(e) => setValorEstimado(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleSalvarValorEstimado}
                    disabled={isSalvandoValor}
                  >
                    {isSalvandoValor && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Salvar
                  </Button>
                </div>
                {lead.valor_estimado && (
                  <p className="text-xs text-muted-foreground">
                    Valor atual: {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(lead.valor_estimado)}
                  </p>
                )}
              </div>
            </Card>

            {/* Movimentação do Lead */}
            {!isEtapaArquivada(lead.etapa_marcenaria) && (
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold text-base">Movimentação do Lead</h3>
                
                {/* Etapa Atual */}
                <div className="space-y-2">
                  <Label>Etapa Atual</Label>
                  <div>
                    <Badge className={getEtapaConfig()?.cor}>
                      {getEtapaConfig()?.icone} {getEtapaConfig()?.titulo}
                    </Badge>
                  </div>
                </div>

                {/* Seletor de Nova Etapa */}
                <div className="space-y-2">
                  <Label htmlFor="etapa-select">Mover para Etapa</Label>
                  <Select value={etapaSelecionada} onValueChange={setEtapaSelecionada}>
                    <SelectTrigger id="etapa-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {etapasNormais.map(etapa => (
                        <SelectItem key={etapa.valor} value={etapa.valor}>
                          {etapa.icone} {etapa.titulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Observação do Movimento */}
                <div className="space-y-2">
                  <Label htmlFor="obs-movimento">Observação (Opcional)</Label>
                  <Textarea
                    id="obs-movimento"
                    value={observacaoMovimento}
                    onChange={(e) => setObservacaoMovimento(e.target.value)}
                    placeholder="Motivo da movimentação..."
                    rows={2}
                  />
                </div>

                {/* Botão de Mover */}
                <Button 
                  onClick={handleMoverEtapa}
                  disabled={isMovendo || etapaSelecionada === lead.etapa_marcenaria}
                  className="w-full"
                >
                  {isMovendo ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MoveRight className="h-4 w-4 mr-2" />
                  )}
                  Mover para Nova Etapa
                </Button>

                {/* Botões de Ganho/Perdido */}
                <div className="pt-4 border-t space-y-3">
                  <h4 className="font-semibold text-sm">Ações Finais</h4>
                  <div className="flex gap-3">
                    <Button 
                      onClick={() => setModalGanhoOpen(true)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={isMarcangoGanho || isMarcandoPerdido}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Marcar como Ganho
                    </Button>
                    <Button 
                      onClick={() => setModalPerdidoOpen(true)}
                      variant="destructive"
                      className="flex-1"
                      disabled={isMarcangoGanho || isMarcandoPerdido}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Marcar como Perdido
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Lead Arquivado */}
            {isEtapaArquivada(lead.etapa_marcenaria) && (
              <Card className="p-4 border-2 border-dashed">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Este lead está arquivado como <strong>{lead.etapa_marcenaria === 'ganho' ? 'Ganho 🎉' : 'Perdido ❌'}</strong>
                    {lead.etapa_marcenaria === 'ganho' && lead.valor_contrato && (
                      <> com valor de R$ {lead.valor_contrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</>
                    )}
                  </AlertDescription>
                </Alert>
              </Card>
            )}

            {/* Observações Internas */}
            <Card className="p-4 space-y-4">
              <h3 className="font-semibold text-base">Observações Internas</h3>
              <div className="space-y-2">
                <Textarea
                  id="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Adicione observações sobre este lead..."
                  rows={4}
                />
                <Button 
                  onClick={handleSalvarObservacoes} 
                  size="sm"
                  disabled={isAtualizandoObservacoes}
                >
                  {isAtualizandoObservacoes && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Observações
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Aba: Checklist */}
          <TabsContent value="checklist">
            <ChecklistEtapaMarcenaria 
              lead={lead}
              nomeConsultor={lead.consultor_nome || profile?.nome || 'Consultor'}
            />
          </TabsContent>

          {/* Aba: Tarefas */}
          <TabsContent value="tarefas">
            <TarefasMarcenariaTab leadId={lead.id} />
          </TabsContent>

          {/* Aba: Notas */}
          <TabsContent value="notas">
            <NotasMarcenariaTab leadId={lead.id} />
          </TabsContent>

          {/* Aba: Anexos */}
          <TabsContent value="anexos">
            <AnexosMarcenariaTab leadId={lead.id} />
          </TabsContent>

          {/* Aba: Histórico */}
          <TabsContent value="historico" className="space-y-2">
            {loadingHistorico ? (
              <p className="text-center text-muted-foreground py-4">Carregando histórico...</p>
            ) : historico.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhuma movimentação registrada</p>
            ) : (
              historico.map((hist) => (
                <Card key={hist.id} className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {hist.etapa_anterior || 'Início'} → {hist.etapa_nova}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(hist.data_movimentacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Por: {hist.movido_por_nome}
                  </p>
                  {hist.observacao && (
                    <p className="text-xs text-muted-foreground italic">"{hist.observacao}"</p>
                  )}
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Modais de Ganho e Perdido */}
        <MarcarGanhoModal
          lead={lead}
          isOpen={modalGanhoOpen}
          onClose={() => setModalGanhoOpen(false)}
          onConfirm={handleConfirmarGanho}
          isProcessando={isMarcangoGanho}
        />

        <MarcarPerdidoModalMarcenaria
          lead={lead}
          isOpen={modalPerdidoOpen}
          onClose={() => setModalPerdidoOpen(false)}
          onConfirm={handleConfirmarPerdido}
          motivosPerda={motivosPerda}
          isProcessando={isMarcandoPerdido}
        />
      </DialogContent>
    </Dialog>
  );
}
