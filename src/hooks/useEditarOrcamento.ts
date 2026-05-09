import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Orcamento } from '@/types';
import { dispararEstimativaIA } from '@/hooks/useGerarEstimativaIA';
import { deveRecalcularEstimativa } from '@/utils/estimativaIAUtils';

interface DadosEdicaoOrcamento {
  necessidade: string;
  categorias: string[];
  local: string;
  tamanho_imovel?: number;
  prazo_inicio_texto?: string;
  prazo_explicitamente_definido?: boolean;
  prazo_envio_proposta_dias?: number;
  dados_contato?: {
    nome?: string;
    email?: string;
    telefone?: string;
  };
  gestor_conta_id?: string | null;
  budget_informado?: number;
}

export const useEditarOrcamento = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const atualizarOrcamento = async (
    id: string, 
    dados: DadosEdicaoOrcamento
  ): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Validações básicas
      if (!dados.necessidade || dados.categorias.length === 0 || !dados.local) {
        toast({
          title: "Erro de validação",
          description: "Preencha todos os campos obrigatórios.",
          variant: "destructive",
        });
        return false;
      }

      // Validar email se fornecido
      if (dados.dados_contato?.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(dados.dados_contato.email)) {
          toast({
            title: "Erro de validação",
            description: "Por favor, insira um e-mail válido.",
            variant: "destructive",
          });
          return false;
        }
      }

      // Validar prazo específico
      if (dados.prazo_explicitamente_definido && 
          (!dados.prazo_envio_proposta_dias || dados.prazo_envio_proposta_dias < 1)) {
        toast({
          title: "Erro de validação",
          description: "Defina um prazo válido para envio de propostas (mínimo 1 dia).",
          variant: "destructive",
        });
        return false;
      }

      console.log('🔄 Atualizando orçamento:', id, dados);

      // Verificar se campos relevantes mudaram ANTES de salvar (compara novos vs DB atual)
      const { deve: deveRecalcular, motivo: motivoIA } = await deveRecalcularEstimativa(id, {
        necessidade: dados.necessidade,
        categorias: dados.categorias,
        tamanho_imovel: dados.tamanho_imovel,
        budget_informado: dados.budget_informado,
      });

      const { error } = await supabase
        .from('orcamentos')
        .update({
          necessidade: dados.necessidade,
          categorias: dados.categorias,
          local: dados.local,
          tamanho_imovel: dados.tamanho_imovel || null,
          prazo_inicio_texto: dados.prazo_inicio_texto || null,
          prazo_explicitamente_definido: dados.prazo_explicitamente_definido || false,
          prazo_envio_proposta_dias: dados.prazo_explicitamente_definido
            ? dados.prazo_envio_proposta_dias
            : null,
          dados_contato: dados.dados_contato || null,
          gestor_conta_id: dados.gestor_conta_id || null,
          budget_informado: dados.budget_informado || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Erro ao atualizar orçamento:', error);
        toast({
          title: "Erro ao atualizar",
          description: "Não foi possível atualizar o orçamento. Tente novamente.",
          variant: "destructive",
        });
        return false;
      }

      console.log('✅ Orçamento atualizado com sucesso');
      toast({
        title: "Sucesso",
        description: "Orçamento atualizado com sucesso!",
      });

      // IA estimate: disparar apenas se campo relevante mudou e cooldown expirou
      if (deveRecalcular) {
        dispararEstimativaIA(id);
      } else {
        console.log(`[estimativaIA] Recálculo ignorado na edição: ${motivoIA}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao atualizar:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao atualizar o orçamento.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    atualizarOrcamento,
    isLoading,
  };
};
