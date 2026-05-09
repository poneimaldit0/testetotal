import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface DesistenciaProposta {
  id: string;
  candidaturaId: string;
  motivoCategoria: string;
  justificativa: string;
  dataHora: Date;
  aprovada?: boolean;
  dataAprovacao?: Date;
  observacoesAdmin?: string;
  penalidadeAplicada: boolean;
  orcamentoInfo?: {
    necessidade: string;
    codigo: string;
  };
}

export const MOTIVOS_DESISTENCIA = [
  'Conflito de agenda',
  'Problema técnico',
  'Custo inadequado',
  'Localização desfavorável',
  'Cliente não responde',
  'Projeto cancelado pelo cliente',
  'Outros'
] as const;

export type MotivoDesistencia = typeof MOTIVOS_DESISTENCIA[number];

export const useDesistenciasPropostas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [desistencias, setDesistencias] = useState<DesistenciaProposta[]>([]);
  const [loading, setLoading] = useState(true);

  const solicitarDesistencia = useCallback(async (
    candidaturaId: string,
    motivoCategoria: MotivoDesistencia,
    justificativa: string
  ): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('desistencias_propostas')
        .insert({
          candidatura_id: candidaturaId,
          fornecedor_id: user.id,
          motivo_categoria: motivoCategoria,
          justificativa
        });

      if (error) {
        console.error('Erro ao solicitar desistência:', error);
        toast({
          title: "Erro",
          description: "Erro ao enviar solicitação de desistência",
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Solicitação Enviada",
        description: "Sua solicitação de desistência foi enviada para análise. Você será notificado sobre a decisão."
      });

      carregarDesistencias();
      return true;

    } catch (error) {
      console.error('Erro geral ao solicitar desistência:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao enviar solicitação",
        variant: "destructive"
      });
      return false;
    }
  }, [user?.id, toast]);

  const carregarDesistencias = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('desistencias_propostas')
        .select(`
          id,
          candidatura_id,
          motivo_categoria,
          justificativa,
          data_solicitacao,
          aprovada,
          data_aprovacao,
          observacoes_admin,
          penalidade_aplicada,
          candidaturas_fornecedores!inner (
            orcamento_id,
            orcamentos (
              necessidade,
              codigo_orcamento
            )
          )
        `)
        .eq('fornecedor_id', user.id)
        .order('data_solicitacao', { ascending: false });

      if (error) {
        console.error('Erro ao buscar desistências:', error);
        return;
      }

      const desistenciasProcessadas: DesistenciaProposta[] = (data || []).map(item => ({
        id: item.id,
        candidaturaId: item.candidatura_id,
        motivoCategoria: item.motivo_categoria,
        justificativa: item.justificativa,
        dataHora: new Date(item.data_solicitacao),
        aprovada: item.aprovada || undefined,
        dataAprovacao: item.data_aprovacao ? new Date(item.data_aprovacao) : undefined,
        observacoesAdmin: item.observacoes_admin || undefined,
        penalidadeAplicada: item.penalidade_aplicada || false,
        orcamentoInfo: {
          necessidade: (item.candidaturas_fornecedores as any)?.orcamentos?.necessidade || 'Sem descrição',
          codigo: (item.candidaturas_fornecedores as any)?.orcamentos?.codigo_orcamento || 'N/A'
        }
      }));

      setDesistencias(desistenciasProcessadas);

    } catch (error) {
      console.error('Erro geral ao carregar desistências:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    carregarDesistencias();
  }, [carregarDesistencias]);

  return {
    desistencias,
    loading,
    solicitarDesistencia,
    recarregar: carregarDesistencias
  };
};