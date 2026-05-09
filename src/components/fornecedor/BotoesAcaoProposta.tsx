import React, { useState, memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HelpCircle, Send, AlertTriangle, CheckCircle, Edit, FileText, MessageCircle } from 'lucide-react';
import { PrazoInfo } from '@/hooks/usePrazosPropostas';
import { SolicitarAjudaModal } from './SolicitarAjudaModal';
import { DesistirPropostaModal } from './DesistirPropostaModal';
import { ChecklistColaborativo } from './ChecklistColaborativo';
import { PreOrcamentoColaborativo } from './PreOrcamentoColaborativo';
import { ChecklistProposta } from './ChecklistProposta';
import { useChecklistColaborativo } from '@/hooks/useChecklistColaborativo';
import { usePreOrcamentoStatus } from '@/hooks/usePreOrcamentoStatus';

interface DadosContato {
  nome?: string;
  telefone?: string;
  email?: string;
}

interface BotoesAcaoPropostaProps {
  candidaturaId: string;
  orcamentoId: string;
  prazoInfo: PrazoInfo | null;
  propostaEnviada: boolean;
  onAcaoCompleta: () => void;
  dadosContato?: DadosContato;
}

export const BotoesAcaoProposta = memo<BotoesAcaoPropostaProps>(({
  candidaturaId,
  orcamentoId,
  prazoInfo,
  propostaEnviada,
  onAcaoCompleta,
  dadosContato
}) => {
  const [showAjudaModal, setShowAjudaModal] = useState(false);
  const [showDesistenciaModal, setShowDesistenciaModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showPreOrcamentoModal, setShowPreOrcamentoModal] = useState(false);
  const [showPropostaModal, setShowPropostaModal] = useState(false);
  
  // Hooks com cache adequado
  const { checklistColaborativo, loading: checklistLoading } = useChecklistColaborativo(orcamentoId);
  const { temPreOrcamento, loading: preOrcamentoLoading, refetch: refetchPreOrcamento } = usePreOrcamentoStatus(candidaturaId);

  // Handlers memoizados
  const handleChecklistClick = useCallback(() => {
    console.log('🔘 Opening Checklist Modal');
    setShowChecklistModal(true);
  }, []);

  const handleChecklistConsolidado = useCallback(() => {
    console.log('✅ Checklist consolidado, abrindo pré-orçamento');
    setShowChecklistModal(false);
    setShowPreOrcamentoModal(true);
  }, []);

  const handlePreOrcamentoClick = useCallback(() => {
    console.log('💰 Opening PreOrcamento Modal');
    setShowPreOrcamentoModal(true);
  }, []);

  const handlePreOrcamentoVoltar = useCallback(() => {
    setShowPreOrcamentoModal(false);
    setShowChecklistModal(true);
  }, []);

  const handlePreOrcamentoConcluido = useCallback(() => {
    setShowPreOrcamentoModal(false);
    refetchPreOrcamento();
    onAcaoCompleta();
  }, [refetchPreOrcamento, onAcaoCompleta]);

  const handleEnviarWhatsApp = useCallback(() => {
    if (!dadosContato?.telefone || !dadosContato?.nome) return;
    
    const mensagem = `Olá ${dadosContato.nome}, já concluí a análise do seu orçamento ${orcamentoId} no Reforma100 e tenho uma proposta para apresentar.`;
    const telefoneFormatado = dadosContato.telefone.replace(/\D/g, '');
    const telefoneComCodigo = telefoneFormatado.startsWith('55') ? telefoneFormatado : `55${telefoneFormatado}`;
    const url = `https://api.whatsapp.com/send/?phone=${telefoneComCodigo}&text=${encodeURIComponent(mensagem)}&type=phone_number&app_absent=0`;
    window.open(url, '_blank');
  }, [dadosContato, orcamentoId]);

  const handlePreencherProposta = useCallback(() => {
    setShowPropostaModal(true);
  }, []);

  const ChecklistButton = memo(() => {
    const isChecklistConsolidado = checklistColaborativo?.status === 'checklist_definido';
    
    if (isChecklistConsolidado) {
      // Quando consolidado, mostrar botão de preencher proposta
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreencherProposta}
          className="border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white"
          disabled={checklistLoading}
        >
          <Edit className="h-4 w-4 mr-1" />
          Preencher Proposta
        </Button>
      );
    }
    
    // Quando não consolidado, mostrar botão de checklist
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleChecklistClick}
        className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
        disabled={checklistLoading}
      >
        <Edit className="h-4 w-4 mr-1" />
        Checklist de Obra
      </Button>
    );
  });

  const PreOrcamentoButton = memo(() => {
    if (!temPreOrcamento) return null;
    
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handlePreOrcamentoClick}
        className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
        disabled={preOrcamentoLoading}
      >
        <FileText className="h-4 w-4 mr-1" />
        Acessar Pré-Orçamento
      </Button>
    );
  });

  const renderBotoes = () => {
    const isChecklistConsolidado = checklistColaborativo?.status === 'checklist_definido';
    
    // Debug logs
    console.log('🔍 [BotoesAcaoProposta] Debug:', {
      orcamentoId,
      checklistColaborativo,
      status: checklistColaborativo?.status,
      isChecklistConsolidado,
      dadosContato: !!dadosContato
    });
    
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <ChecklistButton />
        <PreOrcamentoButton />
        
        {/* Botão de WhatsApp quando checklist está consolidado */}
        {isChecklistConsolidado && dadosContato && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleEnviarWhatsApp}
            className="border-green-500 text-green-600 hover:bg-green-500 hover:text-white"
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            Enviar Proposta
          </Button>
        )}
      </div>
    );
  };

  const renderModals = () => (
    <>
      {/* Modal do Checklist */}
      <Dialog open={showChecklistModal} onOpenChange={setShowChecklistModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Checklist Colaborativo de Obra - Orçamento {orcamentoId}
            </DialogTitle>
          </DialogHeader>
          
          {showChecklistModal && (
            <ChecklistColaborativo
              orcamentoId={orcamentoId}
              candidaturaId={candidaturaId}
              onChecklistConsolidado={handleChecklistConsolidado}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal do Pré-Orçamento */}
      <Dialog open={showPreOrcamentoModal} onOpenChange={setShowPreOrcamentoModal}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Pré-Orçamento - Orçamento {orcamentoId}
            </DialogTitle>
          </DialogHeader>
          
          {showPreOrcamentoModal && (
            <PreOrcamentoColaborativo
              orcamentoId={orcamentoId}
              candidaturaId={candidaturaId}
              onVoltar={handlePreOrcamentoVoltar}
              onConcluido={handlePreOrcamentoConcluido}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal da Proposta */}
      <Dialog open={showPropostaModal} onOpenChange={setShowPropostaModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Preencher Proposta - Orçamento {orcamentoId}
            </DialogTitle>
          </DialogHeader>
          
          {showPropostaModal && (
            <ChecklistProposta
              orcamentoId={orcamentoId}
              candidaturaId={candidaturaId}
              readonly={propostaEnviada}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );

  // Se proposta já foi enviada
  if (propostaEnviada) {
    return (
      <>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Proposta Enviada
          </Badge>
          <ChecklistButton />
          <PreOrcamentoButton />
        </div>
        {renderModals()}
      </>
    );
  }

  // Se não há prazo definido
  if (!prazoInfo?.dataLimite) {
    return (
      <>
        <div className="flex items-center gap-2">
          <ChecklistButton />
          <PreOrcamentoButton />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAjudaModal(true)}
            className="flex items-center gap-1"
          >
            <HelpCircle className="h-4 w-4" />
            Solicitar Ajuda
          </Button>
        </div>
        
        {renderModals()}
        <SolicitarAjudaModal
          candidaturaId={candidaturaId}
          orcamentoId={orcamentoId}
          open={showAjudaModal}
          onOpenChange={setShowAjudaModal}
          onSuccess={onAcaoCompleta}
        />
      </>
    );
  }

  // Se prazo vencido e pode desistir
  if (prazoInfo.vencido && prazoInfo.podeDesistir) {
    return (
      <>
        <div className="flex items-center gap-2">
          <ChecklistButton />
          <PreOrcamentoButton />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAjudaModal(true)}
            className="flex items-center gap-1"
          >
            <HelpCircle className="h-4 w-4" />
            Solicitar Ajuda
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDesistenciaModal(true)}
            className="flex items-center gap-1"
          >
            <AlertTriangle className="h-4 w-4" />
            Desistir
          </Button>
        </div>

        {renderModals()}
        <SolicitarAjudaModal
          candidaturaId={candidaturaId}
          orcamentoId={orcamentoId}
          open={showAjudaModal}
          onOpenChange={setShowAjudaModal}
          onSuccess={onAcaoCompleta}
        />

        <DesistirPropostaModal
          candidaturaId={candidaturaId}
          orcamentoId={orcamentoId}
          open={showDesistenciaModal}
          onOpenChange={setShowDesistenciaModal}
          onSuccess={onAcaoCompleta}
        />
      </>
    );
  }

  // Se prazo ainda não venceu
  return (
    <>
      <div className="flex items-center gap-2">
        <ChecklistButton />
        <PreOrcamentoButton />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAjudaModal(true)}
          className="flex items-center gap-1"
        >
          <HelpCircle className="h-4 w-4" />
          Solicitar Ajuda
        </Button>
        
        <Button
          size="sm"
          className="flex items-center gap-1 bg-primary hover:bg-primary/90"
        >
          <Send className="h-4 w-4" />
          Enviar Proposta
        </Button>
      </div>

      {renderModals()}
      <SolicitarAjudaModal
        candidaturaId={candidaturaId}
        orcamentoId={orcamentoId}
        open={showAjudaModal}
        onOpenChange={setShowAjudaModal}
        onSuccess={onAcaoCompleta}
      />
    </>
  );
});