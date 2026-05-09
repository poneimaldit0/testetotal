
import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/supabase';
import { useToast } from '@/hooks/use-toast';
import { SecureLogger } from '@/utils/secureLogger';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Função para limpar estado de autenticação
const cleanupAuthState = () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

// Constante para timeout de 2 horas (em milissegundos)
const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 horas

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      const typedProfile: Profile = {
        ...data,
        tipo_usuario: data.tipo_usuario as 'master' | 'admin' | 'fornecedor' | 'gestor_conta' | 'cliente',
        status: data.status as 'ativo' | 'inativo' | 'suspenso' | 'pendente_aprovacao'
      };
      
      // Verificar se o contrato expirou
      const isContractExpired = typedProfile.data_termino_contrato && 
        new Date(typedProfile.data_termino_contrato) < new Date();
      
      // Verificar se o usuário está inativo ou suspenso (NÃO incluir pendente_aprovacao aqui)
      const isUserBlocked = typedProfile.status === 'inativo' || typedProfile.status === 'suspenso';
      
      if (isContractExpired || isUserBlocked) {
        let message = '';
        if (isContractExpired) {
          message = 'Seu contrato expirou. Entre em contato com o administrador.';
        } else if (isUserBlocked) {
          message = 'Sua conta está bloqueada. Entre em contato com o administrador.';
        }
        
        toast({
          title: "Acesso Negado",
          description: message,
          variant: "destructive",
        });
        
        // Fazer logout automático apenas para casos específicos
        await handleSignOut();
        return;
      }
      
      setProfile(typedProfile);
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      setProfile(null);
    }
  };

  const handleSignOut = async () => {
    try {
      cleanupAuthState();
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.error('Erro no logout:', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  useEffect(() => {
    // Configurar listener de mudança de estado PRIMEIRO
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        SecureLogger.info('Auth state change', { event, email: session?.user?.email }, { component: 'useAuth' });
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Capturar evento PASSWORD_RECOVERY para estabelecer sessão automaticamente
        if (event === 'PASSWORD_RECOVERY' && session?.user) {
          SecureLogger.info('Password recovery detected', { email: session.user.email }, { component: 'useAuth' });
          setLoading(false);
        } else if (session?.user && event === 'SIGNED_IN') {
          // Usar setTimeout para evitar deadlocks
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else if (!session) {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // DEPOIS verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      SecureLogger.info('Initial session', { email: session?.user?.email }, { component: 'useAuth' });
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Limpar estado antes de tentar login
      cleanupAuthState();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        SecureLogger.error('Erro no login', error, { component: 'useAuth' });
        return { error };
      }
      
      SecureLogger.info('Login bem-sucedido', { email: data.user?.email }, { component: 'useAuth' });
      return { error: null };
    } catch (error) {
      console.error('Erro inesperado no login:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      SecureLogger.security('Usuário fazendo logout', {
        userId: user?.id
      }, { component: 'useAuth' });
      
      // Limpar timestamp de atividade para evitar conflito no próximo login
      localStorage.removeItem('last_activity_timestamp');
      
      await handleSignOut();
      
      SecureLogger.debug('Estado de autenticação limpo durante logout', {}, { component: 'useAuth' });
    } catch (error) {
      SecureLogger.error('Erro durante logout', error as Error, { component: 'useAuth' });
    }
    
    // Redirecionar após logout
    window.location.href = '/auth';
  };

  // Configurar timeout de sessão
  useSessionTimeout({
    timeoutMs: SESSION_TIMEOUT_MS,
    onTimeout: async () => {
      SecureLogger.security('Logout automático por inatividade executado', {
        userId: user?.id,
        timeoutMs: SESSION_TIMEOUT_MS
      }, { component: 'useAuth' });
      
      toast({
        title: "Sessão Expirada",
        description: "Você foi desconectado por inatividade.",
        variant: "destructive",
      });
      
      await signOut();
    },
    isAuthenticated: !!user && !!session
  });

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
