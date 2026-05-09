import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ContratoDiario {
  id: string;
  cliente_id: string;
  valor_contrato: number;
  status_assinatura: string;
  data_assinatura_fornecedor: string;
  clientes: {
    nome: string;
    email: string;
    telefone?: string;
  };
}

export interface RegistroDiario {
  id: string;
  contrato_id: string;
  fornecedor_id: string;
  data_registro: string;
  atividades_realizadas: string;
  clima?: string;
  materiais_utilizados?: string;
  funcionarios_presentes?: string;
  observacoes?: string;
  fotos?: string[];
  visivel_cliente: boolean;
  created_at: string;
  updated_at: string;
}

export const useDiarioObra = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar contratos ativos do fornecedor
  const {
    data: contratos = [],
    isLoading: loadingContratos
  } = useQuery({
    queryKey: ['contratos-diario', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('contratos')
        .select(`
          id,
          cliente_id,
          valor_contrato,
          status_assinatura,
          data_assinatura_fornecedor,
          clientes (
            nome,
            email,
            telefone
          )
        `)
        .eq('fornecedor_id', user.id)
        .eq('status_assinatura', 'assinado')
        .order('data_assinatura_fornecedor', { ascending: false });

      if (error) {
        console.error('Erro ao buscar contratos:', error);
        return [];
      }

      return data as ContratoDiario[];
    },
    enabled: !!user?.id
  });

  // Buscar registros do diário para um contrato específico
  const useRegistrosDiario = (contratoId?: string) => {
    return useQuery({
      queryKey: ['registros-diario', contratoId],
      queryFn: async () => {
        if (!contratoId || !user?.id) return [];
        
        const { data, error } = await supabase
          .from('diario_obra')
          .select('*')
          .eq('contrato_id', contratoId)
          .eq('fornecedor_id', user.id)
          .order('data_registro', { ascending: false });

        if (error) {
          console.error('Erro ao buscar registros do diário:', error);
          return [];
        }

        return data as RegistroDiario[];
      },
      enabled: !!contratoId && !!user?.id
    });
  };

  // Criar novo registro no diário
  const criarRegistro = useMutation({
    mutationFn: async (registro: Omit<RegistroDiario, 'id' | 'created_at' | 'updated_at' | 'fornecedor_id'>) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      const registroCompleto = {
        ...registro,
        fornecedor_id: user.id
      };
      
      const { data, error } = await supabase
        .from('diario_obra')
        .insert([registroCompleto])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['registros-diario', data.contrato_id] });
      toast.success('Registro do diário criado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar registro:', error);
      toast.error('Erro ao criar registro do diário');
    }
  });

  // Upload de imagens
  const uploadImagem = async (file: File, contratoId: string, dataRegistro: string): Promise<string> => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${user.id}/${contratoId}/${dataRegistro}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('diario-obra-fotos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('diario-obra-fotos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Deletar imagem
  const deletarImagem = async (imageUrl: string): Promise<void> => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    // Extrair o caminho da URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const filePath = pathParts.slice(-4).join('/'); // fornecedor_id/contrato_id/data/arquivo

    const { error } = await supabase.storage
      .from('diario-obra-fotos')
      .remove([filePath]);

    if (error) throw error;
  };

  // Estatísticas do mês
  const useEstatisticasMes = (contratoId?: string) => {
    return useQuery({
      queryKey: ['estatisticas-diario', contratoId, new Date().getMonth()],
      queryFn: async () => {
        if (!contratoId || !user?.id) return null;

        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);

        const fimMes = new Date();
        fimMes.setMonth(fimMes.getMonth() + 1);
        fimMes.setDate(0);
        fimMes.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from('diario_obra')
          .select('data_registro')
          .eq('contrato_id', contratoId)
          .eq('fornecedor_id', user.id)
          .gte('data_registro', inicioMes.toISOString().split('T')[0])
          .lte('data_registro', fimMes.toISOString().split('T')[0]);

        if (error) {
          console.error('Erro ao buscar estatísticas:', error);
          return null;
        }

        const diasUnicos = new Set(data.map(r => r.data_registro)).size;
        
        return {
          diasTrabalhados: diasUnicos,
          registrosCriados: data.length,
          mes: inicioMes.getMonth() + 1,
          ano: inicioMes.getFullYear()
        };
      },
      enabled: !!contratoId && !!user?.id
    });
  };

  return {
    contratos,
    loadingContratos,
    useRegistrosDiario,
    useEstatisticasMes,
    criarRegistro,
    uploadImagem,
    deletarImagem
  };
};