
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserStats {
  orcamentosMesAtual: number;
  inscricoesMesAtual: number;
  inscricoesTotais: number;
}

export const useUserStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    orcamentosMesAtual: 0,
    inscricoesMesAtual: 0,
    inscricoesTotais: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Buscar orçamentos do mês atual
      const { data: orcamentosMes, error: orcamentosError } = await supabase.rpc('obter_orcamentos_mes_atual');
      
      // Buscar inscrições do usuário no mês atual
      const { data: inscricoesMes, error: inscricoesMesError } = await supabase.rpc('obter_inscricoes_usuario_mes', {
        user_id: user.id
      });
      
      // Buscar total de inscrições do usuário
      const { data: inscricoesTotais, error: inscricoesTotaisError } = await supabase.rpc('obter_inscricoes_usuario_total', {
        user_id: user.id
      });

      if (orcamentosError) console.error('Erro ao buscar orçamentos:', orcamentosError);
      if (inscricoesMesError) console.error('Erro ao buscar inscrições do mês:', inscricoesMesError);
      if (inscricoesTotaisError) console.error('Erro ao buscar inscrições totais:', inscricoesTotaisError);

      setStats({
        orcamentosMesAtual: orcamentosMes || 0,
        inscricoesMesAtual: inscricoesMes || 0,
        inscricoesTotais: inscricoesTotais || 0,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  return {
    stats,
    loading,
    refreshStats: fetchStats,
  };
};
