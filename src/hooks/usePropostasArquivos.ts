import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PropostaArquivo {
  id: string;
  candidatura_id: string;
  orcamento_id: string;
  fornecedor_id: string;
  nome_arquivo: string;
  url_arquivo: string;
  caminho_storage: string;
  tipo_arquivo: string;
  tamanho: number;
  created_at: string;
}

export const usePropostasArquivos = (candidaturaId: string, orcamentoId: string) => {
  const [arquivos, setArquivos] = useState<PropostaArquivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const carregarArquivos = useCallback(async () => {
    if (!candidaturaId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('propostas_arquivos')
        .select('*')
        .eq('candidatura_id', candidaturaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArquivos(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar arquivos da proposta:', error);
    } finally {
      setLoading(false);
    }
  }, [candidaturaId]);

  useEffect(() => {
    carregarArquivos();
  }, [carregarArquivos]);

  const LIMITE_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB — deve coincidir com o limite da análise

  const uploadArquivo = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);

      const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!TIPOS_PERMITIDOS.includes(file.type)) {
        toast({
          title: "Formato não suportado",
          description: "Envie apenas PDF, JPEG ou PNG. Arquivos Word não podem ser analisados — converta para PDF antes de enviar.",
          variant: "destructive",
        });
        return null;
      }

      if (file.size > LIMITE_UPLOAD_BYTES) {
        const mb = (file.size / (1024 * 1024)).toFixed(1);
        toast({
          title: "Arquivo muito grande",
          description: `Arquivo excede o limite de 10MB para análise (${mb}MB). Reduza o arquivo ou envie apenas as páginas relevantes.`,
          variant: "destructive",
        });
        return null;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para enviar arquivos",
          variant: "destructive",
        });
        return null;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${candidaturaId}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('propostas-fornecedores')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('propostas-fornecedores')
        .getPublicUrl(filePath);

      const { data: insertData, error: insertError } = await supabase
        .from('propostas_arquivos')
        .insert({
          candidatura_id: candidaturaId,
          orcamento_id: orcamentoId,
          fornecedor_id: user.id,
          nome_arquivo: file.name,
          url_arquivo: urlData.publicUrl,
          caminho_storage: filePath,
          tipo_arquivo: file.type,
          tamanho: file.size,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      await supabase
        .from('candidaturas_fornecedores')
        .update({ proposta_enviada: true })
        .eq('id', candidaturaId);

      toast({
        title: "Sucesso",
        description: "Proposta anexada com sucesso!",
      });

      await carregarArquivos();
      return insertData?.id || null;
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o arquivo",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const removerArquivo = async (arquivo: PropostaArquivo) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('propostas-fornecedores')
        .remove([arquivo.caminho_storage]);

      if (storageError) {
        console.warn('Erro ao remover do storage:', storageError);
      }

      // Cancelar análise pendente vinculada a este arquivo antes de deletar
      const { error: cancelErr } = await (supabase as any)
        .from('propostas_analises_ia')
        .update({ status: 'cancelada', raw_response: 'Análise abortada — proposta removida' })
        .eq('propostas_arquivo_id', arquivo.id)
        .eq('status', 'pending');

      if (cancelErr) {
        console.warn('[removerArquivo] Erro ao cancelar análise pendente:', cancelErr);
      } else {
        console.log('[removerArquivo] Análise pendente cancelada para arquivo:', arquivo.id);
      }

      const { error: deleteError } = await supabase
        .from('propostas_arquivos')
        .delete()
        .eq('id', arquivo.id);

      if (deleteError) throw deleteError;

      const { data: remaining } = await supabase
        .from('propostas_arquivos')
        .select('id')
        .eq('candidatura_id', candidaturaId);

      if (!remaining || remaining.length === 0) {
        await supabase
          .from('candidaturas_fornecedores')
          .update({ proposta_enviada: false })
          .eq('id', candidaturaId);
      }

      toast({
        title: "Sucesso",
        description: "Arquivo removido com sucesso",
      });

      await carregarArquivos();
    } catch (error: any) {
      console.error('Erro ao remover arquivo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o arquivo",
        variant: "destructive",
      });
    }
  };

  const downloadArquivo = async (arquivo: PropostaArquivo) => {
    try {
      const { data, error } = await supabase.storage
        .from('propostas-fornecedores')
        .download(arquivo.caminho_storage);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = arquivo.nome_arquivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Erro ao baixar arquivo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível baixar o arquivo",
        variant: "destructive",
      });
    }
  };

  return {
    arquivos,
    loading,
    uploading,
    uploadArquivo,
    removerArquivo,
    downloadArquivo,
    recarregar: carregarArquivos,
    temProposta: arquivos.length > 0,
  };
};
