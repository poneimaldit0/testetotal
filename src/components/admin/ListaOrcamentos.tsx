
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOrcamento } from '@/context/OrcamentoContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, Mail, Users, Eye, Trash2, Clock, UserCheck, Edit, Timer, CalendarClock, Copy, ExternalLink, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';
import { ModalFornecedoresOrcamento } from './ModalFornecedoresOrcamento';
import { FiltroAvancadoOrcamentos } from './FiltroAvancadoOrcamentos';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { ApropriacaoGestorModal } from './ApropriacaoGestorModal';
import { EditarOrcamentoModal } from './EditarOrcamentoModal';
import { AcoesOrcamentoDropdown } from './AcoesOrcamentoDropdown';
import { ConfirmarFechamentoModal } from './ConfirmarFechamentoModal';
import { useCanManageOrcamentos } from '@/hooks/useCanManageOrcamentos';
import { useIsMaster } from '@/hooks/useIsMaster';
import { useOrcamentoActions } from '@/hooks/useOrcamentoActions';
import { Orcamento } from '@/types';
import { AnexosOrcamento } from '../fornecedor/AnexosOrcamento';
import { supabase } from '@/integrations/supabase/client';
import { ModalCompatibilizacaoConsultor } from './consultor/ModalCompatibilizacaoConsultor';

// ── Badge de status de compatibilização ──────────────────────────────────────
function CompatStatusBadge({ status }: { status: string | undefined }) {
  if (!status || status === 'idle') return null;
  const map: Record<string, { label: string; cls: string }> = {
    pending:          { label: 'Compat. gerando...', cls: 'border-gray-300 bg-gray-50 text-gray-600' },
    failed:           { label: 'Compat. falhou',     cls: 'border-red-300 bg-red-50 text-red-700' },
    completed:        { label: 'Revisar compat.',    cls: 'border-orange-300 bg-orange-50 text-orange-700' },
    pendente_revisao: { label: 'Revisar compat.',    cls: 'border-orange-300 bg-orange-50 text-orange-700' },
    revisado:         { label: 'Compat. revisada',   cls: 'border-blue-300 bg-blue-50 text-blue-700' },
    aprovado:         { label: 'Compat. aprovada',   cls: 'border-green-300 bg-green-50 text-green-700' },
    enviado:          { label: 'Compat. enviada',    cls: 'border-green-400 bg-green-100 text-green-800' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'border-gray-300 bg-gray-50 text-gray-600' };
  return (
    <Badge variant="outline" className={`flex items-center gap-1 text-xs ${cls}`}>
      <BarChart2 className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export const ListaOrcamentos: React.FC = () => {
  const { orcamentos, excluirOrcamento, isDeleting, carregarOrcamentos, recarregarComRetry, hasMore, carregarMais, isLoadingMore, totalCount } = useOrcamento();
  const canManage = useCanManageOrcamentos();
  const isMaster = useIsMaster();
  const [selectedOrcamento, setSelectedOrcamento] = useState<Orcamento | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filteredOrcamentos, setFilteredOrcamentos] = useState<Orcamento[]>([]);
  const [isFiltered, setIsFiltered] = useState(false);
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

  const { pausarOrcamento, reabrirOrcamento, fecharOrcamentoManualmente, isLoading: isActionLoading } = useOrcamentoActions(recarregarComRetry);

  const orcamentosToShow = isFiltered ? filteredOrcamentos : orcamentos;

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
    const ids = orcamentosToShow.map(o => o.id);
    fetchCompatStatus(ids);
    fetchCrmStages(ids);
  }, [orcamentosToShow, fetchCompatStatus, fetchCrmStages]);

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

  const handleFilteredResults = (filtered: Orcamento[]) => {
    setFilteredOrcamentos(filtered);
    setIsFiltered(true);
  };

  const handleClearFilter = () => {
    setFilteredOrcamentos([]);
    setIsFiltered(false);
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
      <h2 className="text-2xl font-bold text-secondary">
        Orçamentos Cadastrados
        {totalCount > 0 && (
          <Badge variant="outline" className="ml-3 text-sm font-normal">
            {orcamentosToShow.length} de {totalCount}
          </Badge>
        )}
      </h2>
      
      <FiltroAvancadoOrcamentos 
        onFilteredResults={handleFilteredResults}
        onClearFilter={handleClearFilter}
      />

      {isFiltered && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-blue-800 text-sm">
            Exibindo {filteredOrcamentos.length} orçamento(s) filtrado(s).
          </p>
        </div>
      )}
      
      {orcamentosToShow.length === 0 ? (
        <Card className="goodref-card">
          <CardContent className="p-6 text-center text-muted-foreground">
            {isFiltered ? 
              "Nenhum orçamento encontrado para o filtro aplicado." :
              "Nenhum orçamento cadastrado ainda."
            }
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 max-w-full overflow-hidden">
          {orcamentosToShow.map((orcamento) => (
            <Card key={orcamento.id} className="goodref-card w-full max-w-full box-border overflow-hidden">
              <CardHeader className="max-w-full overflow-hidden pb-4 space-y-0">
                <div className="flex flex-col gap-3 max-w-full overflow-hidden mb-0">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <CardTitle className="text-lg text-secondary break-all max-w-full">{orcamento.id}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Publicado em {format(orcamento.dataPublicacao, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap max-w-full overflow-hidden shrink-0">
                    <Badge className={`${getStatusColor(orcamento.status)} max-w-[120px] truncate`}>
                      {orcamento.status.toUpperCase()}
                    </Badge>
                    {/* Badge de embargo - mostrar se tem data de liberação futura */}
                    {orcamento.data_liberacao_fornecedores && new Date(orcamento.data_liberacao_fornecedores) > new Date() && (
                      <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-700 flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        Em embargo até {format(new Date(orcamento.data_liberacao_fornecedores), "dd/MM HH:mm")}
                      </Badge>
                    )}
                    <CompatStatusBadge status={compatStatusMap[orcamento.id]} />
                    {/* Badge Pré-SDR: aparece enquanto lead não passou pela validação do SDR */}
                    {(() => {
                      const etapa = crmStageMap[orcamento.id];
                      const isPreSDR = etapa === undefined
                        ? false // ainda carregando
                        : etapa === null || etapa === 'orcamento_postado' || etapa === 'contato_agendamento';
                      return isPreSDR ? (
                        <Badge variant="outline" className="border-blue-400 bg-blue-50 text-blue-700 flex items-center gap-1">
                          ⏳ Pré-atendimento SDR
                        </Badge>
                      ) : null;
                    })()}
                    {orcamento.categorias.map((categoria, index) => (
                      <Badge key={index} variant="secondary" className="max-w-[150px] truncate">
                        {categoria}
                      </Badge>
                    ))}
                  </div>
                </div>
            </CardHeader>
            <CardContent className="max-w-full overflow-hidden pt-2 pb-4">
              <div className="space-y-2 max-w-full overflow-hidden">
                  <p className="text-sm break-words overflow-wrap-anywhere leading-relaxed">{orcamento.necessidade}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm min-w-0 max-w-full overflow-hidden">
                    <div className="min-w-0 overflow-hidden">
                      <span className="font-medium">Local:</span> 
                      <span className="ml-1 truncate block">{orcamento.local}</span>
                    </div>
                    <div className="min-w-0 overflow-hidden">
                      <span className="font-medium">Tamanho:</span> 
                      <span className="ml-1 truncate block">{orcamento.tamanhoImovel || 'N/A'} m²</span>
                    </div>
                    <div className="min-w-0 overflow-hidden">
                      <span className="font-medium">Empresas interessadas:</span> 
                      <span className="ml-1 truncate block">{orcamento.quantidadeEmpresas}/3</span>
                    </div>
                    <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                      <Clock className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium shrink-0">Início pretendido:</span> 
                      <span className="ml-1 truncate block">{orcamento.prazoInicioTexto || 'Não informado'}</span>
                    </div>
                  </div>

                  {/* Seção Visita Técnica */}
                  {orcamento.horariosVisita && orcamento.horariosVisita.length > 0 && (
                    <div className="mt-2 p-3 bg-accent/10 rounded-lg border border-accent/20">
                      <div className="flex items-center gap-2 mb-2">
                        <CalendarClock className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm text-primary">Visita Técnica</span>
                      </div>
                      <div className="space-y-1">
                        {orcamento.horariosVisita.map((h) => (
                          <div key={h.id} className="flex items-center gap-2 text-sm">
                            {h.fornecedor_id ? (
                              <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100">
                                ✅ {format(new Date(h.data_hora), "EEE, dd/MM 'às' HH:mm", { locale: ptBR })} — {h.fornecedor_nome || 'Fornecedor'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                                ⏳ {format(new Date(h.data_hora), "EEE, dd/MM 'às' HH:mm", { locale: ptBR })} — Disponível
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Debug dos anexos */}
                  {(() => {
                    console.log(`📂 [ListaOrcamentos] ${orcamento.id}: arquivos=${orcamento.arquivos?.length}, fotos=${orcamento.fotos?.length}`);
                    console.log(`📂 [ListaOrcamentos] ${orcamento.id}: arquivos=`, orcamento.arquivos);
                    console.log(`📂 [ListaOrcamentos] ${orcamento.id}: fotos=`, orcamento.fotos);
                    return null;
                  })()}

                  {/* Exibir anexos quando disponíveis */}
                  {(orcamento.arquivos?.length > 0 || orcamento.fotos?.length > 0) && (
                    <AnexosOrcamento 
                      arquivos={orcamento.arquivos?.map((file: any) => ({
                        id: file.id || '',
                        nome_arquivo: file.name || file.nome_arquivo || '',
                        tipo_arquivo: file.type || file.tipo_arquivo || '',
                        tamanho: file.size || file.tamanho || 0,
                        url_arquivo: file.url || file.url_arquivo || (file instanceof File ? URL.createObjectURL(file) : '')
                      })) || []} 
                      fotos={orcamento.fotos?.map((file: any) => ({
                        id: file.id || '',
                        nome_arquivo: file.name || file.nome_arquivo || '',
                        tipo_arquivo: file.type || file.tipo_arquivo || '',
                        tamanho: file.size || file.tamanho || 0,
                        url_arquivo: file.url || file.url_arquivo || (file instanceof File ? URL.createObjectURL(file) : '')
                      })) || []} 
                    />
                  )}

                  <div className="flex gap-2 pt-3 flex-wrap max-w-full">
                    <Button
                      onClick={() => handleVerFornecedores(orcamento)}
                      variant="outline"
                      size="sm"
                      className="border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs sm:text-sm"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Fornecedores ({orcamento.quantidadeEmpresas})
                    </Button>

                    {canManage && (
                      <Button
                        onClick={() => { setCompatOrcamento(orcamento); setCompatModalOpen(true); }}
                        variant="outline"
                        size="sm"
                        className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-xs sm:text-sm"
                      >
                        <BarChart2 className="h-4 w-4 mr-1" />
                        Compatibilização IA
                      </Button>
                    )}
                    
                    {canManage && (
                      <Button
                        onClick={() => handleEditClick(orcamento)}
                        variant="outline"
                        size="sm"
                        className="border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    )}
                    
                    {canManage && (
                      <>
                        <Button
                          onClick={() => handleApropriacaoClick(orcamento)}
                          variant="outline"
                          size="sm"
                          className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          {orcamento.gestor_conta ? 'Alterar Gestor' : 'Apropriar Gestor'}
                        </Button>
                        
                        {orcamento.gestor_conta && (
                          <Badge variant="outline" className="border-primary text-primary">
                            <UserCheck className="h-3 w-3 mr-1" />
                            {orcamento.gestor_conta.nome}
                          </Badge>
                        )}

                        {/* Rota100 — link do painel do cliente */}
                        {orcamento.rota100_token && (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                              onClick={() => {
                                const url = `${window.location.origin}/rota100/${orcamento.rota100_token}`;
                                navigator.clipboard.writeText(url);
                                toast.success('Link Rota100 copiado!');
                              }}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Rota100
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-orange-200 text-orange-600 hover:bg-orange-50"
                              asChild
                            >
                              <a href={`/rota100/${orcamento.rota100_token}`} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        )}


                        {/* Dropdown de ações para pausar/fechar manualmente */}
                        <AcoesOrcamentoDropdown
                          orcamento={orcamento}
                          onPausar={handlePausarClick}
                          onReabrir={handleReabrirClick}
                          onFecharManualmente={handleFecharManualmenteClick}
                        />
                      </>
                    )}
                    
                    <Button
                      onClick={() => handleDeleteClick(orcamento.id)}
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                      disabled={isDeleting || isActionLoading}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </div>

                  {orcamento.status === 'fechado' && orcamento.fornecedoresInscritos.length > 0 && (
                    <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <h4 className="font-medium mb-2 text-primary">Fornecedores Inscritos:</h4>
                      <div className="space-y-3">
                        {orcamento.fornecedoresInscritos.slice(0, 2).map((fornecedor) => (
                          <div key={fornecedor.id} className="flex justify-between items-center bg-white p-3 rounded border">
                            <div className="text-sm">
                              <div className="font-medium">{fornecedor.empresa}</div>
                              <div className="text-muted-foreground">
                                {fornecedor.nome} | {fornecedor.email} | {fornecedor.telefone}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => abrirWhatsApp(fornecedor.telefone, fornecedor.nome)}
                                size="sm"
                                className="goodref-button-primary"
                              >
                                <MessageCircle className="h-4 w-4 mr-1" />
                                WhatsApp
                              </Button>
                              <Button
                                onClick={() => window.open(`mailto:${fornecedor.email}`, '_blank')}
                                variant="outline"
                                size="sm"
                                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                              >
                                <Mail className="h-4 w-4 mr-1" />
                                E-mail
                              </Button>
                            </div>
                          </div>
                        ))}
                        {orcamento.fornecedoresInscritos.length > 2 && (
                          <div className="text-center">
                            <Button
                              onClick={() => handleVerFornecedores(orcamento)}
                              variant="outline"
                              size="sm"
                              className="text-primary"
                            >
                              Ver todos os {orcamento.fornecedoresInscritos.length} fornecedores
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {orcamento.dadosContato && (
                        <div className="mt-4 p-3 bg-secondary/10 rounded border-l-4 border-secondary">
                          <h5 className="font-medium text-secondary">Dados do Cliente:</h5>
                          <p className="text-sm text-secondary/80">
                            <strong>{orcamento.dadosContato.nome}</strong><br />
                            {orcamento.dadosContato.telefone} | {orcamento.dadosContato.email}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {/* Load more button */}
          {hasMore && !isFiltered && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={carregarMais}
                disabled={isLoadingMore}
                variant="outline"
                className="min-w-[200px]"
              >
                {isLoadingMore ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                    Carregando...
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
          const ids = orcamentosToShow.map(o => o.id);
          fetchCompatStatus(ids);
        }}
      />
    </div>
  );
};
