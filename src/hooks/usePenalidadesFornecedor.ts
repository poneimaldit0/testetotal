import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface PenalidadeFornecedor {
  id: string;
  fornecedorId: string;
  desistenciaId?: string;
  tipoPenalidade: 'bloqueio_temporario' | 'reducao_propostas' | 'impacto_avaliacao' | 'suspensao_completa';
  duracaoDias: number;
  dataAplicacao: Date;
  dataExpiracao: Date;
  ativo: boolean;
  limiteOriginal?: number;
  observacoes?: string;
  aplicadaPor?: string;
}

export interface PenalidadesAtivas {
  temPenalidades: boolean;
  tipos: string[];
  detalhes: Array<{
    tipo: string;
    expiraEm: string;
    observacoes?: string;
    duracaoDias: number;
  }>;
}

export const TIPOS_PENALIDADE = [
  { 
    value: 'bloqueio_temporario', 
    label: 'Bloqueio Temporário',
    description: 'Impede inscrições em novos orçamentos'
  },
  { 
    value: 'reducao_propostas', 
    label: 'Redução de Propostas',
    description: 'Reduz limite de propostas abertas'
  },
  { 
    value: 'impacto_avaliacao', 
    label: 'Impacto na Avaliação',
    description: 'Adiciona advertência no perfil'
  },
  { 
    value: 'suspensao_completa', 
    label: 'Suspensão Completa',
    description: 'Suspende completamente o fornecedor'
  }
] as const;

export const usePenalidadesFornecedor = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  // Estado reativo: preenchido automaticamente quando o hook é montado por
  // um fornecedor autenticado. Consumers antigos (que usam apenas
  // `verificarPenalidadesAtivas`) continuam funcionando sem mudanças.
  const [penalidadesAtivas, setPenalidadesAtivas] = useState<PenalidadesAtivas>({
    temPenalidades: false,
    tipos: [],
    detalhes: []
  });

  const verificarPenalidadesAtivas = useCallback(async (fornecedorId: string): Promise<PenalidadesAtivas | null> => {
    try {
      const { data, error } = await supabase.rpc('verificar_penalidades_ativas', {
        p_fornecedor_id: fornecedorId
      });

      if (error) {
        console.error('Erro ao verificar penalidades:', error);
        return null;
      }

      return {
        temPenalidades: (data as any).tem_penalidades,
        tipos: (data as any).tipos || [],
        detalhes: (data as any).detalhes || []
      };
    } catch (error) {
      console.error('Erro geral ao verificar penalidades:', error);
      return null;
    }
  }, []);

  const aplicarPenalidade = useCallback(async (
    fornecedorId: string,
    desistenciaId: string,
    tipoPenalidade: string,
    duracaoDias: number,
    observacoes?: string
  ): Promise<boolean> => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('aplicar_penalidade_fornecedor', {
        p_fornecedor_id: fornecedorId,
        p_desistencia_id: desistenciaId,
        p_tipo_penalidade: tipoPenalidade,
        p_duracao_dias: duracaoDias,
        p_observacoes: observacoes || null
      });

      if (error) {
        console.error('Erro ao aplicar penalidade:', error);
        toast({
          title: "Erro",
          description: "Erro ao aplicar penalidade",
          variant: "destructive"
        });
        return false;
      }

      if (!(data as any).success) {
        toast({
          title: "Erro",
          description: (data as any).message || "Erro ao aplicar penalidade",
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Sucesso",
        description: "Penalidade aplicada com sucesso",
        variant: "default"
      });

      return true;
    } catch (error) {
      console.error('Erro geral ao aplicar penalidade:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao aplicar penalidade",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const buscarPenalidadesFornecedor = useCallback(async (fornecedorId: string): Promise<PenalidadeFornecedor[]> => {
    try {
      const { data, error } = await supabase
        .from('penalidades_fornecedores')
        .select(`
          id,
          fornecedor_id,
          desistencia_id,
          tipo_penalidade,
          duracao_dias,
          data_aplicacao,
          data_expiracao,
          ativo,
          limite_original,
          observacoes,
          aplicada_por
        `)
        .eq('fornecedor_id', fornecedorId)
        .order('data_aplicacao', { ascending: false });

      if (error) {
        console.error('Erro ao buscar penalidades:', error);
        return [];
      }

      return (data || []).map(item => ({
        id: item.id,
        fornecedorId: item.fornecedor_id,
        desistenciaId: item.desistencia_id,
        tipoPenalidade: item.tipo_penalidade as any,
        duracaoDias: item.duracao_dias,
        dataAplicacao: new Date(item.data_aplicacao),
        dataExpiracao: new Date(item.data_expiracao),
        ativo: item.ativo,
        limiteOriginal: item.limite_original,
        observacoes: item.observacoes,
        aplicadaPor: item.aplicada_por
      }));
    } catch (error) {
      console.error('Erro geral ao buscar penalidades:', error);
      return [];
    }
  }, []);

  const removerPenalidadesExpiradas = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('remover_penalidades_expiradas');

      if (error) {
        console.error('Erro ao remover penalidades expiradas:', error);
        toast({
          title: "Erro",
          description: "Erro ao limpar penalidades expiradas",
          variant: "destructive"
        });
        return false;
      }

      if ((data as any).success) {
        toast({
          title: "Sucesso",
          description: `${(data as any).penalidades_removidas} penalidades expiradas removidas`,
          variant: "default"
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro geral ao remover penalidades:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao limpar penalidades",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Efeito reativo: carrega penalidades automaticamente para o usuário logado.
  // Mantém a função imperativa exportada (não quebra consumers existentes).
  useEffect(() => {
    let cancelado = false;
    if (!user?.id) {
      setPenalidadesAtivas({ temPenalidades: false, tipos: [], detalhes: [] });
      return;
    }

    (async () => {
      const result = await verificarPenalidadesAtivas(user.id);
      if (!cancelado && result) {
        setPenalidadesAtivas(result);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [user?.id, verificarPenalidadesAtivas]);

  return {
    loading,
    penalidadesAtivas,
    verificarPenalidadesAtivas,
    aplicarPenalidade,
    buscarPenalidadesFornecedor,
    removerPenalidadesExpiradas
  };
};