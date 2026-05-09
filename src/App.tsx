import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useAcessoLogger } from "@/hooks/useAcessoLogger";
import Auth from "./pages/Auth";
import LoginCliente from "./pages/LoginCliente";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import EmailConfirmation from "./pages/EmailConfirmation";
import SetPassword from "./pages/SetPassword";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import RecuperarSenha from "./pages/RecuperarSenha";
import CadastroFornecedor from "./pages/CadastroFornecedor";
import AguardandoAprovacao from "./pages/AguardandoAprovacao";
import { AcessoProposta } from "./pages/AcessoProposta";
import ComparadorCliente from "./pages/ComparadorCliente";
import { PerfilFornecedor } from "./pages/PerfilFornecedor";
import ClienteDashboard from "./pages/cliente/Dashboard";
import { CronogramaObraPage } from "./pages/cliente/CronogramaObraPage";
import { RevisionEditor } from "./components/fornecedor/RevisionEditor";
import Rota100 from "./pages/Rota100";
import ValidarVisita from "./pages/ValidarVisita";
import ValidarVisitaLead from "./pages/ValidarVisitaLead";
import EntrarReuniao from "./pages/EntrarReuniao";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }
  
  // Se não tem usuário, redirecionar para login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  // Se usuário está pendente de aprovação, redirecionar para página de aguardo
  if (profile?.status === 'pendente_aprovacao') {
    return <Navigate to="/aguardando-aprovacao" replace />;
  }
  
  // Se usuário está inativo ou suspenso, redirecionar para login
  if (profile && (profile.status === 'inativo' || profile.status === 'suspenso')) {
    return <Navigate to="/auth" replace />;
  }
  
  // Se status é ativo ou ainda não carregou o perfil, permitir acesso
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, profile, loading } = useAuth();
  
  // Registrar automaticamente os acessos ao sistema
  useAcessoLogger();

  // Não bloquear rotas públicas com loading - permite que /auth apareça instantaneamente
  const isPublicRoute = window.location.pathname === '/auth' || 
                        window.location.pathname === '/login-cliente' ||
                        window.location.pathname === '/cadastro-fornecedor' ||
                        window.location.pathname === '/esqueci-senha' ||
                        window.location.pathname === '/redefinir-senha' ||
                        window.location.pathname === '/recuperar-senha' ||
                        window.location.pathname === '/acesso-proposta' ||
                        window.location.pathname === '/comparar' ||
                        window.location.pathname.startsWith('/fornecedor/') ||
                        window.location.pathname.startsWith('/rota100/') ||
                        window.location.pathname.startsWith('/entrar-reuniao/');

  if (loading && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={
        user ? (
          profile?.status === 'pendente_aprovacao' ? (
            <Navigate to="/aguardando-aprovacao" replace />
          ) : profile?.status === 'ativo' ? (
            profile?.tipo_usuario === 'cliente' ? (
              <Navigate to="/cliente/dashboard" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          ) : (
            <Navigate to="/auth" replace />
          )
        ) : (
          <Navigate to="/auth" replace />
        )
      } />
      <Route path="/auth" element={
        user ? (
          profile?.status === 'pendente_aprovacao' ? (
            <Navigate to="/aguardando-aprovacao" replace />
          ) : profile?.status === 'ativo' ? (
            profile?.tipo_usuario === 'cliente' ? (
              <Navigate to="/cliente/dashboard" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          ) : (
            <Auth />
          )
        ) : (
          <Auth />
        )
      } />
      
      {/* Área de login exclusiva para clientes */}
      <Route path="/login-cliente" element={<LoginCliente />} />
      
      {/* Rotas de recuperação de senha */}
      <Route path="/esqueci-senha" element={<ForgotPassword />} />
      <Route path="/redefinir-senha" element={<ResetPassword />} />
      <Route path="/recuperar-senha" element={<RecuperarSenha />} />
      
      <Route path="/cadastro-fornecedor" element={<CadastroFornecedor />} />
      <Route path="/aguardando-aprovacao" element={
        user && profile?.status === 'pendente_aprovacao' ? (
          <AguardandoAprovacao />
        ) : (
          <Navigate to="/auth" replace />
        )
      } />
      <Route path="/verify" element={<EmailConfirmation />} />
      <Route path="/set-password" element={<SetPassword />} />
      
      {/* Rotas públicas para acesso às propostas */}
      <Route path="/acesso-proposta" element={<AcessoProposta />} />
      <Route path="/comparar" element={<ComparadorCliente />} />
      
      {/* Rota pública para perfil de fornecedores */}
      <Route path="/fornecedor/:id" element={<PerfilFornecedor />} />

      {/* Rota100 — painel do cliente (pública por token) */}
      <Route path="/rota100/:token" element={<Rota100 />} />

      {/* Reunião — requer fornecedor autenticado, valida vínculo com candidatura */}
      <Route
        path="/entrar-reuniao/:candidaturaId/:token"
        element={
          <ProtectedRoute>
            <EntrarReuniao />
          </ProtectedRoute>
        }
      />

      {/* Validação de visita — QR único por lead (rota100_token) */}
      <Route
        path="/validar-visita/:token"
        element={
          <ProtectedRoute>
            <ValidarVisitaLead />
          </ProtectedRoute>
        }
      />

      {/* Validação de visita — rota legada por candidatura (mantida para backward compat) */}
      <Route
        path="/validar-visita/:candidaturaId/:token"
        element={
          <ProtectedRoute>
            <ValidarVisita />
          </ProtectedRoute>
        }
      />
      
      {/* Rota para revisão de propostas */}
      <Route 
        path="/fornecedor/revisao" 
        element={
          <ProtectedRoute>
            <RevisionEditor />
          </ProtectedRoute>
        } 
      />
      
      {/* Rota para dashboard do cliente */}
      <Route 
        path="/cliente/dashboard" 
        element={
          <ProtectedRoute>
            <ClienteDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Rota para cronograma da obra */}
      <Route 
        path="/cliente/obra/:obraId/cronograma" 
        element={
          <ProtectedRoute>
            <CronogramaObraPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;