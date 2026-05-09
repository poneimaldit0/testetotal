import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface Anexo {
  id: string;
  lead_id: string;
  nome_arquivo: string;
  tipo_arquivo: string;
  tamanho: number;
  caminho_storage: string;
  url_arquivo: string;
  categoria: 'documento' | 'imagem' | 'video';
  adicionado_por_id: string | null;
  adicionado_por_nome: string | null;
  created_at: string;
}

export function useAnexosMarcenaria(leadId: string) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  // Buscar anexos do lead
  const { data: anexos = [], isLoading } = useQuery({
    queryKey: ['crm-marcenaria-anexos', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_marcenaria_anexos')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Anexo[];
    },
    enabled: !!leadId
  });
  
  // Upload de arquivo
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Determinar categoria
      let categoria: 'documento' | 'imagem' | 'video' = 'documento';
      if (file.type.startsWith('image/')) categoria = 'imagem';
      if (file.type.startsWith('video/')) categoria = 'video';
      
      // Criar caminho único
      const timestamp = Date.now();
      const nomeUnico = `${leadId}/${timestamp}_${file.name}`;
      
      // Upload para storage
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('crm-marcenaria-anexos')
        .upload(nomeUnico, file);
      
      if (uploadError) throw uploadError;
      
      // Obter URL pública
      const { data: { publicUrl } } = supabase
        .storage
        .from('crm-marcenaria-anexos')
        .getPublicUrl(uploadData.path);
      
      // Inserir registro no banco
      const { data: anexo, error: insertError } = await supabase
        .from('crm_marcenaria_anexos')
        .insert({
          lead_id: leadId,
          nome_arquivo: file.name,
          tipo_arquivo: file.type,
          tamanho: file.size,
          caminho_storage: uploadData.path,
          url_arquivo: publicUrl,
          categoria,
          adicionado_por_id: profile?.id,
          adicionado_por_nome: profile?.nome
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      return anexo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-marcenaria-anexos', leadId] });
      toast({
        title: 'Arquivo enviado',
        description: 'O arquivo foi adicionado com sucesso'
      });
    },
    onError: (error) => {
      console.error('Erro ao fazer upload:', error);
      toast({
        variant: 'destructive',
        title: 'Erro no upload',
        description: 'Não foi possível enviar o arquivo'
      });
    }
  });
  
  // Deletar anexo
  const deletarMutation = useMutation({
    mutationFn: async (anexo: Anexo) => {
      // Deletar do storage
      const { error: storageError } = await supabase
        .storage
        .from('crm-marcenaria-anexos')
        .remove([anexo.caminho_storage]);
      
      if (storageError) throw storageError;
      
      // Deletar registro do banco
      const { error: dbError } = await supabase
        .from('crm_marcenaria_anexos')
        .delete()
        .eq('id', anexo.id);
      
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-marcenaria-anexos', leadId] });
      toast({
        title: 'Arquivo removido',
        description: 'O arquivo foi excluído com sucesso'
      });
    },
    onError: (error) => {
      console.error('Erro ao deletar:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao deletar',
        description: 'Não foi possível remover o arquivo'
      });
    }
  });
  
  return {
    anexos,
    isLoading,
    uploadArquivo: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
    deletarAnexo: deletarMutation.mutate,
    isDeletando: deletarMutation.isPending
  };
}
