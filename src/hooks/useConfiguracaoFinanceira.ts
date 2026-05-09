import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  CategoriaFinanceira, 
  SubcategoriaFinanceira,
  CreateSubcategoriaFinanceiraInput,
  FornecedorCliente, 
  CreateFornecedorClienteInput 
} from '@/types/financeiro';

export const useConfiguracaoFinanceira = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // ===== CATEGORIAS FINANCEIRAS =====
  const buscarCategorias = useCallback(async (): Promise<CategoriaFinanceira[]> => {
    try {
      const { data, error } = await supabase
        .from('categorias_financeiras')
        .select('*')
        .order('nome');

      if (error) throw error;
      return (data || []) as CategoriaFinanceira[];
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar categorias financeiras",
        variant: "destructive"
      });
      return [];
    }
  }, [toast]);

  const criarCategoria = async (categoria: Omit<CategoriaFinanceira, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('categorias_financeiras')
        .insert([categoria]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Categoria criada com sucesso"
      });
      return true;
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar categoria",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const atualizarCategoria = async (id: string, categoria: Partial<CategoriaFinanceira>): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('categorias_financeiras')
        .update(categoria)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Categoria atualizada com sucesso"
      });
      return true;
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar categoria",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const desativarCategoria = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('categorias_financeiras')
        .update({ ativa: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Categoria desativada com sucesso"
      });
      return true;
    } catch (error) {
      console.error('Erro ao desativar categoria:', error);
      toast({
        title: "Erro",
        description: "Erro ao desativar categoria",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ===== FORNECEDORES/CLIENTES =====
  const buscarFornecedoresClientes = useCallback(async (tipo?: 'fornecedor' | 'cliente' | 'ambos'): Promise<FornecedorCliente[]> => {
    try {
      let query = supabase
        .from('fornecedores_clientes')
        .select('*')
        .order('ativo', { ascending: false })
        .order('nome', { ascending: true });

      if (tipo) {
        query = query.or(`tipo.eq.${tipo},tipo.eq.ambos`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as FornecedorCliente[];
    } catch (error) {
      console.error('Erro ao buscar fornecedores/clientes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar fornecedores/clientes",
        variant: "destructive"
      });
      return [];
    }
  }, [toast]);

  const criarFornecedorCliente = async (fornecedor: CreateFornecedorClienteInput): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('fornecedores_clientes')
        .insert([fornecedor]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Fornecedor/Cliente criado com sucesso"
      });
      return true;
    } catch (error) {
      console.error('Erro ao criar fornecedor/cliente:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar fornecedor/cliente",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const atualizarFornecedorCliente = async (id: string, fornecedor: Partial<FornecedorCliente>): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('fornecedores_clientes')
        .update(fornecedor)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Fornecedor/Cliente atualizado com sucesso"
      });
      return true;
    } catch (error) {
      console.error('Erro ao atualizar fornecedor/cliente:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar fornecedor/cliente",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const desativarFornecedorCliente = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('fornecedores_clientes')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Fornecedor/Cliente desativado com sucesso"
      });
      return true;
    } catch (error) {
      console.error('Erro ao desativar fornecedor/cliente:', error);
      toast({
        title: "Erro",
        description: "Erro ao desativar fornecedor/cliente",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ===== SUBCATEGORIAS FINANCEIRAS =====
  const buscarSubcategorias = useCallback(async (categoria_id?: string): Promise<SubcategoriaFinanceira[]> => {
    try {
      let query = supabase
        .from('subcategorias_financeiras')
        .select(`
          *,
          categoria:categorias_financeiras(id, nome, tipo)
        `)
        .order('nome');

      if (categoria_id) {
        query = query.eq('categoria_id', categoria_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as SubcategoriaFinanceira[];
    } catch (error) {
      console.error('Erro ao buscar subcategorias:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar subcategorias financeiras",
        variant: "destructive"
      });
      return [];
    }
  }, [toast]);

  const criarSubcategoria = async (subcategoria: CreateSubcategoriaFinanceiraInput): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('subcategorias_financeiras')
        .insert([subcategoria]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Subcategoria criada com sucesso"
      });
      return true;
    } catch (error) {
      console.error('Erro ao criar subcategoria:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar subcategoria",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const atualizarSubcategoria = async (id: string, subcategoria: Partial<SubcategoriaFinanceira>): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('subcategorias_financeiras')
        .update(subcategoria)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Subcategoria atualizada com sucesso"
      });
      return true;
    } catch (error) {
      console.error('Erro ao atualizar subcategoria:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar subcategoria",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const desativarSubcategoria = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('subcategorias_financeiras')
        .update({ ativa: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Subcategoria desativada com sucesso"
      });
      return true;
    } catch (error) {
      console.error('Erro ao desativar subcategoria:', error);
      toast({
        title: "Erro",
        description: "Erro ao desativar subcategoria",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ===== APROPRIAÇÃO EM MASSA DE SUBCATEGORIAS =====
  const buscarRegistrosSemSubcategoria = useCallback(async () => {
    try {
      // Buscar contas a receber sem subcategoria
      const { data: contasReceber, error: errorReceber } = await supabase
        .from('contas_receber')
        .select(`
          id,
          descricao,
          cliente_nome,
          valor_original,
          data_vencimento,
          status,
          categoria_id,
          categoria:categorias_financeiras(id, nome, tipo)
        `)
        .is('subcategoria_id', null)
        .order('data_vencimento');

      if (errorReceber) throw errorReceber;

      // Buscar contas a pagar sem subcategoria
      const { data: contasPagar, error: errorPagar } = await supabase
        .from('contas_pagar')
        .select(`
          id,
          descricao,
          fornecedor_nome,
          valor_original,
          data_vencimento,
          status,
          categoria_id,
          categoria:categorias_financeiras(id, nome, tipo)
        `)
        .is('subcategoria_id', null)
        .order('data_vencimento');

      if (errorPagar) throw errorPagar;

      return {
        contasReceber: contasReceber || [],
        contasPagar: contasPagar || []
      };
    } catch (error) {
      console.error('Erro ao buscar registros sem subcategoria:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar registros sem subcategoria",
        variant: "destructive"
      });
      return { contasReceber: [], contasPagar: [] };
    }
  }, [toast]);

  const apropriarSubcategoriasMassa = async (registros: {
    tipo: 'conta_receber' | 'conta_pagar';
    ids: string[];
    categoria_id: string;
    subcategoria_id: string;
  }): Promise<boolean> => {
    try {
      setLoading(true);
      
      const tabela = registros.tipo === 'conta_receber' ? 'contas_receber' : 'contas_pagar';
      
      const { error } = await supabase
        .from(tabela)
        .update({ 
          categoria_id: registros.categoria_id,
          subcategoria_id: registros.subcategoria_id 
        })
        .in('id', registros.ids);

      if (error) throw error;

      toast({
        title: "✅ Sucesso",
        description: `${registros.ids.length} registro(s) atualizado(s) com categoria e subcategoria`
      });
      return true;
    } catch (error) {
      console.error('Erro ao apropriar subcategorias em massa:', error);
      toast({
        title: "Erro",
        description: "Erro ao apropriar categorias e subcategorias",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    // Categorias
    buscarCategorias,
    criarCategoria,
    atualizarCategoria,
    desativarCategoria,
    // Subcategorias
    buscarSubcategorias,
    criarSubcategoria,
    atualizarSubcategoria,
    desativarSubcategoria,
    // Fornecedores/Clientes
    buscarFornecedoresClientes,
    criarFornecedorCliente,
    atualizarFornecedorCliente,
    desativarFornecedorCliente,
    // Apropriação em massa
    buscarRegistrosSemSubcategoria,
    apropriarSubcategoriasMassa
  };
};