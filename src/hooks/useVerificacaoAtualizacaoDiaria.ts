import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OrcamentoPendente {
  inscricao_id: string;
  orcamento_id: string;
  codigo_orcamento: string;
  cliente_nome: string;
  necessidade: string;
  local: string;
  status_acompanhamento: string | null;
  status_orcamento: string;
  data_candidatura: string;
}

export interface VerificacaoResult {
  jaAtualizou: boolean;
  pendencias: OrcamentoPendente[];
  diasConsecutivos: number;
  podeUsarConfirmacaoRapida: boolean;
}

const LIMITE_DIAS_CONFIRMACAO_RAPIDA = 5;

export const useVerificacaoAtualizacaoDiaria = () => {
  const [loading, setLoading] = useState(false);

  const verificar = useCallback(async (fornecedorId: string): Promise<VerificacaoResult> => {
    setLoading(true);
    
    try {
      // 1. Verificar se já atualizou hoje
      const hoje = new Date().toISOString().split('T')[0];
      
      const { data: controleHoje, error: controleError } = await supabase
        .from('controle_atualizacao_diaria_fornecedor')
        .select('*')
        .eq('fornecedor_id', fornecedorId)
        .eq('data_verificacao', hoje)
        .maybeSingle();

      if (controleError) {
        console.error('Erro ao verificar controle diário:', controleError);
      }

      // Se já atualizou hoje, retorna sem buscar pendências
      if (controleHoje) {
        return {
          jaAtualizou: true,
          pendencias: [],
          diasConsecutivos: 0,
          podeUsarConfirmacaoRapida: true,
        };
      }

      // 2. Buscar pendências via RPC
      const { data: pendencias, error: pendenciasError } = await supabase
        .rpc('verificar_pendencias_atualizacao_fornecedor', {
          p_fornecedor_id: fornecedorId,
        });

      if (pendenciasError) {
        console.error('Erro ao buscar pendências:', pendenciasError);
        throw pendenciasError;
      }

      // 3. Contar dias consecutivos de confirmação rápida
      const { data: diasConsecutivos, error: diasError } = await supabase
        .rpc('contar_dias_confirmacao_rapida_consecutivos', {
          p_fornecedor_id: fornecedorId,
        });

      if (diasError) {
        console.error('Erro ao contar dias consecutivos:', diasError);
      }

      const dias = diasConsecutivos || 0;
      const podeUsarConfirmacaoRapida = dias < LIMITE_DIAS_CONFIRMACAO_RAPIDA;

      return {
        jaAtualizou: false,
        pendencias: pendencias || [],
        diasConsecutivos: dias,
        podeUsarConfirmacaoRapida,
      };
    } catch (error) {
      console.error('Erro na verificação diária:', error);
      // Em caso de erro, permitir inscrição para não bloquear o usuário
      return {
        jaAtualizou: true,
        pendencias: [],
        diasConsecutivos: 0,
        podeUsarConfirmacaoRapida: true,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const marcarDiaComoAtualizado = useCallback(async (
    fornecedorId: string, 
    tipo: 'rapida' | 'individual'
  ): Promise<boolean> => {
    try {
      const hoje = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('controle_atualizacao_diaria_fornecedor')
        .upsert({
          fornecedor_id: fornecedorId,
          data_verificacao: hoje,
          tipo_confirmacao: tipo,
        }, {
          onConflict: 'fornecedor_id,data_verificacao',
        });

      if (error) {
        console.error('Erro ao marcar dia como atualizado:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao marcar dia como atualizado:', error);
      return false;
    }
  }, []);

  return {
    loading,
    verificar,
    marcarDiaComoAtualizado,
  };
};
