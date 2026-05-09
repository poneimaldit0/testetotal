import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface DesistenciaAdmin {
  id: string;
  candidaturaId: string;
  motivoCategoria: string;
  justificativa: string;
  dataHora: Date;
  aprovada?: boolean;
  dataAprovacao?: Date;
  observacoesAdmin?: string;
  penalidadeAplicada: boolean;
  orcamentoInfo: {
    necessidade: string;
    codigo: string;
  };
  fornecedorInfo: {
    nome: string;
    email: string;
    empresa: string;
  };
}

export const useDesistenciasAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [desistencias, setDesistencias] = useState<DesistenciaAdmin[]>([]);
  const [loading, setLoading] = useState(true);

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
          candidaturas_fornecedores!candidatura_id (
            orcamento_id,
            orcamentos!orcamento_id (
              necessidade,
              codigo_orcamento
            )
          ),
          profiles!fornecedor_id (
            nome,
            email,
            empresa
          )
        `)
        .order('data_solicitacao', { ascending: false });

      if (error) {
        console.error('Erro ao buscar desistências:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar desistências",
          variant: "destructive"
        });
        return;
      }

      const desistenciasProcessadas: DesistenciaAdmin[] = (data || []).map(item => ({
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
        },
        fornecedorInfo: {
          nome: (item.profiles as any)?.nome || 'Nome não disponível',
          email: (item.profiles as any)?.email || 'Email não disponível',
          empresa: (item.profiles as any)?.empresa || 'Empresa não informada'
        }
      }));

      setDesistencias(desistenciasProcessadas);

    } catch (error) {
      console.error('Erro geral ao carregar desistências:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar desistências",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    carregarDesistencias();
  }, [carregarDesistencias]);

  return {
    desistencias,
    loading,
    recarregar: carregarDesistencias
  };
};