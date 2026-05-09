import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProdutoSegmentacao {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const useProdutosSegmentacao = () => {
  const [produtos, setProdutos] = useState<ProdutoSegmentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProdutos = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('produtos_segmentacao')
        .select('*')
        .order('nome');

      if (error) throw error;
      setProdutos((data || []) as ProdutoSegmentacao[]);
    } catch (error: any) {
      console.error('Erro ao buscar produtos de segmentação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os produtos de segmentação',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const criarProduto = async (data: { nome: string; descricao?: string; cor?: string }) => {
    try {
      const { error } = await supabase
        .from('produtos_segmentacao')
        .insert({
          nome: data.nome,
          descricao: data.descricao || null,
          cor: data.cor || '#3B82F6',
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Produto criado com sucesso',
      });

      await fetchProdutos();
      return true;
    } catch (error: any) {
      console.error('Erro ao criar produto:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o produto',
        variant: 'destructive',
      });
      return false;
    }
  };

  const atualizarProduto = async (id: string, data: { nome?: string; descricao?: string; cor?: string; ativo?: boolean }) => {
    try {
      const { error } = await supabase
        .from('produtos_segmentacao')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Produto atualizado com sucesso',
      });

      await fetchProdutos();
      return true;
    } catch (error: any) {
      console.error('Erro ao atualizar produto:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o produto',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deletarProduto = async (id: string) => {
    try {
      // Verificar se há fornecedores ou orçamentos usando este produto
      const [{ count: fornecedoresCount }, { count: orcamentosCount }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('produto_segmentacao_id', id),
        supabase.from('orcamentos').select('*', { count: 'exact', head: true }).eq('produto_segmentacao_id', id),
      ]);

      if ((fornecedoresCount && fornecedoresCount > 0) || (orcamentosCount && orcamentosCount > 0)) {
        toast({
          title: 'Não é possível excluir',
          description: `Este produto está vinculado a ${fornecedoresCount || 0} fornecedor(es) e ${orcamentosCount || 0} orçamento(s). Desative-o em vez de excluir.`,
          variant: 'destructive',
        });
        return false;
      }

      const { error } = await supabase
        .from('produtos_segmentacao')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Produto excluído com sucesso',
      });

      await fetchProdutos();
      return true;
    } catch (error: any) {
      console.error('Erro ao deletar produto:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o produto',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, [fetchProdutos]);

  return {
    produtos,
    produtosAtivos: produtos.filter(p => p.ativo),
    loading,
    fetchProdutos,
    criarProduto,
    atualizarProduto,
    deletarProduto,
  };
};
