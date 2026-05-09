import { useState, useEffect } from 'react';
import { 
  buscarInscricoesFornecedor, 
  buscarOrcamentosPorIds, 
  buscarContagemEmpresasPorOrcamento 
} from './useMeusOrcamentosDB';
import { 
  OrcamentoMeusOrcamentos, 
  criarContagemPorOrcamento, 
  processarOrcamentoCompleto 
} from '@/utils/meusOrcamentosUtils';

// Exportar o tipo para uso em outros arquivos
export type { OrcamentoMeusOrcamentos };

export const useMeusOrcamentosFix = (userId?: string) => {
  const [orcamentos, setOrcamentos] = useState<OrcamentoMeusOrcamentos[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarOrcamentos = async () => {
    if (!userId) {
      console.log('❌ useMeusOrcamentosFix: userId não fornecido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 useMeusOrcamentosFix: Iniciando busca para userId:', userId);

      // ETAPA 1: Buscar todas as inscrições do usuário
      const inscricoes = await buscarInscricoesFornecedor(userId);

      console.log('📋 useMeusOrcamentosFix: Inscrições encontradas:', inscricoes.length);

      if (inscricoes.length === 0) {
        console.log('ℹ️ useMeusOrcamentosFix: Nenhuma inscrição encontrada para o usuário');
        setOrcamentos([]);
        setLoading(false);
        return;
      }

      // ETAPA 2: Buscar dados dos orçamentos correspondentes
      const orcamentoIds = inscricoes.map(i => i.orcamento_id);
      console.log('🔍 useMeusOrcamentosFix: Buscando orçamentos com IDs:', orcamentoIds);

      const orcamentosData = await buscarOrcamentosPorIds(orcamentoIds);

      console.log('📊 useMeusOrcamentosFix: Orçamentos encontrados:', orcamentosData.length);

      if (orcamentosData.length === 0) {
        console.log('⚠️ useMeusOrcamentosFix: Nenhum orçamento encontrado - possível inconsistência de dados');
        setOrcamentos([]);
        setLoading(false);
        return;
      }

      // ETAPA 3: Buscar contagem de empresas para cada orçamento
      const contagemEmpresas = await buscarContagemEmpresasPorOrcamento(orcamentoIds);
      const contagemPorOrcamento = criarContagemPorOrcamento(contagemEmpresas);

      console.log('👥 useMeusOrcamentosFix: Contagem de empresas por orçamento:', contagemPorOrcamento);

      // ETAPA 4: Combinar dados das inscrições com dados dos orçamentos
      const orcamentosProcessados: OrcamentoMeusOrcamentos[] = [];

      console.log('🔄 useMeusOrcamentosFix: Iniciando processamento de orçamentos...');

      inscricoes.forEach((inscricao, index) => {
        const orcamento = orcamentosData.find(o => o.id === inscricao.orcamento_id);
        
        console.log(`🔄 useMeusOrcamentosFix: Processando inscrição ${index + 1}/${inscricoes.length}:`);
        console.log(`  - Inscrição ID: ${inscricao.id}`);
        console.log(`  - Orçamento ID: ${inscricao.orcamento_id}`);
        console.log(`  - Orçamento encontrado: ${orcamento ? 'SIM' : 'NÃO'}`);
        
        if (orcamento) {
          const orcamentoProcessado = processarOrcamentoCompleto(inscricao, orcamento, contagemPorOrcamento);
          orcamentosProcessados.push(orcamentoProcessado);
          console.log(`✅ useMeusOrcamentosFix: Processado orçamento ${orcamento.id.slice(-8)} - Status: ${orcamento.status}`);
        } else {
          console.warn(`⚠️ useMeusOrcamentosFix: Orçamento ${inscricao.orcamento_id} não encontrado para inscrição ${inscricao.id}`);
        }
      });

      console.log('🎯 useMeusOrcamentosFix: Processamento concluído!');
      console.log('🎯 useMeusOrcamentosFix: Total de orçamentos processados:', orcamentosProcessados.length);
      
      setOrcamentos(orcamentosProcessados);
      setLoading(false);

    } catch (error: any) {
      console.error('💥 useMeusOrcamentosFix: Erro geral:', error);
      setError(error.message || 'Erro inesperado ao carregar orçamentos');
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🚀 useMeusOrcamentosFix: Hook iniciado/atualizado - userId:', userId);
    carregarOrcamentos();
  }, [userId]);

  return {
    orcamentos,
    loading,
    error,
    recarregar: carregarOrcamentos
  };
};
