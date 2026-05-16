import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PropostaProblematica {
  id: string;
  kandidatura_id: string;
  fornecedor_nome: string;
  fornecedor_email: string;
  valor_total_estimado: number;
  respostas_count: number;
  orcamento_necessidade: string;
  orcamento_local: string;
}

export const useDataRecovery = () => {
  const [loading, setLoading] = useState(false);
  const [propostas, setPropostas] = useState<PropostaProblematica[]>([]);
  const { toast } = useToast();

  const detectarPropostasProblematicas = async () => {
    try {
      setLoading(true);
      
      // Buscar propostas com valor total mas sem respostas adequadas
      const { data, error } = await supabase
        .from('checklist_propostas')
        .select(`
          id,
          candidatura_id,
          valor_total_estimado,
          status,
          candidaturas_fornecedores!inner(
            id,
            fornecedor_id,
            orcamento_id,
            profiles!inner(nome, empresa, email),
            orcamentos!inner(necessidade, local)
          )
        `)
        .in('status', ['enviado', 'em_revisao'])
        .gt('valor_total_estimado', 0)
        .limit(500);

      if (error) throw error;

      const problemasDetectados: PropostaProblematica[] = [];

      // Para cada proposta, verificar se tem respostas
      for (const proposta of data || []) {
        const { data: respostas, error: respostasError } = await supabase
          .from('respostas_checklist')
          .select('id, incluido')
          .eq('checklist_proposta_id', proposta.id);

        if (respostasError) continue;

        const respostasIncluidas = respostas?.filter(r => r.incluido).length || 0;

        // Se tem valor total mas nenhuma resposta incluída, é problemática
        if (proposta.valor_total_estimado > 0 && respostasIncluidas === 0) {
          problemasDetectados.push({
            id: proposta.id,
            kandidatura_id: proposta.candidatura_id,
            fornecedor_nome: proposta.candidaturas_fornecedores.profiles.nome,
            fornecedor_email: proposta.candidaturas_fornecedores.profiles.email,
            valor_total_estimado: proposta.valor_total_estimado,
            respostas_count: respostas?.length || 0,
            orcamento_necessidade: proposta.candidaturas_fornecedores.orcamentos.necessidade,
            orcamento_local: proposta.candidaturas_fornecedores.orcamentos.local
          });
        }
      }

      setPropostas(problemasDetectados);
      
      if (problemasDetectados.length === 0) {
        toast({
          title: "Verificação concluída",
          description: "Nenhuma proposta problemática encontrada",
        });
      } else {
        toast({
          title: "Propostas problemáticas detectadas",
          description: `${problemasDetectados.length} propostas precisam de atenção`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Erro na detecção:', error);
      toast({
        title: "Erro na detecção",
        description: "Não foi possível detectar propostas problemáticas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const tentarRecuperarProposta = async (checklistPropostaId: string) => {
    try {
      console.log('=== TENTATIVA DE RECUPERAÇÃO ===');
      console.log('checklistPropostaId:', checklistPropostaId);

      // Buscar dados da proposta
      const { data: proposta, error: propostaError } = await supabase
        .from('checklist_propostas')
        .select(`
          *,
          candidaturas_fornecedores!inner(
            orcamento_id,
            fornecedor_id
          )
        `)
        .eq('id', checklistPropostaId)
        .single();

      if (propostaError || !proposta) {
        throw new Error('Proposta não encontrada');
      }

      // Buscar itens do checklist do orçamento
      const { data: itensChecklist, error: itensError } = await supabase
        .from('orcamentos_checklist_itens')
        .select(`
          item_id,
          checklist_itens(*)
        `)
        .eq('orcamento_id', proposta.candidaturas_fornecedores.orcamento_id);

      if (itensError) throw itensError;

      // Se não há itens de checklist, não podemos recuperar
      if (!itensChecklist || itensChecklist.length === 0) {
        toast({
          title: "Não é possível recuperar",
          description: "Este orçamento não possui checklist definido",
          variant: "destructive",
        });
        return;
      }

      // Criar respostas básicas para os itens principais
      const respostasParaInserir = itensChecklist.slice(0, 3).map(item => ({
        checklist_proposta_id: checklistPropostaId,
        item_id: item.item_id,
        incluido: true,
        valor_estimado: Math.round(proposta.valor_total_estimado / 3), // Dividir valor igualmente
        observacoes: 'Item recuperado automaticamente - favor revisar'
      }));

      const { error: insertError } = await supabase
        .from('respostas_checklist')
        .insert(respostasParaInserir);

      if (insertError) throw insertError;

      toast({
        title: "Recuperação realizada",
        description: "Itens básicos foram criados. O fornecedor deve revisar a proposta.",
      });

      // Recarregar lista
      detectarPropostasProblematicas();

    } catch (error) {
      console.error('Erro na recuperação:', error);
      toast({
        title: "Erro na recuperação",
        description: "Não foi possível recuperar automaticamente os dados",
        variant: "destructive",
      });
    }
  };

  return {
    loading,
    propostas,
    detectarPropostasProblematicas,
    tentarRecuperarProposta
  };
};