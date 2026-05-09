import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface LimitesPropostas {
  limiteAtual: number | null;
  proposasAbertas: number;
  podeIniciarNova: boolean;
  proximosVencimentos: Array<{
    candidaturaId: string;
    orcamentoId: string;
    necessidade: string;
    dataLimite: Date;
    diasRestantes: number;
  }>;
}

export const useLimitesPropostas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [limites, setLimites] = useState<LimitesPropostas>({
    limiteAtual: null,
    proposasAbertas: 0,
    podeIniciarNova: true,
    proximosVencimentos: []
  });
  const [loading, setLoading] = useState(true);

  const carregarLimites = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Buscar dados do perfil com limite
      const { data: perfil, error: perfilError } = await supabase
        .from('profiles')
        .select('limite_propostas_abertas')
        .eq('id', user.id)
        .single();

      if (perfilError) {
        console.error('Erro ao buscar perfil:', perfilError);
        toast({
          title: "Erro",
          description: "Erro ao carregar informações do perfil",
          variant: "destructive"
        });
        return;
      }

      // Buscar candidaturas abertas
      const { data: candidaturas, error: candidaturasError } = await supabase
        .from('candidaturas_fornecedores')
        .select(`
          id,
          orcamento_id,
          data_limite_envio,
          proposta_enviada,
          orcamentos!inner (
            necessidade,
            status
          )
        `)
        .eq('fornecedor_id', user.id)
        .eq('proposta_enviada', false)
        .eq('orcamentos.status', 'aberto')
        .is('data_desistencia', null);

      if (candidaturasError) {
        console.error('Erro ao buscar candidaturas:', candidaturasError);
        toast({
          title: "Erro",
          description: "Erro ao carregar candidaturas abertas",
          variant: "destructive"
        });
        return;
      }

      const proposasAbertas = candidaturas?.length || 0;
      const limiteAtual = perfil?.limite_propostas_abertas;
      const podeIniciarNova = limiteAtual === null || proposasAbertas < limiteAtual;

      // Calcular próximos vencimentos
      const agora = new Date();
      const proximosVencimentos = (candidaturas || [])
        .filter(c => c.data_limite_envio)
        .map(c => {
          const dataLimite = new Date(c.data_limite_envio);
          const diasRestantes = Math.ceil((dataLimite.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
          
          return {
            candidaturaId: c.id,
            orcamentoId: c.orcamento_id,
            necessidade: (c.orcamentos as any)?.necessidade || 'Sem descrição',
            dataLimite,
            diasRestantes
          };
        })
        .sort((a, b) => a.diasRestantes - b.diasRestantes)
        .slice(0, 5); // Top 5 mais urgentes

      setLimites({
        limiteAtual,
        proposasAbertas,
        podeIniciarNova,
        proximosVencimentos
      });

    } catch (error) {
      console.error('Erro geral ao carregar limites:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar informações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    carregarLimites();
  }, [carregarLimites]);

  return {
    limites,
    loading,
    recarregar: carregarLimites
  };
};