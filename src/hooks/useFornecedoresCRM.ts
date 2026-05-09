import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FornecedorCRM {
  fornecedor_id: string;
  nome: string;
  empresa: string;
  email: string;
}

export const useFornecedoresCRM = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['fornecedores-crm'],
    queryFn: async () => {
      console.log('🔍 Buscando fornecedores únicos do CRM (view otimizada)...');
      
      // Usar a view otimizada que faz a deduplicação no servidor
      const { data, error } = await supabase
        .from('view_fornecedores_unicos_crm')
        .select('*')
        .order('nome');

      if (error) {
        console.error('❌ Erro ao buscar fornecedores:', error);
        throw error;
      }

      console.log('✅ Fornecedores únicos carregados:', data?.length || 0);
      return data as FornecedorCRM[];
    },
    enabled, // Permite lazy loading
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
};
