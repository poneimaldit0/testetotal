import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Estado global para sincronização dos componentes
let globalSyncState = {
  lastUpdate: Date.now(),
  listeners: new Set<() => void>()
};

export const useFinanceiroSync = () => {
  const [lastUpdate, setLastUpdate] = useState(globalSyncState.lastUpdate);

  // Função para disparar atualização global com delay para garantir sincronização
  const triggerGlobalUpdate = useCallback(async (delay = 1000) => {
    console.log('🔄 FinanceiroSync: Disparando atualização global...');
    
    // Aguardar para garantir que as mudanças no banco foram propagadas
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Forçar refresh da sessão para limpar cache
    await supabase.auth.refreshSession();
    
    globalSyncState.lastUpdate = Date.now();
    globalSyncState.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('❌ FinanceiroSync: Erro ao executar listener:', error);
      }
    });
    
    console.log('✅ FinanceiroSync: Atualização global concluída');
  }, []);

  // Função para escutar atualizações
  const listenToUpdates = useCallback(() => {
    const listener = () => setLastUpdate(globalSyncState.lastUpdate);
    globalSyncState.listeners.add(listener);
    
    return () => {
      globalSyncState.listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = listenToUpdates();
    return unsubscribe;
  }, [listenToUpdates]);

  return {
    lastUpdate,
    triggerGlobalUpdate
  };
};