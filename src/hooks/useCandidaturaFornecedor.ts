
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Fornecedor } from '@/types';
import { RpcResponse } from '@/types/orcamento';
import { useToast } from '@/hooks/use-toast';
import { usePenalidadesFornecedor } from '@/hooks/usePenalidadesFornecedor';

export const useCandidaturaFornecedor = (carregarOrcamentos: () => void) => {
  const { toast } = useToast();
  const { verificarPenalidadesAtivas } = usePenalidadesFornecedor();

  const candidatarFornecedor = useCallback(async (orcamentoId: string, fornecedorData: Omit<Fornecedor, 'id' | 'dataInscricao'>): Promise<boolean> => {
    try {
      console.log('Iniciando candidatura do fornecedor:', { orcamentoId, fornecedorData });

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

      // Verificar penalidades ativas antes de permitir candidatura
      const penalidades = await verificarPenalidadesAtivas(user.id);
      if (penalidades?.temPenalidades) {
        const tiposAtivos = penalidades.tipos;
        
        if (tiposAtivos.includes('bloqueio_temporario') || tiposAtivos.includes('suspensao_completa')) {
          const detalhes = penalidades.detalhes.find(d => 
            d.tipo === 'bloqueio_temporario' || d.tipo === 'suspensao_completa'
          );
          
          toast({
            title: "Candidatura Bloqueada",
            description: `Você possui uma penalidade ativa que impede novas inscrições até ${new Date(detalhes?.expiraEm || '').toLocaleDateString('pt-BR')}`,
            variant: "destructive"
          });
          return false;
        }
      }

      console.log('Chamando função RPC processar_candidatura_fornecedor...');

      // Usar a nova função RPC que insere em ambas as tabelas
      const { data: resultado, error: rpcError } = await supabase.rpc('processar_candidatura_fornecedor', {
        p_orcamento_id: orcamentoId,
        p_nome: fornecedorData.nome,
        p_email: fornecedorData.email,
        p_telefone: fornecedorData.telefone,
        p_empresa: fornecedorData.empresa,
      });

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
  }, [carregarOrcamentos, toast, verificarPenalidadesAtivas]);

  return { candidatarFornecedor };
};
