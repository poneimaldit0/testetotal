
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type TipoDocumento = 
  | 'rg_cnh' 
  | 'comprovante_endereco_pf' 
  | 'cartao_cnpj' 
  | 'contrato_social' 
  | 'comprovante_endereco_pj' 
  | 'contrato_homologacao';

export const TIPOS_DOCUMENTO: { tipo: TipoDocumento; label: string }[] = [
  { tipo: 'rg_cnh', label: 'RG ou CNH com CPF' },
  { tipo: 'comprovante_endereco_pf', label: 'Comprovante de Endereço PF' },
  { tipo: 'cartao_cnpj', label: 'Cartão CNPJ' },
  { tipo: 'contrato_social', label: 'Contrato Social' },
  { tipo: 'comprovante_endereco_pj', label: 'Comprovante de Endereço PJ' },
  { tipo: 'contrato_homologacao', label: 'Contrato de Homologação Assinado' },
];

export interface DadosHomologacao {
  cnpj: string;
  endereco_completo: string;
  email: string;
  telefone: string;
  vigencia_contrato: string;
  forma_pagamento: string;
}

export interface DocumentoHomologacao {
  id: string;
  tipo_documento: TipoDocumento;
  nome_arquivo: string;
  caminho_storage: string;
  created_at: string;
}

export const useDocumentosHomologacao = () => {
  const [loading] = useState(false);
  const { toast } = useToast();

  const uploadDocumento = async (
    fornecedorId: string,
    tipoDocumento: TipoDocumento,
    arquivo: File
  ): Promise<boolean> => {
    try {
      const ext = arquivo.name.split('.').pop();
      const caminho = `${fornecedorId}/${tipoDocumento}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos-homologacao')
        .upload(caminho, arquivo);

      if (uploadError) throw uploadError;

      const { data: userData } = await supabase.auth.getUser();

      const { error: dbError } = await supabase
        .from('fornecedor_documentos_homologacao')
        .insert({
          fornecedor_id: fornecedorId,
          tipo_documento: tipoDocumento,
          nome_arquivo: arquivo.name,
          caminho_storage: caminho,
          uploaded_by: userData?.user?.id,
        });

      if (dbError) throw dbError;
      return true;
    } catch (error: any) {
      console.error('Erro ao upload documento:', error);
      toast({
        title: "Erro no upload",
        description: error.message || "Erro ao enviar documento",
        variant: "destructive",
      });
      return false;
    }
  };

  const salvarDadosHomologacao = async (
    fornecedorId: string,
    dados: DadosHomologacao
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('fornecedor_dados_homologacao')
        .upsert({
          fornecedor_id: fornecedorId,
          ...dados,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'fornecedor_id' });

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Erro ao salvar dados homologacao:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar dados de homologação",
        variant: "destructive",
      });
      return false;
    }
  };

  const buscarDadosHomologacao = async (fornecedorId: string) => {
    try {
      const { data, error } = await supabase
        .from('fornecedor_dados_homologacao')
        .select('*')
        .eq('fornecedor_id', fornecedorId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Erro ao buscar dados homologacao:', error);
      return null;
    }
  };

  const buscarDocumentosHomologacao = async (fornecedorId: string): Promise<DocumentoHomologacao[]> => {
    try {
      const { data, error } = await supabase
        .from('fornecedor_documentos_homologacao')
        .select('*')
        .eq('fornecedor_id', fornecedorId);

      if (error) throw error;
      return (data || []) as DocumentoHomologacao[];
    } catch (error: any) {
      console.error('Erro ao buscar documentos:', error);
      return [];
    }
  };

  const downloadDocumento = async (caminho: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documentos-homologacao')
        .createSignedUrl(caminho, 300);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      console.error('Erro ao gerar URL:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar link de download",
        variant: "destructive",
      });
    }
  };

  return {
    loading,
    uploadDocumento,
    salvarDadosHomologacao,
    buscarDadosHomologacao,
    buscarDocumentosHomologacao,
    downloadDocumento,
  };
};
