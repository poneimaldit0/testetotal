import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PropostaNaComparacao {
  id: string;
  fornecedor_nome: string;
  fornecedor_empresa: string;
  status: string;
  valor_total: number;
  data_candidatura: string;
}

interface OrcamentoComParada {
  id: string;
  necessidade: string;
  local: string;
  status: string;
  data_publicacao: string;
  propostas: PropostaNaComparacao[];
  dados_contato?: {
    nome: string;
    telefone: string;
    email: string;
  };
}

interface FiltrosComparador {
  status?: string;
  temPropostas?: boolean;
  valorMinimo?: number;
  valorMaximo?: number;
  busca?: string;
}

export const useOrcamentosComPropostas = () => {
  const [orcamentos, setOrcamentos] = useState<OrcamentoComParada[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const carregarOrcamentosComPropostas = async (filtros?: FiltrosComparador) => {
    try {
      setLoading(true);
      
      console.log('🔄 Carregando orçamentos com propostas...');

      // Query para buscar orçamentos com suas candidaturas e propostas
      const { data: orcamentosData, error: orcamentosError } = await supabase
        .from('orcamentos')
        .select(`
          id,
          necessidade,
          local,
          status,
          data_publicacao,
          dados_contato,
          candidaturas_fornecedores (
            id,
            nome,
            empresa,
            data_candidatura,
            checklist_propostas (
              id,
              status,
              valor_total_estimado
            )
          )
        `)
        .order('data_publicacao', { ascending: false });

      if (orcamentosError) {
        console.error('❌ Erro ao carregar orçamentos:', orcamentosError);
        throw new Error(`Erro na consulta: ${orcamentosError.message}`);
      }

      console.log('✅ Orçamentos carregados:', orcamentosData?.length || 0);

      if (!orcamentosData || orcamentosData.length === 0) {
        setOrcamentos([]);
        setLoading(false);
        return;
      }

      // Processar dados para o formato esperado
      const orcamentosProcessados: OrcamentoComParada[] = [];

      for (const orcamento of orcamentosData) {
        const candidaturas = orcamento.candidaturas_fornecedores || [];
        
        // Normalizar checklist_propostas para sempre ser array
        const candidaturasNormalizadas = candidaturas.map((candidatura: any) => {
          let checklistPropostas = candidatura.checklist_propostas;
          
          // Se não é array, transformar em array
          if (checklistPropostas && !Array.isArray(checklistPropostas)) {
            checklistPropostas = [checklistPropostas];
          }
          
          return {
            ...candidatura,
            checklist_propostas: checklistPropostas || []
          };
        });
        
        // Filtrar candidaturas que têm pelo menos 1 proposta
        const candidaturasComPropostas = candidaturasNormalizadas.filter(
          (candidatura: any) => candidatura.checklist_propostas && 
            candidatura.checklist_propostas.length > 0
        );

        // Se não há candidaturas com propostas, pular orçamento
        if (candidaturasComPropostas.length === 0) {
          continue;
        }

        // Mapear propostas
        const propostas: PropostaNaComparacao[] = candidaturasComPropostas.map((candidatura: any) => {
          const proposta = candidatura.checklist_propostas[0]; // Primeira proposta (deveria ser única)
          
          return {
            id: candidatura.id,
            fornecedor_nome: candidatura.nome,
            fornecedor_empresa: candidatura.empresa,
            status: proposta?.status || 'sem_proposta',
            valor_total: proposta?.valor_total_estimado || 0,
            data_candidatura: candidatura.data_candidatura
          };
        });

        // Aplicar filtros
        let incluirOrcamento = true;

        // Filtro por status do orçamento
        if (filtros?.status && filtros.status !== 'todos' && orcamento.status !== filtros.status) {
          incluirOrcamento = false;
        }

        // Filtro por busca
        if (filtros?.busca && incluirOrcamento) {
          const buscaLower = filtros.busca.toLowerCase();
          const encontrouNaBusca = (
            orcamento.necessidade.toLowerCase().includes(buscaLower) ||
            orcamento.local.toLowerCase().includes(buscaLower) ||
            propostas.some(p => 
              p.fornecedor_nome.toLowerCase().includes(buscaLower) ||
              p.fornecedor_empresa.toLowerCase().includes(buscaLower)
            )
          );
          if (!encontrouNaBusca) {
            incluirOrcamento = false;
          }
        }

        // Filtro por valor
        if ((filtros?.valorMinimo || filtros?.valorMaximo) && incluirOrcamento) {
          const valores = propostas.map(p => p.valor_total).filter(v => v > 0);
          if (valores.length > 0) {
            const valorMinimo = Math.min(...valores);
            const valorMaximo = Math.max(...valores);
            
            if (filtros.valorMinimo && valorMaximo < filtros.valorMinimo) {
              incluirOrcamento = false;
            }
            if (filtros.valorMaximo && valorMinimo > filtros.valorMaximo) {
              incluirOrcamento = false;
            }
          } else if (filtros.valorMinimo || filtros.valorMaximo) {
            // Se tem filtro de valor mas não há valores nas propostas
            incluirOrcamento = false;
          }
        }

        if (incluirOrcamento) {
          orcamentosProcessados.push({
            id: orcamento.id,
            necessidade: orcamento.necessidade,
            local: orcamento.local,
            status: orcamento.status,
            data_publicacao: orcamento.data_publicacao,
            dados_contato: orcamento.dados_contato as any,
            propostas: propostas.sort((a, b) => a.valor_total - b.valor_total) // Ordenar por valor
          });
        }
      }

      console.log('📊 Orçamentos processados:', {
        total: orcamentosData.length,
        comPropostas: orcamentosProcessados.length,
        detalhes: orcamentosProcessados.map(o => ({
          id: o.id.substring(0, 8) + '...',
          necessidade: o.necessidade.substring(0, 30) + '...',
          propostas: o.propostas.length
        }))
      });

      setOrcamentos(orcamentosProcessados);
      
      if (orcamentosProcessados.length === 0 && !filtros) {
        toast({
          title: "Nenhum orçamento com propostas",
          description: "Não há orçamentos que receberam propostas dos fornecedores",
          variant: "default"
        });
      }

    } catch (error: any) {
      console.error('❌ Erro no carregamento:', error);
      
      setOrcamentos([]);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarOrcamentosComPropostas();
  }, []);

  return {
    orcamentos,
    loading,
    carregarOrcamentosComPropostas
  };
};