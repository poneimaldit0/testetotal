import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FornecedorSearchResult {
  fornecedor_id: string;
  nome: string;
  empresa: string;
  email: string;
}

export const useFornecedorSearch = (searchTerm: string) => {
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);

  // Debounce do termo de busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['fornecedor-search', debouncedTerm],
    queryFn: async ({ signal }) => {
      if (!debouncedTerm || debouncedTerm.trim().length < 2) {
        return [];
      }

      const termo = `%${debouncedTerm.trim()}%`;
      
      const { data, error } = await supabase
        .from('view_fornecedores_unicos_crm')
        .select('fornecedor_id, nome, empresa, email')
        .or(`nome.ilike.${termo},empresa.ilike.${termo},email.ilike.${termo}`)
        .order('nome')
        .limit(50)
        .abortSignal(signal);

      if (error) {
        console.error('❌ Erro ao buscar fornecedores:', error);
        throw error;
      }

      console.log('✅ Fornecedores encontrados:', data?.length || 0);
      return data as FornecedorSearchResult[];
    },
    enabled: debouncedTerm.trim().length >= 2,
    staleTime: 2 * 60 * 1000, // Cache por 2 minutos
  });

  return {
    fornecedores: data || [],
    isLoading,
    error,
    isSearching: searchTerm !== debouncedTerm,
  };
};
