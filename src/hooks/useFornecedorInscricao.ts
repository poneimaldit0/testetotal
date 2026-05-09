
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Fornecedor } from '@/types';
import { RpcResponse } from '@/types/orcamento';
import { useToast } from '@/hooks/use-toast';

export const useFornecedorInscricao = (carregarOrcamentos: () => void) => {
  const { toast } = useToast();

  const inscreverFornecedor = useCallback(async (orcamentoId: string, fornecedorData: Omit<Fornecedor, 'id' | 'dataInscricao'>, horarioVisitaId?: string): Promise<boolean> => {
    try {
      console.log('Iniciando candidatura do fornecedor (via nova função):', { orcamentoId, fornecedorData });

      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Erro ao obter usuário:', userError);
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        return false;
      }

      console.log('Chamando função RPC processar_candidatura_fornecedor (nova função)...');

      // Usar a nova função RPC que insere em ambas as tabelas
      const rpcParams: any = {
        p_orcamento_id: orcamentoId,
        p_nome: fornecedorData.nome,
        p_email: fornecedorData.email,
        p_telefone: fornecedorData.telefone,
        p_empresa: fornecedorData.empresa,
        p_horario_visita_id: horarioVisitaId || null,
      };

      const { data: resultado, error: rpcError } = await supabase.rpc('processar_candidatura_fornecedor', rpcParams);

      if (rpcError) {
        console.error('Erro ao chamar função RPC:', rpcError);
        toast({
          title: "Erro",
          description: "Erro interno do sistema. Tente novamente mais tarde.",
          variant: "destructive",
        });
        return false;
      }

      console.log('Resultado da função RPC:', resultado);

      // Fazer cast do resultado para a nossa interface via unknown
      const response = resultado as unknown as RpcResponse;

      // Verificar o resultado da função
      if (!response?.success) {
        let mensagem = "Erro desconhecido ao realizar candidatura";
        
        switch (response?.error) {
          case 'already_applied':
            mensagem = "Você já se candidatou a este orçamento";
            break;
          case 'already_enrolled':
            mensagem = "Você já está inscrito neste orçamento";
            break;
          case 'horario_indisponivel':
            mensagem = "Este horário de visita já foi reservado por outro fornecedor. Por favor, escolha outro horário.";
            break;
          case 'daily_limit_exceeded':
            mensagem = `Limite diário excedido: você já se candidatou a ${response.candidaturas_hoje || 0} orçamentos hoje. Seu limite diário é de ${response.limite_diario || 0} candidaturas.`;
            break;
          case 'monthly_limit_exceeded':
            mensagem = `Limite mensal excedido: você já se candidatou a ${response.candidaturas_mes || 0} orçamentos este mês. Seu limite mensal é de ${response.limite_mensal || 0} candidaturas.`;
            break;
          case 'limit_exceeded':
            // Ambos os limites excedidos
            mensagem = `Limites diário (${response.candidaturas_hoje}/${response.limite_diario}) e mensal (${response.candidaturas_mes}/${response.limite_mensal}) de candidaturas atingidos.`;
            break;
          case 'database_error':
            mensagem = response?.message || "Erro interno do sistema";
            break;
          default:
            mensagem = response?.message || "Erro inesperado ao realizar candidatura";
        }

        console.log('Erro na candidatura:', mensagem);
        toast({
          title: "Não foi possível completar a candidatura",
          description: mensagem,
          variant: "destructive",
        });
        return false;
      }

      // Sucesso - mostrar mensagem de confirmação
      toast({
        title: "Sucesso!",
        description: "Candidatura realizada com sucesso",
      });

      console.log('Candidatura realizada com sucesso');

      // Recarregar orçamentos para mostrar as mudanças
      await carregarOrcamentos();
      console.log('Orçamentos recarregados');
      
      return true;
    } catch (error) {
      console.error('Erro geral ao candidatar fornecedor:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado do sistema. Tente novamente mais tarde.",
        variant: "destructive",
      });
      return false;
    }
  }, [carregarOrcamentos, toast]);

  return { inscreverFornecedor };
};
