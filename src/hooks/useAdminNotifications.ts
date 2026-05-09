import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AdminNotifications {
  solicitacoesAjudaPendentes: number;
  desistenciasPendentes: number;
  fornecedoresProximoLimite: number;
  propostasVencidas: number;
  total: number;
}

export const useAdminNotifications = () => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotifications>({
    solicitacoesAjudaPendentes: 0,
    desistenciasPendentes: 0,
    fornecedoresProximoLimite: 0,
    propostasVencidas: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);

  const carregarNotificacoes = async () => {
    if (!profile || (profile.tipo_usuario !== 'admin' && profile.tipo_usuario !== 'master')) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Contar solicitações de ajuda pendentes
      const { count: ajudaPendentes } = await supabase
        .from('solicitacoes_ajuda')
        .select('*', { count: 'exact', head: true })
        .eq('respondida', false);

      // Contar desistências pendentes
      const { count: desistenciasPendentes } = await supabase
        .from('desistencias_propostas')
        .select('*', { count: 'exact', head: true })
        .is('aprovada', null);

      // Contar fornecedores próximos do limite
      const { data: fornecedores } = await supabase
        .from('profiles')
        .select('id, limite_propostas_abertas')
        .eq('tipo_usuario', 'fornecedor')
        .eq('status', 'ativo')
        .not('limite_propostas_abertas', 'is', null);

      let fornecedoresProximoLimite = 0;
      if (fornecedores) {
        for (const fornecedor of fornecedores) {
          const { count: propostasAbertas } = await supabase
            .from('candidaturas_fornecedores')
            .select('*', { count: 'exact', head: true })
            .eq('fornecedor_id', fornecedor.id)
            .eq('proposta_enviada', false)
            .is('data_desistencia', null);

          const limite = fornecedor.limite_propostas_abertas || 0;
          const abertas = propostasAbertas || 0;

          // Considera próximo do limite se estiver com 80% ou mais
          if (abertas >= limite * 0.8) {
            fornecedoresProximoLimite++;
          }
        }
      }

    // Contar propostas vencidas (apenas orçamentos com prazo explícito)
    const { count: propostasVencidas } = await supabase
      .from('candidaturas_fornecedores')
      .select(`
        *,
        orcamentos!inner(prazo_explicitamente_definido)
      `, { count: 'exact', head: true })
      .eq('proposta_enviada', false)
      .is('data_desistencia', null)
      .lt('data_limite_envio', new Date().toISOString())
      .eq('orcamentos.prazo_explicitamente_definido', true);

      const newNotifications = {
        solicitacoesAjudaPendentes: ajudaPendentes || 0,
        desistenciasPendentes: desistenciasPendentes || 0,
        fornecedoresProximoLimite,
        propostasVencidas: propostasVencidas || 0,
        total: (ajudaPendentes || 0) + (desistenciasPendentes || 0) + fornecedoresProximoLimite + (propostasVencidas || 0)
      };

      setNotifications(newNotifications);

    } catch (error) {
      console.error('Erro ao carregar notificações admin:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarNotificacoes();

    // Atualizar a cada 30 segundos
    const interval = setInterval(carregarNotificacoes, 30000);

    return () => clearInterval(interval);
  }, [profile]);

  return {
    notifications,
    loading,
    recarregar: carregarNotificacoes
  };
};