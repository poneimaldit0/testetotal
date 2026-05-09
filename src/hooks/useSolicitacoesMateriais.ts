import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface SolicitacaoMaterial {
  id: string;
  contrato_id: string | null;
  cliente_id: string | null;
  fornecedor_id: string | null;
  tipo: string;
  descricao: string;
  valor_estimado: number | null;
  status: string;
  data_necessidade: string | null;
  data_aprovacao: string | null;
  observacoes_cliente: string | null;
  observacoes_fornecedor: string | null;
  created_at: string;
  updated_at: string;
}

export const useSolicitacoesMateriais = (contratoId?: string) => {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const carregarSolicitacoes = async () => {
    if (!contratoId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('solicitacoes_materiais')
        .select('*')
        .eq('contrato_id', contratoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSolicitacoes(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar solicitações:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar solicitações de materiais",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const criarSolicitacao = async (novaSolicitacao: {
    tipo: string;
    descricao: string;
    valor_estimado?: number;
    observacoes_cliente?: string;
  }) => {
    if (!contratoId) return;

    try {
      // Buscar dados do contrato para obter cliente_id e fornecedor_id
      const { data: contrato, error: contratoError } = await supabase
        .from('contratos')
        .select('cliente_id, fornecedor_id')
        .eq('id', contratoId)
        .single();

      if (contratoError) throw contratoError;

      const { error } = await supabase
        .from('solicitacoes_materiais')
        .insert([{
          contrato_id: contratoId,
          cliente_id: contrato.cliente_id,
          fornecedor_id: contrato.fornecedor_id,
          ...novaSolicitacao
        }]);

      if (error) throw error;
      
      await carregarSolicitacoes();
      toast({
        title: "Sucesso",
        description: "Solicitação enviada com sucesso",
      });
    } catch (error: any) {
      console.error('Erro ao criar solicitação:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar solicitação",
        variant: "destructive",
      });
    }
  };

  const responderSolicitacao = async (
    solicitacaoId: string, 
    status: string,
    valorEstimado?: number,
    observacoesFornecedor?: string
  ) => {
    try {
      const { error } = await supabase
        .from('solicitacoes_materiais')
        .update({
          status,
          valor_estimado: valorEstimado,
          observacoes_fornecedor: observacoesFornecedor,
          data_aprovacao: status === 'aprovado' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', solicitacaoId);

      if (error) throw error;
      
      await carregarSolicitacoes();
      toast({
        title: "Sucesso",
        description: "Resposta enviada com sucesso",
      });
    } catch (error: any) {
      console.error('Erro ao responder solicitação:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar resposta",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    carregarSolicitacoes();
  }, [contratoId]);

  return {
    solicitacoes,
    loading,
    carregarSolicitacoes,
    criarSolicitacao,
    responderSolicitacao,
  };
};