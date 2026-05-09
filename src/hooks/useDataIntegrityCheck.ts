import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProblemaIntegridade {
  checklistPropostaId: string;
  candidaturaId: string;
  fornecedor: string;
  valorTotal: number;
  respostasCount: number;
  problema: string;
}

export const useDataIntegrityCheck = () => {
  const [loading, setLoading] = useState(false);
  const [problemas, setProblemas] = useState<ProblemaIntegridade[]>([]);
  const { toast } = useToast();

  const verificarIntegridadeDados = async () => {
    try {
      setLoading(true);
      
      // Buscar propostas que podem ter problemas de integridade
      const { data: propostas, error } = await supabase
        .from('checklist_propostas')
        .select(`
          id,
          candidatura_id,
          valor_total_estimado,
          status,
          candidaturas_fornecedores!inner(
            fornecedor_id,
            profiles!inner(nome, empresa, email)
          )
        `)
        .in('status', ['enviado', 'em_revisao']);

      if (error) throw error;

      const problemasEncontrados: ProblemaIntegridade[] = [];

      for (const proposta of propostas || []) {
        // Verificar se tem respostas
        const { data: respostas, error: respostasError } = await supabase
          .from('respostas_checklist')
          .select('id, incluido, valor_estimado')
          .eq('checklist_proposta_id', proposta.id);

        if (respostasError) continue;

        const respostasCount = respostas?.length || 0;
        const respostasIncluidas = respostas?.filter(r => r.incluido).length || 0;
        const somaValores = respostas?.filter(r => r.incluido).reduce((acc, r) => acc + (r.valor_estimado || 0), 0) || 0;

        // Detectar problemas
        let problema = '';
        if (proposta.valor_total_estimado > 0 && respostasCount === 0) {
          problema = 'Valor total > 0 mas nenhuma resposta encontrada';
        } else if (proposta.valor_total_estimado > 0 && respostasIncluidas === 0) {
          problema = 'Valor total > 0 mas nenhum item incluído';
        } else if (Math.abs((proposta.valor_total_estimado || 0) - somaValores) > 1) {
          problema = `Inconsistência de valores: Total=${proposta.valor_total_estimado}, Soma=${somaValores}`;
        }

        if (problema) {
          problemasEncontrados.push({
            checklistPropostaId: proposta.id,
            candidaturaId: proposta.candidatura_id,
            fornecedor: `${proposta.candidaturas_fornecedores.profiles.empresa} (${proposta.candidaturas_fornecedores.profiles.email})`,
            valorTotal: proposta.valor_total_estimado || 0,
            respostasCount,
            problema
          });
        }
      }

      setProblemas(problemasEncontrados);
      
      if (problemasEncontrados.length === 0) {
        toast({
          title: "Verificação concluída",
          description: "Nenhum problema de integridade encontrado",
        });
      } else {
        toast({
          title: "Problemas encontrados",
          description: `${problemasEncontrados.length} propostas com problemas de integridade`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Erro na verificação de integridade:', error);
      toast({
        title: "Erro na verificação",
        description: "Não foi possível verificar a integridade dos dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const corrigirProblem = async (checklistPropostaId: string) => {
    try {
      // Implementar correção automática básica
      // Por exemplo, recriar respostas básicas para propostas sem respostas
      
      toast({
        title: "Correção em desenvolvimento",
        description: "Funcionalidade de correção automática em desenvolvimento",
      });
    } catch (error) {
      console.error('Erro na correção:', error);
      toast({
        title: "Erro na correção",
        description: "Não foi possível corrigir o problema",
        variant: "destructive",
      });
    }
  };

  return {
    loading,
    problemas,
    verificarIntegridadeDados,
    corrigirProblem
  };
};