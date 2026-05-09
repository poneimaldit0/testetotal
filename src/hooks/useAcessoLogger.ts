import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { SecureLogger } from '@/utils/secureLogger';

/**
 * Hook para registrar automaticamente os acessos dos usuários ao sistema
 * Registra apenas 1 acesso por dia por usuário para evitar spam
 */
export const useAcessoLogger = () => {
  const { user, profile } = useAuth();
  const acessoRegistradoRef = useRef(false);
  const tentativaRegistroRef = useRef(false);

  const registrarAcesso = async (userId: string) => {
    SecureLogger.info('Iniciando registrarAcesso', { userId }, { component: 'useAcessoLogger' });
    
    // Evitar múltiplas tentativas simultâneas
    if (tentativaRegistroRef.current) {
      SecureLogger.debug('Tentativa já em andamento, retornando', { userId }, { component: 'useAcessoLogger' });
      return;
    }

    try {
      tentativaRegistroRef.current = true;
      
      // Verificar se já foi registrado acesso hoje
      const hoje = new Date().toISOString().split('T')[0];
      const chaveStorage = `ultimo_acesso_${userId}`;
      const ultimoAcesso = localStorage.getItem(chaveStorage);

      SecureLogger.debug('Verificando localStorage', { 
        userId, 
        hoje, 
        ultimoAcesso, 
        chaveStorage 
      }, { component: 'useAcessoLogger' });

      if (ultimoAcesso === hoje) {
        SecureLogger.debug('Acesso já registrado hoje', { userId, data: hoje }, { component: 'useAcessoLogger' });
        acessoRegistradoRef.current = true;
        return;
      }

      SecureLogger.info('Chamando registrar_acesso_bem_sucedido', { userId }, { component: 'useAcessoLogger' });

      // Chamar função do banco para registrar acesso
      const { error } = await supabase.rpc('registrar_acesso_bem_sucedido', {
        user_id: userId
      });

      if (error) {
        SecureLogger.error('Erro na função registrar_acesso_bem_sucedido', error, { component: 'useAcessoLogger', userId });
        throw error;
      }

      // Salvar no localStorage que já foi registrado hoje
      localStorage.setItem(chaveStorage, hoje);
      acessoRegistradoRef.current = true;

      SecureLogger.info('Acesso registrado com sucesso', { userId, data: hoje }, { component: 'useAcessoLogger' });

    } catch (error) {
      SecureLogger.error('Erro ao registrar acesso automático', error as Error, { 
        component: 'useAcessoLogger', 
        userId 
      });

      // Marcar tentativa como concluída para evitar loop infinito
      tentativaRegistroRef.current = false;

      // Tentar novamente uma única vez após 3 segundos em caso de erro
      if (!localStorage.getItem(`retry_${userId}_${new Date().toISOString().split('T')[0]}`)) {
        localStorage.setItem(`retry_${userId}_${new Date().toISOString().split('T')[0]}`, 'true');
        setTimeout(() => {
          registrarAcesso(userId);
        }, 3000);
      }
    } finally {
      tentativaRegistroRef.current = false;
    }
  };

  useEffect(() => {
    SecureLogger.debug('useEffect executado', { 
      hasUser: !!user, 
      hasProfile: !!profile, 
      acessoJaRegistrado: acessoRegistradoRef.current,
      userEmail: user?.email,
      profileStatus: profile?.status 
    }, { component: 'useAcessoLogger' });

    // Só registrar para usuários autenticados e com perfil carregado
    if (!user || !profile || acessoRegistradoRef.current) {
      SecureLogger.debug('Saindo: falta user/profile ou já registrado', { 
        hasUser: !!user, 
        hasProfile: !!profile, 
        acessoJaRegistrado: acessoRegistradoRef.current 
      }, { component: 'useAcessoLogger' });
      return;
    }

    // Não registrar para usuários com status problemático
    if (profile.status === 'inativo' || profile.status === 'suspenso' || profile.status === 'pendente_aprovacao') {
      SecureLogger.debug('Saindo: status problemático', { status: profile.status }, { component: 'useAcessoLogger' });
      return;
    }

    // Verificar se usuário realmente está ativo e tem permissão
    if (profile.status !== 'ativo') {
      SecureLogger.debug('Saindo: status não é ativo', { status: profile.status }, { component: 'useAcessoLogger' });
      return;
    }

    SecureLogger.info('Condições atendidas, agendando registro de acesso', { 
      userId: user.id, 
      userEmail: user.email,
      profileStatus: profile.status 
    }, { component: 'useAcessoLogger' });

    // Delay pequeno para garantir que a aplicação carregou completamente
    const timer = setTimeout(() => {
      registrarAcesso(user.id);
    }, 2000); // Aumentado para 2 segundos para garantir estabilidade

    return () => clearTimeout(timer);
  }, [user, profile]);

  // Reset quando usuário muda (logout/login)
  useEffect(() => {
    acessoRegistradoRef.current = false;
    tentativaRegistroRef.current = false;
  }, [user?.id]);

  return {
    acessoRegistrado: acessoRegistradoRef.current
  };
};