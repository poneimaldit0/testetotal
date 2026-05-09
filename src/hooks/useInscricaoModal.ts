import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useVerificacaoAtualizacaoDiaria, OrcamentoPendente } from '@/hooks/useVerificacaoAtualizacaoDiaria';

export const useInscricaoModal = () => {
  const { profile, user } = useAuth();
  const { verificar, marcarDiaComoAtualizado } = useVerificacaoAtualizacaoDiaria();
  
  const [selectedOrcamento, setSelectedOrcamento] = useState<string>('');
  const [selectedHorarioVisitaId, setSelectedHorarioVisitaId] = useState<string | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados para modal de atualização obrigatória
  const [showAtualizacaoModal, setShowAtualizacaoModal] = useState(false);
  const [pendenciasAtualizacao, setPendenciasAtualizacao] = useState<OrcamentoPendente[]>([]);
  const [orcamentoDesejado, setOrcamentoDesejado] = useState<string | null>(null);
  const [podeUsarConfirmacaoRapida, setPodeUsarConfirmacaoRapida] = useState(true);
  const [diasConsecutivos, setDiasConsecutivos] = useState(0);

  // Atualiza status local de uma pendência (para update otimista)
  const atualizarStatusPendencia = (inscricaoId: string, novoStatus: string) => {
    setPendenciasAtualizacao(prev => 
      prev.map(p => 
        p.inscricao_id === inscricaoId 
          ? { ...p, status_acompanhamento: novoStatus }
          : p
      )
    );
  };
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    empresa: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Preencher dados e abrir modal de inscrição
  const procederComInscricao = (orcamentoId: string, horarioVisitaId?: string) => {
    setSelectedOrcamento(orcamentoId);
    setSelectedHorarioVisitaId(horarioVisitaId);
    
    if (profile) {
      setFormData({
        nome: profile.nome || '',
        email: profile.email || '',
        telefone: profile.telefone || '',
        empresa: profile.empresa || '',
      });
    }
    
    setIsOpen(true);
  };

  // Função principal chamada ao clicar em "Quero Participar"
  const openModal = async (orcamentoId: string, horarioVisitaId?: string) => {
    if (!user) {
      procederComInscricao(orcamentoId, horarioVisitaId);
      return;
    }

    try {
      const resultado = await verificar(user.id);

      if (resultado.jaAtualizou) {
        procederComInscricao(orcamentoId, horarioVisitaId);
        return;
      }

      if (resultado.pendencias.length === 0) {
        await marcarDiaComoAtualizado(user.id, 'individual');
        procederComInscricao(orcamentoId, horarioVisitaId);
        return;
      }

      setOrcamentoDesejado(orcamentoId);
      setSelectedHorarioVisitaId(horarioVisitaId);
      setPendenciasAtualizacao(resultado.pendencias);
      setPodeUsarConfirmacaoRapida(resultado.podeUsarConfirmacaoRapida);
      setDiasConsecutivos(resultado.diasConsecutivos);
      setShowAtualizacaoModal(true);
    } catch (error) {
      console.error('Erro ao verificar pendências:', error);
      procederComInscricao(orcamentoId, horarioVisitaId);
    }
  };

  // Confirmação rápida (todos atualizados)
  const handleConfirmacaoRapida = async () => {
    if (!user) return;
    
    const sucesso = await marcarDiaComoAtualizado(user.id, 'rapida');
    
    if (sucesso && orcamentoDesejado) {
      setShowAtualizacaoModal(false);
      procederComInscricao(orcamentoDesejado, selectedHorarioVisitaId);
    }
  };

  // Concluir após atualização individual
  const handleConcluirAtualizacao = async () => {
    if (!user) return;
    
    await marcarDiaComoAtualizado(user.id, 'individual');
    
    if (orcamentoDesejado) {
      setShowAtualizacaoModal(false);
      procederComInscricao(orcamentoDesejado, selectedHorarioVisitaId);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      empresa: '',
    });
    setIsOpen(false);
    setSelectedHorarioVisitaId(undefined);
  };

  const resetAtualizacaoModal = () => {
    setShowAtualizacaoModal(false);
    setPendenciasAtualizacao([]);
    setOrcamentoDesejado(null);
  };

  return {
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
    // Novos estados para modal de atualização
    showAtualizacaoModal,
    setShowAtualizacaoModal,
    pendenciasAtualizacao,
    podeUsarConfirmacaoRapida,
    diasConsecutivos,
    handleConfirmacaoRapida,
    handleConcluirAtualizacao,
    resetAtualizacaoModal,
    atualizarStatusPendencia,
  };
};
