import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { Orcamento, Fornecedor, NovoOrcamentoInput } from '@/types';
import { useOrcamentoData } from '@/hooks/useOrcamentoData';
import { useFornecedorInscricao } from '@/hooks/useFornecedorInscricao';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ExcluirOrcamentoResponse {
  success: boolean;
  error?: string;
  message?: string;
  orcamento_id?: string;
  candidaturas_removidas?: number;
  inscricoes_removidas?: number;
  arquivos_removidos?: number;
}

interface OrcamentoContextType {
  orcamentos: Orcamento[];
  adicionarOrcamento: (orcamento: NovoOrcamentoInput) => Promise<{ id: string; rota100_token?: string | null } | undefined>;
  atualizarOrcamento: (id: string, dados: Partial<Orcamento>) => Promise<boolean>;
  inscreverFornecedor: (orcamentoId: string, fornecedor: Omit<Fornecedor, 'id' | 'dataInscricao'>) => Promise<boolean>;
  excluirOrcamento: (orcamentoId: string) => Promise<boolean>;
  obterOrcamentosAbertos: () => Orcamento[];
  obterOrcamentosFechados: () => Orcamento[];
  carregarOrcamentos: () => void;
  recarregarComRetry: (maxTentativas?: number) => Promise<void>;
  isDeleting: boolean;
  totalCount: number;
  hasMore: boolean;
  carregarMais: () => Promise<void>;
  isLoadingMore: boolean;
}

const OrcamentoContext = createContext<OrcamentoContextType | undefined>(undefined);

export const useOrcamento = () => {
  const context = useContext(OrcamentoContext);
  if (!context) {
    throw new Error('useOrcamento must be used within OrcamentoProvider');
  }
  return context;
};

export const OrcamentoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { orcamentos, carregarOrcamentos, adicionarOrcamento, totalCount, hasMore, carregarMais, isLoadingMore } = useOrcamentoData();
  const { inscreverFornecedor } = useFornecedorInscricao(carregarOrcamentos);
  const [isDeleting, setIsDeleting] = useState(false);

  // Adicionar função de recarregamento forçado com retry
  const recarregarComRetry = useCallback(async (maxTentativas = 3) => {
    console.log('🔄 Context: Iniciando recarregamento com retry...');
    
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      try {
        console.log(`🔄 Context: Tentativa ${tentativa}/${maxTentativas}`);
        await carregarOrcamentos();
        console.log('✅ Context: Recarregamento concluído com sucesso');
        return;
      } catch (error) {
        console.error(`❌ Context: Erro na tentativa ${tentativa}:`, error);
        if (tentativa < maxTentativas) {
          await new Promise(resolve => setTimeout(resolve, 1000 * tentativa));
        }
      }
    }
    console.error('❌ Context: Falha em todas as tentativas de recarregamento');
  }, [carregarOrcamentos]);

  const atualizarOrcamento = useCallback(async (id: string, dados: Partial<Orcamento>): Promise<boolean> => {
    try {
      console.log('🔄 Context: Atualizando orçamento:', id);
      
      // Preparar dados para atualização
      const updateData: any = {};
      
      if (dados.necessidade) updateData.necessidade = dados.necessidade;
      if (dados.categorias) updateData.categorias = dados.categorias;
      if (dados.local) updateData.local = dados.local;
      if (dados.tamanhoImovel !== undefined) updateData.tamanho_imovel = dados.tamanhoImovel;
      if (dados.prazoInicioTexto !== undefined) updateData.prazo_inicio_texto = dados.prazoInicioTexto;
      if (dados.prazo_explicitamente_definido !== undefined) updateData.prazo_explicitamente_definido = dados.prazo_explicitamente_definido;
      if (dados.prazo_envio_proposta_dias !== undefined) updateData.prazo_envio_proposta_dias = dados.prazo_envio_proposta_dias;
      if (dados.dadosContato !== undefined) updateData.dados_contato = dados.dadosContato;
      if (dados.gestor_conta_id !== undefined) updateData.gestor_conta_id = dados.gestor_conta_id;
      
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('orcamentos')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('❌ Context: Erro na atualização:', error);
        toast({
          title: "Erro na atualização",
          description: "Não foi possível atualizar o orçamento. Tente novamente.",
          variant: "destructive",
        });
        return false;
      }

      console.log('✅ Context: Orçamento atualizado com sucesso');
      
      // Recarregar a lista de orçamentos
      await recarregarComRetry();
      
      return true;
    } catch (error) {
      console.error('❌ Context: Erro inesperado na atualização:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      return false;
    }
  }, [recarregarComRetry]);

  const excluirOrcamento = useCallback(async (orcamentoId: string): Promise<boolean> => {
    setIsDeleting(true);
    try {
      console.log('🗑️ Context: Iniciando exclusão do orçamento:', orcamentoId);
      
      const { data, error } = await supabase.rpc('excluir_orcamento_admin', {
        p_orcamento_id: orcamentoId
      });

      if (error) {
        console.error('❌ Context: Erro na exclusão:', error);
        toast({
          title: "Erro na exclusão",
          description: "Não foi possível excluir o orçamento. Tente novamente.",
          variant: "destructive",
        });
        return false;
      }

      const response = data as unknown as ExcluirOrcamentoResponse;

      if (!response?.success) {
        console.error('❌ Context: Erro retornado pela função:', response);
        toast({
          title: "Erro na exclusão",
          description: response?.message || "Não foi possível excluir o orçamento.",
          variant: "destructive",
        });
        return false;
      }

      console.log('✅ Context: Orçamento excluído com sucesso:', response);
      toast({
        title: "Orçamento excluído",
        description: `Orçamento excluído com sucesso. ${response.candidaturas_removidas} candidaturas e ${response.inscricoes_removidas} inscrições removidas.`,
      });
      
      // Recarregar a lista de orçamentos com retry
      await recarregarComRetry();
      
      return true;
    } catch (error) {
      console.error('❌ Context: Erro inesperado na exclusão:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [recarregarComRetry]);

  const obterOrcamentosAbertos = useCallback(() => {
    return orcamentos.filter(o => o.status === 'aberto');
  }, [orcamentos]);

  const obterOrcamentosFechados = useCallback(() => {
    return orcamentos.filter(o => o.status === 'fechado');
  }, [orcamentos]);

  useEffect(() => {
    carregarOrcamentos();
  }, [carregarOrcamentos]);

  return (
    <OrcamentoContext.Provider value={{
      orcamentos,
      adicionarOrcamento,
      atualizarOrcamento,
      inscreverFornecedor,
      excluirOrcamento,
      obterOrcamentosAbertos,
      obterOrcamentosFechados,
      carregarOrcamentos,
      isDeleting,
      recarregarComRetry,
      totalCount,
      hasMore,
      carregarMais,
      isLoadingMore,
    }}>
      {children}
    </OrcamentoContext.Provider>
  );
};
