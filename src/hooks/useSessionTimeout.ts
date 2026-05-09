import { useEffect, useRef, useCallback } from 'react';
import { SecureLogger } from '@/utils/secureLogger';

interface UseSessionTimeoutProps {
  timeoutMs: number;
  onTimeout: () => void;
  isAuthenticated: boolean;
}

const STORAGE_KEY = 'last_activity_timestamp';
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

export const useSessionTimeout = ({ timeoutMs, onTimeout, isAuthenticated }: UseSessionTimeoutProps) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const updateLastActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    localStorage.setItem(STORAGE_KEY, now.toString());
    
    SecureLogger.debug('Atividade detectada, atualizando timestamp', { 
      timestamp: now 
    }, { component: 'useSessionTimeout' });
  }, []);

  const checkSessionExpiry = useCallback(() => {
    if (!isAuthenticated) return false;
    
    const lastActivity = localStorage.getItem(STORAGE_KEY);
    if (!lastActivity) {
      SecureLogger.debug('Nenhuma atividade anterior encontrada - sessão considerada válida', {}, { component: 'useSessionTimeout' });
      return false;
    }
    
    const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
    const isExpired = timeSinceLastActivity >= timeoutMs;
    
    SecureLogger.debug('Verificando expiração de sessão', {
      lastActivity: parseInt(lastActivity),
      timeSinceLastActivity,
      timeoutMs,
      isExpired
    }, { component: 'useSessionTimeout' });
    
    return isExpired;
  }, [isAuthenticated, timeoutMs]);

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (!isAuthenticated) return;
    
    timeoutRef.current = setTimeout(() => {
      SecureLogger.security('Sessão expirada por inatividade - fazendo logout automático', {
        timeoutMs,
        lastActivity: lastActivityRef.current
      }, { component: 'useSessionTimeout' });
      
      onTimeout();
    }, timeoutMs);
    
    SecureLogger.debug('Timer de sessão resetado', { 
      timeoutMs,
      willExpireAt: Date.now() + timeoutMs
    }, { component: 'useSessionTimeout' });
  }, [isAuthenticated, timeoutMs, onTimeout]);

  const handleActivity = useCallback(() => {
    updateLastActivity();
    resetTimeout();
  }, [updateLastActivity, resetTimeout]);

  const handleStorageChange = useCallback((e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      const newTimestamp = parseInt(e.newValue);
      if (newTimestamp > lastActivityRef.current) {
        lastActivityRef.current = newTimestamp;
        resetTimeout();
        SecureLogger.debug('Atividade sincronizada de outra aba', {
          newTimestamp
        }, { component: 'useSessionTimeout' });
      }
    }
  }, [resetTimeout]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Limpar timer se usuário não está autenticado
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    SecureLogger.info('Iniciando monitoramento de sessão', {
      timeoutMs,
      isAuthenticated
    }, { component: 'useSessionTimeout' });

    // Verificar se sessão já expirou na inicialização
    // Adicionar delay para evitar conflito com processo de login
    const checkTimer = setTimeout(() => {
      if (checkSessionExpiry()) {
        SecureLogger.security('Sessão já estava expirada na inicialização', {}, { component: 'useSessionTimeout' });
        onTimeout();
        return;
      }
    }, 1000); // Aguardar 1 segundo para permitir que o login complete

    // Configurar timestamp inicial
    updateLastActivity();

    // Adicionar listeners de atividade
    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Listener para sincronização entre abas
    window.addEventListener('storage', handleStorageChange);

    // Inicializar timer
    resetTimeout();

    return () => {
      // Limpar listeners
      ACTIVITY_EVENTS.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      window.removeEventListener('storage', handleStorageChange);
      
      // Limpar timer
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Limpar timer de verificação inicial se existir
      if (checkTimer) {
        clearTimeout(checkTimer);
      }
      
      SecureLogger.debug('Limpeza do monitoramento de sessão', {}, { component: 'useSessionTimeout' });
    };
  }, [isAuthenticated, handleActivity, handleStorageChange, resetTimeout, checkSessionExpiry, onTimeout, updateLastActivity]);

  return {
    updateLastActivity,
    checkSessionExpiry
  };
};