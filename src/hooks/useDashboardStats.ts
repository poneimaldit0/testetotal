import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  orcamentosAbertos: number;
  inscricoesHoje: number;
  orcamentosPostadosMes: number;
  acessosUnicosHoje: number;
  loading: boolean;
}

export const useDashboardStats = (enabled: boolean = true) => {
  const [stats, setStats] = useState<DashboardStats>({
    orcamentosAbertos: 0,
    inscricoesHoje: 0,
    orcamentosPostadosMes: 0,
    acessosUnicosHoje: 0,
    loading: enabled
  });

  useEffect(() => {
    if (!enabled) {
      setStats(prev => ({ ...prev, loading: false }));
      return;
    }

    const buscarEstatisticas = async () => {
      try {
        // 1. Orçamentos em Aberto (status = 'aberto')
        const { count: orcamentosAbertos } = await supabase
          .from('orcamentos')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'aberto');

        // 2. Inscrições Hoje
        const hoje = new Date().toISOString().split('T')[0];
        const { count: inscricoesHoje } = await supabase
          .from('candidaturas_fornecedores')
          .select('*', { count: 'exact', head: true })
          .gte('data_candidatura', `${hoje}T00:00:00`)
          .lt('data_candidatura', `${hoje}T23:59:59`);

        // 3. Orçamentos Postados no Mês
        const primeiroDiaMes = new Date();
        primeiroDiaMes.setDate(1);
        primeiroDiaMes.setHours(0, 0, 0, 0);
        
        const { count: orcamentosPostadosMes } = await supabase
          .from('orcamentos')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', primeiroDiaMes.toISOString());

        // 4. Acessos Únicos Hoje
        const { data: acessosData } = await supabase
          .from('logs_acesso')
          .select('user_id')
          .gte('data_acesso', `${hoje}T00:00:00`)
          .lt('data_acesso', `${hoje}T23:59:59`);

        const acessosUnicosHoje = acessosData 
          ? new Set(acessosData.map(a => a.user_id)).size 
          : 0;

        setStats({
          orcamentosAbertos: orcamentosAbertos || 0,
          inscricoesHoje: inscricoesHoje || 0,
          orcamentosPostadosMes: orcamentosPostadosMes || 0,
          acessosUnicosHoje,
          loading: false
        });
      } catch (error) {
        console.error('Erro ao buscar estatísticas do dashboard:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    buscarEstatisticas();
  }, [enabled]);

  return stats;
};
