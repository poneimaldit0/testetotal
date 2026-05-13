
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { R, shadows } from '@/styles/tokens';
import { PremiumPageHeader } from '@/components/ui/PremiumPageHeader';
import { CadastroOrcamento } from '@/components/admin/CadastroOrcamento';
import { ListaOrcamentos } from '@/components/admin/ListaOrcamentos';
import { OrcamentosDisponiveis } from '@/components/fornecedor/OrcamentosDisponiveis';
import { MinhasCandidaturas } from '@/components/fornecedor/MinhasCandidaturas';
import { MinhasSolicitacoesAjuda } from '@/components/fornecedor/MinhasSolicitacoesAjuda';
import { RevisionWorkflow } from '@/components/fornecedor/RevisionWorkflow';
import { ContratoInfo } from '@/components/fornecedor/ContratoInfo';
import { OrcamentoProvider, useOrcamento } from '@/context/OrcamentoContext';
import { Users, UserCheck, Building2, FileText, LogOut, Menu, Package, Calendar, Eye } from 'lucide-react';
import { NovoGerenciamentoUsuarios } from '@/components/admin/NovoGerenciamentoUsuarios';
import { UserStatsCards } from '@/components/admin/UserStatsCards';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useIsMaster } from '@/hooks/useIsMaster';
import { useRevisoesWorkflow } from '@/hooks/useRevisoesWorkflow';
import AprovacaoFornecedores from '@/components/admin/AprovacaoFornecedores';
import RelatoriosAdmin from '@/components/admin/RelatoriosAdmin';
import { FinanceiroDashboard } from '@/components/admin/FinanceiroDashboard';
import { VisualizacaoPropostas } from '@/components/admin/propostas/VisualizacaoPropostas';
import { ListaOrcamentosComparador } from '@/components/admin/ListaOrcamentosComparador';
import { GestaoReputacaoFornecedores } from '@/components/admin/gestao-fornecedores/GestaoReputacaoFornecedores';
import { GestaoMotivosPerdaCRM } from '@/components/admin/crm/GestaoMotivosPerdaCRM';
import { DashboardControlePropostas } from '@/components/admin/DashboardControlePropostas';
import { EditarPerfil } from '@/pages/fornecedor/EditarPerfil';
import { ContratosAtivos } from '@/components/fornecedor/ContratosAtivos';
import { DiarioObra } from '@/components/fornecedor/DiarioObra';
import { CriarMedicao } from '@/components/fornecedor/CriarMedicao';
import { CriarMedicaoComItens } from '@/components/fornecedor/CriarMedicaoComItens';
import { SeletorObraParaMedicao } from '@/components/fornecedor/SeletorObraParaMedicao';
import { MinhasMedicoes } from '@/components/fornecedor/MinhasMedicoes';
import { SeletorAcaoMedicoes } from '@/components/fornecedor/SeletorAcaoMedicoes';
import { GerenciarCronograma } from '@/components/fornecedor/GerenciarCronograma';
import { GerenciarMateriais } from '@/components/fornecedor/GerenciarMateriais';
import { DataIntegrityPanel } from '@/components/admin/DataIntegrityPanel';
import { DataRecoveryPanel } from '@/components/admin/DataRecoveryPanel';
import { CorrigirContaCliente } from '@/components/admin/CorrigirContaCliente';
import { MuralAvisos } from '@/components/MuralAvisos';
import { GestaoAvisos } from '@/components/admin/GestaoAvisos';
import { CalculadoraFinanciamento } from '@/components/fornecedor/CalculadoraFinanciamento';
import { CentralOperacionalFornecedor } from '@/components/fornecedor/CentralOperacionalFornecedor';
import { CRMKanbanOrcamentos } from '@/components/admin/CRMKanbanOrcamentos';
import { CRMKanbanMarcenaria } from '@/components/admin/CRMKanbanMarcenaria';
import { CustomerSuccessDashboard } from '@/components/admin/CustomerSuccessDashboard';
import { ConsultorDashboard } from '@/components/admin/ConsultorDashboard';
import { GestaoChecklistsCRM } from '@/components/admin/checklist-crm/GestaoChecklistsCRM';
import { DashboardProdutividadeChecklist } from '@/components/admin/DashboardProdutividadeChecklist';
import { PainelSaudeEmpresa } from '@/components/admin/PainelSaudeEmpresa';
import { CSPipelineKanban } from '@/components/admin/customer-success/CSPipelineKanban';
import { GerenciamentoProdutos } from '@/components/admin/GerenciamentoProdutos';
import { PainelCloser } from '@/components/closer/PainelCloser';
import { FunilVendasAdmin } from '@/components/admin/funil-vendas/FunilVendasAdmin';
import { NovoLayout } from '@/components/admin/NovoLayout';
import { DashboardOperacional } from '@/components/admin/DashboardOperacional';
import { PaginaSDR } from '@/components/admin/PaginaSDR';
import { PainelCepIntelligencia } from '@/components/admin/PainelCepIntelligencia';
import { GerenciadorFontesPreco } from '@/components/admin/GerenciadorFontesPreco';
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { 
  hasViewAccess, 
  getDefaultView, 
  canAccessMainDashboard,
  isClient,
  type UserRole, 
  type ViewType 
} from '@/utils/accessControl';


const KPI_LIST = (
  orcamentosAbertos: number,
  inscricoesHoje: number,
  orcamentosPostadosMes: number,
  acessosUnicosHoje: number,
) => [
  { label: 'Orçamentos em Aberto', value: orcamentosAbertos,    Icon: Building2, color: R.azul },
  { label: 'Inscrições Hoje',       value: inscricoesHoje,        Icon: Users,     color: R.vd  },
  { label: 'Postados no Mês',       value: orcamentosPostadosMes, Icon: Calendar,  color: R.lj  },
  { label: 'Acessos Únicos Hoje',   value: acessosUnicosHoje,     Icon: Eye,       color: R.rx  },
];

const DashboardStats = ({ enabled = true }: { enabled?: boolean }) => {
  const { orcamentosAbertos, inscricoesHoje, orcamentosPostadosMes, acessosUnicosHoje, loading } = useDashboardStats(enabled);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            background: R.br, borderRadius: 12,
            borderTop: `4px solid ${R.bd}`,
            boxShadow: shadows.kpi,
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-7 w-14 mb-1.5" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const kpis = KPI_LIST(orcamentosAbertos, inscricoesHoje, orcamentosPostadosMes, acessosUnicosHoje);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {kpis.map(({ label, value, Icon, color }) => (
        <div key={label} style={{
          background: R.br,
          borderRadius: 12,
          borderTop: `4px solid ${color}`,
          boxShadow: shadows.kpi,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: color + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={20} color={color} />
          </div>
          <div>
            <div style={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, fontSize: 26, color: R.nv, lineHeight: 1 }}>
              {value}
            </div>
            <div style={{ fontSize: 12, color: R.cz, marginTop: 4 }}>
              {label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const DashboardContent = () => {
  const { profile, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMaster = useIsMaster();
  
  // Determinar se hooks pesados devem ser habilitados
  const isFornecedor = profile?.tipo_usuario === 'fornecedor';
  const isAdminOrMaster = profile?.tipo_usuario === 'admin' || profile?.tipo_usuario === 'master';
  
  // Hooks condicionais - só executam quando necessário
  const { totalRevisoesPendentes } = useRevisoesWorkflow(!!profile && isFornecedor);
  
  const [contratoSelecionado, setContratoSelecionado] = useState<string | null>(null);
  const [acaoMedicao, setAcaoMedicao] = useState<'selecionar' | 'historico' | 'criar'>('selecionar');
  const [activeView, setActiveView] = useState<ViewType>(() => {
    // Definir view inicial baseado no tipo de usuário
    return profile?.tipo_usuario ? getDefaultView(profile.tipo_usuario as UserRole) : 'disponiveis';
  });

  // Detectar parâmetro de view na URL (para navegação via notificações)
  React.useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam && viewParam !== activeView && profile?.tipo_usuario) {
      const userRole = profile.tipo_usuario as UserRole;
      if (hasViewAccess(userRole, viewParam as ViewType)) {
        setActiveView(viewParam as ViewType);
      }
    }
  }, [searchParams, profile?.tipo_usuario]);

  const handleSelecionarObra = (contratoId: string) => {
    setContratoSelecionado(contratoId);
  };

  const handleVoltarParaSelecaoObra = () => {
    setContratoSelecionado(null);
    setAcaoMedicao('selecionar');
  };

  const handleVoltarParaSeletorAcao = () => {
    setAcaoMedicao('selecionar');
    setContratoSelecionado(null);
  };

  // Redirecionar clientes para seu dashboard específico
  React.useEffect(() => {
    if (profile?.tipo_usuario) {
      const userRole = profile.tipo_usuario as UserRole;
      if (isClient(userRole)) {
        navigate('/cliente/dashboard', { replace: true });
        return;
      }
      
      // Verificar se o usuário tem acesso ao dashboard principal
      if (!canAccessMainDashboard(userRole)) {
        // Se não é cliente nem tem acesso ao dashboard, redirecionar para auth
        navigate('/auth', { replace: true });
        return;
      }
    }
  }, [profile?.tipo_usuario, navigate]);

  // Handler para mudança de view com verificação de acesso
  const handleViewChange = (view: string) => {
    const userRole = profile?.tipo_usuario as UserRole;
    const viewType = view as ViewType;

    if (hasViewAccess(userRole, viewType)) {
      setActiveView(viewType);
      setSearchParams({ view: viewType });
    }
  };

  // Verificar se usuário tem acesso à view atual e redirecionar se necessário
  // HOOKS SEMPRE DEVEM SER CHAMADOS ANTES DE QUALQUER EARLY RETURN
  React.useEffect(() => {
    if (!profile) return; // Guard clause dentro do effect
    
    const userRole = profile.tipo_usuario as UserRole;
    if (!hasViewAccess(userRole, activeView as ViewType)) {
      const defaultView = getDefaultView(userRole);
      if (activeView !== defaultView) {
        setActiveView(defaultView);
      }
    }
  }, [activeView, profile?.tipo_usuario, profile]);

  // Early return DEPOIS de todos os hooks - com loading mais claro
  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando painel...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    const userRole = profile.tipo_usuario as UserRole;
    const currentView = activeView as ViewType;

    // Se não tem acesso, mostrar loading enquanto o useEffect redireciona
    if (!hasViewAccess(userRole, currentView)) {
      return <div>Carregando...</div>;
    }

    switch (activeView) {
      // Novo Dashboard e SDR
      case 'dashboard-operacional':
        return <DashboardOperacional />;
      case 'sdr-atendimento':
        return <PaginaSDR onViewChange={handleViewChange} />;
      case 'sdr-inteligencia':
        return <PainelCepIntelligencia />;
      case 'gestao-fontes':
        return <GerenciadorFontesPreco />;

      // Views para Admin/Master/Gestor
      case 'lista':
        return <ListaOrcamentos />;
      case 'cadastro':
        return <CadastroOrcamento />;
      case 'crm-orcamentos':
        return <CRMKanbanOrcamentos />;
      case 'crm-marcenaria':
        return <CRMKanbanMarcenaria />;
      case 'crm-motivos-perda':
        return <GestaoMotivosPerdaCRM />;
      case 'crm-checklist-config':
        return <GestaoChecklistsCRM />;
      case 'produtividade-checklist':
        return <DashboardProdutividadeChecklist />;
      case 'consultor-dashboard':
        return <ConsultorDashboard />;
      case 'cs-dashboard':
        return <CustomerSuccessDashboard />;
      case 'cs-pipeline':
        return <CSPipelineKanban />;
      case 'aprovacoes':
        return <AprovacaoFornecedores />;
      case 'usuarios':
        return <NovoGerenciamentoUsuarios />;
      case 'relatorios':
        return <RelatoriosAdmin />;
      case 'propostas':
        return <VisualizacaoPropostas />;
      case 'comparador':
        return <ListaOrcamentosComparador />;
      case 'reputacao':
        return <GestaoReputacaoFornecedores />;
      case 'controle':
        return <DashboardControlePropostas />;
      case 'financeiro':
        return <FinanceiroDashboard />;
      case 'saude-empresa':
        return <PainelSaudeEmpresa />;
      
      // Views para Fornecedor
      case 'central':
        return <CentralOperacionalFornecedor />;
      case 'disponiveis':
        return <OrcamentosDisponiveis />;
      case 'meus':
        return <MinhasCandidaturas />;
      case 'suporte':
        return <MinhasSolicitacoesAjuda />;
      case 'revisoes':
        return <RevisionWorkflow />;
      case 'contratos':
        return <ContratosAtivos onNavigateToCronograma={() => setActiveView('cronograma')} />;
      case 'diario':
        return <DiarioObra />;
      case 'medicoes':
        if (acaoMedicao === 'historico') {
          return <MinhasMedicoes onVoltar={handleVoltarParaSeletorAcao} />;
        } else if (acaoMedicao === 'criar') {
          return contratoSelecionado ? (
            <CriarMedicaoComItens 
              contratoId={contratoSelecionado} 
              onVoltar={handleVoltarParaSelecaoObra}
            />
          ) : (
            <SeletorObraParaMedicao onSelecionarObra={handleSelecionarObra} />
          );
        } else {
          return (
            <SeletorAcaoMedicoes
              onVerHistorico={() => setAcaoMedicao('historico')}
              onCriarNova={() => setAcaoMedicao('criar')}
            />
          );
        }
      case 'cronograma':
        return <GerenciarCronograma />;
      case 'materiais':
        return (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Gestão de Materiais</p>
            <p className="text-sm">Em breve você poderá gerenciar solicitações de materiais dos clientes</p>
          </div>
        );
      case 'perfil':
        return <EditarPerfil />;
      case 'calculadora-financiamento':
        return <CalculadoraFinanciamento />;
      case 'integridade':
        return (
          <div className="space-y-6">
            <CorrigirContaCliente />
            <DataIntegrityPanel />
          </div>
        );
      case 'recuperacao':
        return <DataRecoveryPanel />;
      case 'avisos':
        return <GestaoAvisos />;
      case 'produtos-segmentacao':
        return <GerenciamentoProdutos />;
      case 'funil-vendas':
        return <PainelCloser />;
      case 'funil-vendas-admin':
        return <FunilVendasAdmin />;
      
      default:
        // Default seguro - nunca deve chegar aqui devido ao useEffect
        return <div>Carregando...</div>;
    }
  };

  const useNewLayout = ['admin', 'master', 'gestor_conta', 'sdr'].includes(profile.tipo_usuario);

  if (useNewLayout) {
    return (
      <NovoLayout
        activeView={activeView as import('@/utils/accessControl').ViewType}
        onViewChange={handleViewChange}
        userRole={profile.tipo_usuario as import('@/utils/accessControl').UserRole}
        userName={profile.nome || 'Usuário'}
        onSignOut={signOut}
      >
        {renderContent()}
      </NovoLayout>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100">
        <AppSidebar activeView={activeView} onViewChange={handleViewChange} />
        
        <SidebarInset className="flex-1">
          {/* Header */}
          <div className="bg-white shadow-sm border-b border-primary/20">
            <div className="px-2 md:px-4 py-3 md:py-4">
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                  <SidebarTrigger className="h-8 w-8 flex-shrink-0" />
                  <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                    <img 
                      src="/lovable-uploads/c483ce15-6db9-4eca-8544-1eeb29c9b346.png" 
                      alt="Reforma100 Logo" 
                      className="h-6 md:h-10 w-auto object-contain flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <h1 className="text-lg md:text-2xl font-bold text-secondary truncate">R100</h1>
                      <p className="text-xs text-primary hidden md:block">Sistema de Orçamentos</p>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-2 ml-auto md:ml-0">
                    <Badge variant={profile.tipo_usuario === 'admin' || profile.tipo_usuario === 'master' || profile.tipo_usuario === 'gestor_conta' || profile.tipo_usuario === 'customer_success' || profile.tipo_usuario === 'closer' || profile.tipo_usuario === 'pre_vendas' ? 'default' : 'secondary'} className="bg-primary text-white text-xs whitespace-nowrap">
                      {profile.tipo_usuario === 'master' ? 'Master' : 
                       profile.tipo_usuario === 'admin' ? 'Admin' : 
                       profile.tipo_usuario === 'gestor_conta' ? 'Gestor' : 
                       profile.tipo_usuario === 'customer_success' ? 'Customer Success' :
                       profile.tipo_usuario === 'closer' ? 'Closer' : 
                       profile.tipo_usuario === 'pre_vendas' ? 'SDR Fornecedor' : 'Fornecedor'}
                    </Badge>
                    {profile.tipo_usuario === 'fornecedor' && totalRevisoesPendentes > 0 && (
                      <Badge variant="destructive" className="animate-pulse text-xs whitespace-nowrap">
                        {totalRevisoesPendentes} Revisão{totalRevisoesPendentes > 1 ? 'ões' : ''}
                      </Badge>
                    )}
                    <span className="text-xs md:text-sm text-gray-600 truncate hidden md:inline">Olá, {profile.nome}</span>
                  </div>
                </div>
                <Button
                  onClick={signOut}
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 flex-shrink-0"
                >
                  <LogOut className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Sair</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className={activeView === 'crm-orcamentos' ? 'flex flex-col h-full w-full' : 'p-3 md:p-6'}>
            {activeView !== 'crm-orcamentos' && (
              <>
                {/* Mural de Avisos */}
                <MuralAvisos className="mb-4 md:mb-6" />
                
                {/* Renderizar estatísticas baseado no tipo de usuário - com lazy loading */}
                {isAdminOrMaster ? (
                  <DashboardStats enabled={true} />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
                    <div className="md:col-span-3">
                      <UserStatsCards />
                    </div>
                    <div className="md:col-span-1">
                      <ContratoInfo />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Main Content */}
            <div className={activeView === 'crm-orcamentos' ? 'flex-1 min-h-0' : 'space-y-4 md:space-y-6'}>
              {renderContent()}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

const Dashboard = () => {
  return (
    <OrcamentoProvider>
      <DashboardContent />
    </OrcamentoProvider>
  );
};

export default Dashboard;
