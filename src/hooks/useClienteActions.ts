import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DadosCadastroCliente, SolicitarRevisaoData } from '@/types/cliente';
import { useToast } from '@/hooks/use-toast';

interface CriarClienteResponse {
  success: boolean;
  credenciais?: {
    email: string;
    senha_temporaria: string;
  };
  cliente_id?: string;
  error?: string;
}

interface SolicitarRevisaoResponse {
  success: boolean;
  error?: string;
  message?: string;
  revisao_id?: string;
}

export const useClienteActions = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const aceitarProposta = async (dados: DadosCadastroCliente, propostaId: string, orcamentoId: string): Promise<CriarClienteResponse> => {
    setLoading(true);
    
    try {
      console.log('Chamando Edge Function para criar cliente:', { propostaId, orcamentoId, email: dados.email });

      // Chamar Edge Function para criar cliente e conta
      const { data, error } = await supabase.functions.invoke('criar-cliente-conta', {
        body: {
          proposta_id: propostaId,
          orcamento_id: orcamentoId,
          dados_cliente: dados
        }
      });

      if (error) {
        console.error('Erro na Edge Function:', error);
        throw new Error('Erro ao processar criação da conta: ' + error.message);
      }

      if (!data.success) {
        console.error('Edge Function retornou erro:', data.error);
        throw new Error(data.error || 'Erro desconhecido ao criar conta');
      }

      console.log('Cliente criado com sucesso:', data);

      return {
        success: true,
        credenciais: data.credenciais,
        cliente_id: data.cliente_id
      };

    } catch (error) {
      console.error('Erro ao aceitar proposta:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro inesperado ao aceitar proposta",
        variant: "destructive",
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Erro inesperado" 
      };
    } finally {
      setLoading(false);
    }
  };

  const solicitarRevisao = async (dados: SolicitarRevisaoData, token: string) => {
    setLoading(true);
    
    try {
      console.log('=== DEBUG REVISÃO ===');
      console.log('Token:', token);
      console.log('Dados completos:', dados);
      console.log('ID da proposta (checklist):', dados.proposta_id);
      console.log('Email cliente:', dados.email_cliente);
      console.log('Motivo:', dados.motivo_revisao);

      // Usar função RPC para solicitar revisão de forma segura
      const { data: result, error } = await supabase.rpc('solicitar_revisao_proposta', {
        p_token_acesso: token,
        p_checklist_proposta_id: dados.proposta_id,
        p_cliente_email: dados.email_cliente,
        p_motivo_revisao: dados.motivo_revisao
      });

      console.log('Resultado da RPC:', result);
      console.log('Erro da RPC:', error);

      if (error) {
        console.error('Erro na função RPC:', error);
        throw new Error('Erro ao processar solicitação de revisão: ' + error.message);
      }

      if (!result || !(result as unknown as SolicitarRevisaoResponse)?.success) {
        console.error('Função RPC retornou erro:', result);
        
        const typedResult = result as unknown as SolicitarRevisaoResponse;
        
        // Mapear erros específicos para mensagens amigáveis
        let mensagemErro = typedResult?.message || 'Erro desconhecido';
        
        switch (typedResult?.error) {
          case 'token_invalido':
            mensagemErro = 'Link de acesso inválido ou expirado. Solicite um novo link.';
            break;
          case 'proposta_nao_encontrada':
            mensagemErro = 'Proposta não encontrada ou não pertence a este orçamento.';
            break;
          case 'status_invalido':
            mensagemErro = `Esta proposta não pode ser revisada. Status atual: ${typedResult?.message?.split(': ')[1] || 'desconhecido'}`;
            break;
        }
        
        throw new Error(mensagemErro);
      }

      console.log('Revisão solicitada com sucesso:', result);

      toast({
        title: "Revisão Solicitada!",
        description: "O fornecedor foi notificado e você receberá um e-mail quando a revisão estiver pronta.",
      });

      return { success: true };

    } catch (error) {
      console.error('Erro ao solicitar revisão:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro inesperado ao solicitar revisão",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return {
    aceitarProposta,
    solicitarRevisao,
    loading
  };
};