import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOrcamentosGlobal } from '@/hooks/useOrcamentosGlobal';
import { OrcamentoFilters } from './OrcamentoFilters';
import { OrcamentoCardGlobal } from './OrcamentoCardGlobal';
import { InscricaoModal } from './InscricaoModal';
import { AtualizacaoObrigatoriaModal } from './AtualizacaoObrigatoriaModal';
import { PenalidadesAtivas } from './PenalidadesAtivas';
import { useFornecedorInscricao } from '@/hooks/useFornecedorInscricao';
import { useVerificacaoAtualizacaoDiaria, OrcamentoPendente } from '@/hooks/useVerificacaoAtualizacaoDiaria';

export const OrcamentosDisponiveis: React.FC = () => {
  const { profile, user } = useAuth();
  const { verificar, marcarDiaComoAtualizado } = useVerificacaoAtualizacaoDiaria();
  
  const [filtros, setFiltros] = useState({
    local: '',
    categoria: '',
    prazoInicio: '',
    metragemMin: '',
    metragemMax: '',
    dataInicio: '',
    dataFim: '',
    ordenacao: 'recentes',
  });

  const { 
    orcamentos, 
    loading, 
    loadingMais,
    recarregar, 
    carregarMaisFechados,
    diasFechados,
    podeCarregarMais 
  } = useOrcamentosGlobal();
  
  const { inscreverFornecedor } = useFornecedorInscricao(recarregar);
  
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
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    empresa: '',
  });

  // Função para obter prioridade do prazo para ordenação
  const obterPrioridadePrazo = (prazo: string | Date) => {
    if (typeof prazo !== 'string') return 999;
    
    const prioridades: Record<string, number> = {
      'Imediatamente': 1,
      'Em até 1 semana': 2,
      'Em até 1 mês': 3,
      'Em até 3 meses': 4,
      'Em até 6 meses': 5,
      'Flexível': 6
    };
    
    return prioridades[prazo] || 999;
  };

  // Aplicar filtros locais
  const orcamentosFiltrados = useMemo(() => {
    let filtrados = orcamentos.filter(orcamento => {
      // Filtro por categoria
      if (filtros.categoria && filtros.categoria !== 'todas' && !orcamento.categorias.includes(filtros.categoria)) return false;
      
      // Filtro por prazo de início
      if (filtros.prazoInicio && filtros.prazoInicio !== 'todos' && orcamento.prazoInicioTexto !== filtros.prazoInicio) return false;
      
      // Filtro de local
      if (filtros.local && !orcamento.local.toLowerCase().includes(filtros.local.toLowerCase())) return false;
      
      // Filtro de metragem
      if (filtros.metragemMin && orcamento.tamanhoImovel < parseInt(filtros.metragemMin)) return false;
      if (filtros.metragemMax && orcamento.tamanhoImovel > parseInt(filtros.metragemMax)) return false;
      
      // Filtro de data
      if (filtros.dataInicio) {
        const dataFiltro = new Date(filtros.dataInicio);
        if (orcamento.dataPublicacao < dataFiltro) return false;
      }
      if (filtros.dataFim) {
        const dataFiltro = new Date(filtros.dataFim);
        if (orcamento.dataPublicacao > dataFiltro) return false;
      }
      
      return true;
    });

    // Aplicar ordenação
    switch (filtros.ordenacao) {
      case 'antigos':
        filtrados.sort((a, b) => a.dataPublicacao.getTime() - b.dataPublicacao.getTime());
        break;
      case 'prazo_urgente':
        filtrados.sort((a, b) => {
          const prioridadeA = obterPrioridadePrazo(a.dataInicio);
          const prioridadeB = obterPrioridadePrazo(b.dataInicio);
          return prioridadeA - prioridadeB;
        });
        break;
      case 'maior_metragem':
        filtrados.sort((a, b) => b.tamanhoImovel - a.tamanhoImovel);
        break;
      case 'menor_metragem':
        filtrados.sort((a, b) => a.tamanhoImovel - b.tamanhoImovel);
        break;
      case 'recentes':
      default:
        // Abertos primeiro, depois fechados, ambos ordenados por data
        filtrados.sort((a, b) => {
          if (a.status !== b.status) {
            return a.status === 'aberto' ? -1 : 1;
          }
          return b.dataPublicacao.getTime() - a.dataPublicacao.getTime();
        });
        break;
    }
    
    return filtrados;
  }, [orcamentos, filtros]);

  // Separar orçamentos
  const orcamentosAbertos = useMemo(() => 
    orcamentosFiltrados.filter(o => o.status === 'aberto'), 
    [orcamentosFiltrados]
  );
  
  const orcamentosFechados = useMemo(() => 
    orcamentosFiltrados.filter(o => o.status === 'fechado'), 
    [orcamentosFiltrados]
  );

  const handleFiltroChange = (field: string, value: string) => {
    setFiltros(prev => ({ ...prev, [field]: value }));
  };

  const handleLimparFiltros = () => {
    setFiltros({
      local: '',
      categoria: '',
      prazoInicio: '',
      metragemMin: '',
      metragemMax: '',
      dataInicio: '',
      dataFim: '',
      ordenacao: 'recentes',
    });
  };

  const contarFiltrosAtivos = () => {
    return Object.entries(filtros).filter(([key, value]) => 
      value && key !== 'ordenacao' && value !== 'recentes'
    ).length;
  };

  const handleInscricao = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const sucesso = await inscreverFornecedor(selectedOrcamento, formData, selectedHorarioVisitaId);
      
      if (sucesso) {
        setFormData({
          nome: '',
          email: '',
          telefone: '',
          empresa: '',
        });
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Erro na inscrição:', error);
    } finally {
      setIsSubmitting(false);
    }
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

  // WhatsApp is now handled inside ContatoSection with profile data
  const abrirWhatsApp = (_telefone: string, _nomeCliente: string, _orcamentoId: string) => {
    // no-op: kept for interface compatibility with OrcamentoCard props
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
    <div className="space-y-3 md:space-y-4 max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Orçamentos Disponíveis</h2>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            Orçamentos abertos para candidatura + fechados dos últimos {diasFechados} dias
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
            {orcamentosAbertos.length} abertos
          </Badge>
          <Badge variant="outline" className="text-gray-600 border-gray-200 text-xs">
            {orcamentosFechados.length} fechados
          </Badge>
        </div>
      </div>

      <PenalidadesAtivas />
      
      <OrcamentoFilters 
        filtros={filtros} 
        onFiltroChange={handleFiltroChange}
        onLimparFiltros={handleLimparFiltros}
        filtrosAtivos={contarFiltrosAtivos()}
      />
      
      {orcamentosFiltrados.length === 0 ? (
        <Card className="bg-white shadow-lg border border-gray-100 rounded-xl">
          <CardContent className="p-6 text-center text-gray-600">
            Nenhum orçamento encontrado com os filtros aplicados.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 max-w-full overflow-hidden">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {/* Orçamentos Abertos */}
            {orcamentosAbertos.map((orcamento) => (
              <OrcamentoCardGlobal
                key={orcamento.id}
                orcamento={orcamento}
                onOpenModal={openModal}
                onAbrirWhatsApp={abrirWhatsApp}
              />
            ))}
            
            {/* Separador visual - só mostra se há fechados */}
            {orcamentosFechados.length > 0 && (
              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-gray-500 text-sm font-medium px-2">
                  Orçamentos Fechados (últimos {diasFechados} dias)
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
            )}
            
            {/* Orçamentos Fechados */}
            {orcamentosFechados.map((orcamento) => (
              <OrcamentoCardGlobal
                key={orcamento.id}
                orcamento={orcamento}
                onOpenModal={openModal}
                onAbrirWhatsApp={abrirWhatsApp}
              />
            ))}
            
            {/* Botão Exibir Mais */}
            {podeCarregarMais && (
              <Button 
                onClick={carregarMaisFechados}
                variant="outline"
                className="w-full mt-2"
                disabled={loadingMais}
              >
                {loadingMais ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Exibir mais orçamentos fechados
                  </>
                )}
              </Button>
            )}
            
            <InscricaoModal
              isOpen={isOpen}
              onOpenChange={setIsOpen}
              formData={formData}
              onFormDataChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
              onSubmit={handleInscricao}
              isSubmitting={isSubmitting}
              hasProfile={!!profile}
              horarioSelecionado={selectedHorarioVisitaId ? (() => {
                const orcamento = orcamentos.find(o => o.id === selectedOrcamento);
                const horario = orcamento?.horariosVisita?.find((h: any) => h.id === selectedHorarioVisitaId);
                return horario ? { id: horario.id, data_hora: horario.data_hora } : null;
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
        onStatusUpdated={(inscricaoId, novoStatus) => {
          setPendenciasAtualizacao(prev => 
            prev.map(p => 
              p.inscricao_id === inscricaoId 
                ? { ...p, status_acompanhamento: novoStatus }
                : p
            )
          );
        }}
      />
    </div>
  );
};
