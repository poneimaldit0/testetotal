import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { useOrcamentosGlobal } from '@/hooks/useOrcamentosGlobal';
import { useFornecedorInscricao } from '@/hooks/useFornecedorInscricao';
import { useOrcamentoFilters } from '@/hooks/useOrcamentoFilters';
import { useInscricaoModal } from '@/hooks/useInscricaoModal';
import { OrcamentoFilters } from './OrcamentoFilters';
import { OrcamentoCardGlobal } from './OrcamentoCardGlobal';
import { InscricaoModal } from './InscricaoModal';
import { AtualizacaoObrigatoriaModal } from './AtualizacaoObrigatoriaModal';
import { abrirWhatsApp } from '@/utils/orcamentoUtils';

export const ListaOrcamentos: React.FC = () => {
  const { orcamentos, loading, recarregar } = useOrcamentosGlobal();
  const { inscreverFornecedor } = useFornecedorInscricao(recarregar);
  
  const {
    filtros,
    orcamentosFiltrados,
    handleFiltroChange,
    handleLimparFiltros,
    contarFiltrosAtivos,
  } = useOrcamentoFilters(orcamentos);

  const {
    selectedOrcamento,
    selectedHorarioVisitaId,
    isOpen,
    setIsOpen,
    isSubmitting,
    setIsSubmitting,
    formData,
    handleInputChange,
    openModal,
    resetForm,
    // Modal de atualização obrigatória
    showAtualizacaoModal,
    setShowAtualizacaoModal,
    pendenciasAtualizacao,
    podeUsarConfirmacaoRapida,
    diasConsecutivos,
    handleConfirmacaoRapida,
    handleConcluirAtualizacao,
    atualizarStatusPendencia,
  } = useInscricaoModal();

  console.log('🏠 ListaOrcamentos: Renderizando componente');
  console.log('📊 ListaOrcamentos: Total de orçamentos recebidos:', orcamentos.length);
  console.log('📊 ListaOrcamentos: Filtros atuais:', filtros);

  const handleInscricao = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const sucesso = await inscreverFornecedor(selectedOrcamento, formData, selectedHorarioVisitaId);
      
      if (sucesso) {
        resetForm();
      }
    } catch (error) {
      console.error('Erro na inscrição:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Orçamentos Disponíveis</h2>
        <Card className="bg-white shadow-lg border border-gray-100 rounded-xl">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando orçamentos...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-secondary">Orçamentos Disponíveis</h2>
        <Badge variant="outline" className="text-primary border-primary">
          {orcamentosFiltrados.length} encontrados
        </Badge>
      </div>
      
      {/* Filtros */}
      <OrcamentoFilters 
        filtros={filtros} 
        onFiltroChange={handleFiltroChange}
        onLimparFiltros={handleLimparFiltros}
        filtrosAtivos={contarFiltrosAtivos()}
      />
      
      {orcamentosFiltrados.length === 0 ? (
        <Card className="goodref-card">
          <CardContent className="p-6 text-center text-muted-foreground">
            Nenhum orçamento encontrado com os filtros aplicados.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {orcamentosFiltrados.map((orcamento) => (
              <OrcamentoCardGlobal
                key={orcamento.id}
                orcamento={orcamento}
                onOpenModal={openModal}
                onAbrirWhatsApp={abrirWhatsApp}
              />
            ))}
            
            <InscricaoModal
              isOpen={isOpen}
              onOpenChange={setIsOpen}
              formData={formData}
              onFormDataChange={handleInputChange}
              onSubmit={handleInscricao}
              isSubmitting={isSubmitting}
              hasProfile={!!formData.nome}
              horarioSelecionado={selectedHorarioVisitaId ? (() => {
                const orc = orcamentos.find(o => o.id === selectedOrcamento);
                const horarios = (orc as any)?.horariosVisita || [];
                const h = horarios.find((h: any) => h.id === selectedHorarioVisitaId);
                return h ? { id: h.id, data_hora: h.data_hora } : null;
              })() : null}
            />
          </Dialog>
        </div>
      )}

      {/* Modal de atualização obrigatória */}
      <AtualizacaoObrigatoriaModal
        isOpen={showAtualizacaoModal}
        onOpenChange={setShowAtualizacaoModal}
        pendencias={pendenciasAtualizacao}
        podeUsarConfirmacaoRapida={podeUsarConfirmacaoRapida}
        diasConsecutivos={diasConsecutivos}
        onConfirmacaoRapida={handleConfirmacaoRapida}
        onConcluir={handleConcluirAtualizacao}
        recarregarOrcamentos={recarregar}
        onStatusUpdated={atualizarStatusPendencia}
      />
    </div>
  );
};
