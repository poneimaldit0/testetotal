import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useIsMaster } from '@/hooks/useIsMaster';

export interface SolicitacaoAjuda {
  id: string;
  candidaturaId: string;
  mensagem: string;
  dataHora: Date;
  respondida: boolean;
  respostaAdmin?: string;
  dataResposta?: Date;
  orcamentoInfo?: {
    necessidade: string;
    codigo: string;
  };
  fornecedorInfo?: {
    nome: string;
    email: string;
    empresa?: string;
  };
}

export const useSolicitacoesAjuda = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const isMaster = useIsMaster();
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoAjuda[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Verificar se é admin ou master
  const isAdmin = profile?.tipo_usuario === 'admin' || profile?.tipo_usuario === 'master';
  const isAdminOrMaster = isAdmin || isMaster;

  const criarSolicitacao = useCallback(async (candidaturaId: string, mensagem: string): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('solicitacoes_ajuda')
        .insert({
          candidatura_id: candidaturaId,
          fornecedor_id: user.id,
          mensagem
        });

      if (error) {
        console.error('Erro ao criar solicitação:', error);
        toast({
          title: "Erro",
          description: "Erro ao enviar solicitação de ajuda",
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Sucesso!",
        description: "Solicitação de ajuda enviada. Você receberá uma resposta em breve."
      });

      carregarSolicitacoes();
      return true;

    } catch (error) {
      console.error('Erro geral ao criar solicitação:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao enviar solicitação",
        variant: "destructive"
      });
      return false;
    }
  }, [user?.id, toast]);

  const carregarSolicitacoes = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Se for admin/master, buscar todas as solicitações com dados do fornecedor
      if (isAdminOrMaster) {
        const { data, error } = await supabase
          .from('solicitacoes_ajuda')
          .select(`
            id,
            candidatura_id,
            fornecedor_id,
            mensagem,
            data_solicitacao,
            respondida,
            resposta_admin,
            data_resposta,
            candidaturas_fornecedores!inner (
              orcamento_id,
              fornecedor_id,
              orcamentos (
                necessidade,
                codigo_orcamento
              )
            ),
            profiles!solicitacoes_ajuda_fornecedor_id_fkey (
              nome,
              email,
              empresa
            )
          `)
          .order('data_solicitacao', { ascending: false });

        if (error) {
          console.error('Erro ao buscar solicitações (admin):', error);
          return;
        }

        const solicitacoesProcessadas: SolicitacaoAjuda[] = (data || []).map(item => ({
          id: item.id,
          candidaturaId: item.candidatura_id,
          mensagem: item.mensagem,
          dataHora: new Date(item.data_solicitacao),
          respondida: item.respondida,
          respostaAdmin: item.resposta_admin || undefined,
          dataResposta: item.data_resposta ? new Date(item.data_resposta) : undefined,
          orcamentoInfo: {
            necessidade: (item.candidaturas_fornecedores as any)?.orcamentos?.necessidade || 'Sem descrição',
            codigo: (item.candidaturas_fornecedores as any)?.orcamentos?.codigo_orcamento || 
                   `ORG-${item.candidatura_id.slice(0, 8)}`
          },
          fornecedorInfo: {
            nome: (item.profiles as any)?.nome || 'Nome não disponível',
            email: (item.profiles as any)?.email || 'Email não disponível',
            empresa: (item.profiles as any)?.empresa
          }
        }));

        setSolicitacoes(solicitacoesProcessadas);
      } else {
        // Se for fornecedor, buscar apenas suas solicitações
        const { data, error } = await supabase
          .from('solicitacoes_ajuda')
          .select(`
            id,
            candidatura_id,
            mensagem,
            data_solicitacao,
            respondida,
            resposta_admin,
            data_resposta,
            candidaturas_fornecedores!inner (
              orcamento_id,
              orcamentos (
                necessidade,
                codigo_orcamento
              )
            )
          `)
          .eq('fornecedor_id', user.id)
          .order('data_solicitacao', { ascending: false });

        if (error) {
          console.error('Erro ao buscar solicitações (fornecedor):', error);
          return;
        }

        const solicitacoesProcessadas: SolicitacaoAjuda[] = (data || []).map(item => ({
          id: item.id,
          candidaturaId: item.candidatura_id,
          mensagem: item.mensagem,
          dataHora: new Date(item.data_solicitacao),
          respondida: item.respondida,
          respostaAdmin: item.resposta_admin || undefined,
          dataResposta: item.data_resposta ? new Date(item.data_resposta) : undefined,
          orcamentoInfo: {
            necessidade: (item.candidaturas_fornecedores as any)?.orcamentos?.necessidade || 'Sem descrição',
            codigo: (item.candidaturas_fornecedores as any)?.orcamentos?.codigo_orcamento || 
                   `ORG-${item.candidatura_id.slice(0, 8)}`
          }
        }));

        setSolicitacoes(solicitacoesProcessadas);
      }

    } catch (error) {
      console.error('Erro geral ao carregar solicitações:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAdminOrMaster]);

  useEffect(() => {
    carregarSolicitacoes();
  }, [carregarSolicitacoes]);

  return {
    solicitacoes,
    loading,
    criarSolicitacao,
    recarregar: carregarSolicitacoes
  };
};