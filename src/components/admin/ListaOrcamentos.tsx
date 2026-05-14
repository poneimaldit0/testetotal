
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOrcamento } from '@/context/OrcamentoContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, Clock, Timer, BarChart2 } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { ModalCompatibilizacaoConsultor } from './consultor/ModalCompatibilizacaoConsultor';
import { PremiumPageHeader } from '@/components/ui/PremiumPageHeader';
import { FichaOperacionalAdmin } from './FichaOperacionalAdmin';

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
  // Fase C: drawer Ficha (clique no card abre)
  const [fichaAberta, setFichaAberta] = useState<Orcamento | null>(null);

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
      <PremiumPageHeader
        title="Orçamentos Cadastrados"
        subtitle="Gerencie e acompanhe todos os orçamentos"
        style={{ marginBottom: 0 }}
        right={totalCount > 0 ? (
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
            {orcamentosToShow.length} de {totalCount}
          </span>
        ) : undefined}
      />
      
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
        <Card className="r100-card">
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
            <Card
              key={orcamento.id}
              role="button"
              tabIndex={0}
              onClick={() => setFichaAberta(orcamento)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFichaAberta(orcamento); } }}
              className="r100-card w-full max-w-full box-border overflow-hidden cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <CardHeader className="max-w-full overflow-hidden pb-3 space-y-0">
                <div className="flex flex-col gap-2 max-w-full overflow-hidden mb-0">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <CardTitle className="text-sm font-semibold text-secondary r100-clamp-2 leading-snug">{orcamento.necessidade || 'Sem descrição'}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {orcamento.local} · #{orcamento.id.slice(0, 8)} · {format(orcamento.dataPublicacao, "dd/MM/yyyy", { locale: ptBR })}
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
