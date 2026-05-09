
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatusAcompanhamento } from '@/hooks/useStatusAcompanhamento';

export interface OrcamentoInscrito {
  id: string;
  dataPublicacao: Date;
  necessidade: string;
  categorias: string[];
  local: string;
  tamanhoImovel: number;
  dataInicio: Date;
  quantidadeEmpresas: number;
  status: 'aberto' | 'fechado';
  dadosContato?: {
    nome: string;
    telefone: string;
    email: string;
  };
  inscricaoId: string;
  statusAcompanhamento: StatusAcompanhamento | null;
  dataInscricao: Date;
  // Adicionar campos de arquivos
  arquivos?: Array<{
    id: string;
    nome_arquivo: string;
    tipo_arquivo: string;
    tamanho: number;
    url_arquivo: string;
  }>;
  fotos?: Array<{
    id: string;
    nome_arquivo: string;
    tipo_arquivo: string;
    tamanho: number;
    url_arquivo: string;
  }>;
}

export const useMeusOrcamentos = (userId?: string) => {
  const [orcamentosInscritos, setOrcamentosInscritos] = useState<OrcamentoInscrito[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarMeusOrcamentos = async () => {
    if (!userId) {
      console.log('🚫 useMeusOrcamentos: Nenhum userId fornecido');
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 useMeusOrcamentos: Carregando orçamentos para usuário:', userId);

      // ETAPA 1: Buscar todas as inscrições do usuário
      const { data: inscricoes, error: inscricoesError } = await supabase
        .from('inscricoes_fornecedores')
        .select('*')
        .eq('fornecedor_id', userId)
        .order('data_inscricao', { ascending: false });

      if (inscricoesError) {
        console.error('❌ useMeusOrcamentos: Erro ao buscar inscrições:', inscricoesError);
        setLoading(false);
        return;
      }

      console.log('📋 useMeusOrcamentos: Inscrições encontradas:', inscricoes);
      console.log('📊 useMeusOrcamentos: Quantidade de inscrições:', inscricoes?.length || 0);

      if (!inscricoes || inscricoes.length === 0) {
        console.log('ℹ️ useMeusOrcamentos: Nenhuma inscrição encontrada');
        setOrcamentosInscritos([]);
        setLoading(false);
        return;
      }

      // ETAPA 2: Extrair IDs únicos dos orçamentos
      const orcamentoIds = [...new Set(inscricoes.map(inscricao => inscricao.orcamento_id))];
      console.log('🎯 useMeusOrcamentos: IDs dos orçamentos a buscar:', orcamentoIds);

      // ETAPA 3: Buscar os orçamentos correspondentes com arquivos
      console.log('🔍 useMeusOrcamentos: Buscando orçamentos com arquivos para IDs:', orcamentoIds);
      const { data: orcamentos, error: orcamentosError } = await supabase
        .from('orcamentos')
        .select(`
          *,
          arquivos_orcamento (
            id,
            nome_arquivo,
            tipo_arquivo,
            tamanho,
            url_arquivo
          )
        `)
        .in('id', orcamentoIds);

      if (orcamentosError) {
        console.error('❌ useMeusOrcamentos: Erro ao buscar orçamentos:', orcamentosError);
        setLoading(false);
        return;
      }

      console.log('📋 useMeusOrcamentos: Orçamentos encontrados:', orcamentos);
      console.log('📊 useMeusOrcamentos: Quantidade de orçamentos:', orcamentos?.length || 0);

      if (!orcamentos || orcamentos.length === 0) {
        console.log('⚠️ useMeusOrcamentos: Nenhum orçamento encontrado para as inscrições');
        setOrcamentosInscritos([]);
        setLoading(false);
        return;
      }

      // ETAPA 4: Processar os dados combinando inscrições com orçamentos
      const orcamentosProcessados = await Promise.all(
        inscricoes.map(async (inscricao: any) => {
          console.log('🔄 useMeusOrcamentos: Processando inscrição:', inscricao.id, 'para orçamento:', inscricao.orcamento_id);
          
          const orcamento = orcamentos.find(orc => orc.id === inscricao.orcamento_id);
          
          if (!orcamento) {
            console.error('❌ useMeusOrcamentos: Orçamento não encontrado para inscrição:', {
              inscricaoId: inscricao.id,
              orcamentoId: inscricao.orcamento_id,
              orcamentosDisponiveis: orcamentos.map(o => o.id)
            });
            return null;
          }

          console.log('✅ useMeusOrcamentos: Orçamento encontrado:', {
            id: orcamento.id,
            status: orcamento.status,
            necessidade: orcamento.necessidade?.substring(0, 50) + '...'
          });

          // Contar quantas empresas se inscreveram neste orçamento
          const { data: totalInscricoes, error: errorCount } = await supabase
            .from('inscricoes_fornecedores')
            .select('id', { count: 'exact' })
            .eq('orcamento_id', inscricao.orcamento_id);

          if (errorCount) {
            console.error('❌ useMeusOrcamentos: Erro ao contar inscrições:', errorCount);
          }

          const quantidadeEmpresas = totalInscricoes?.length || 0;
          console.log('📊 useMeusOrcamentos: Quantidade de empresas no orçamento', orcamento.id, ':', quantidadeEmpresas);

          // Processar arquivos
          const arquivos = Array.isArray(orcamento.arquivos_orcamento) ? orcamento.arquivos_orcamento : [];
          console.log(`📂 useMeusOrcamentos: Orçamento ${orcamento.id}: ${arquivos.length} arquivos brutos`, arquivos);
          
          const documentos = arquivos.filter((arquivo: any) => 
            arquivo.tipo_arquivo !== 'image/jpeg' && 
            arquivo.tipo_arquivo !== 'image/png' && 
            arquivo.tipo_arquivo !== 'image/gif'
          );
          const fotos = arquivos.filter((arquivo: any) => 
            arquivo.tipo_arquivo === 'image/jpeg' || 
            arquivo.tipo_arquivo === 'image/png' || 
            arquivo.tipo_arquivo === 'image/gif'
          );
          
          console.log(`📄 useMeusOrcamentos: Orçamento ${orcamento.id}: ${documentos.length} documentos, ${fotos.length} fotos`);

          const orcamentoProcessado = {
            id: orcamento.id,
            dataPublicacao: new Date(orcamento.data_publicacao || orcamento.created_at),
            necessidade: orcamento.necessidade,
            categorias: orcamento.categorias || [],
            local: orcamento.local,
            tamanhoImovel: Number(orcamento.tamanho_imovel) || 0,
            dataInicio: orcamento.data_inicio ? new Date(orcamento.data_inicio) : new Date(),
            quantidadeEmpresas: quantidadeEmpresas,
            status: orcamento.status as 'aberto' | 'fechado',
            dadosContato: orcamento.dados_contato,
            inscricaoId: inscricao.id,
            statusAcompanhamento: inscricao.status_acompanhamento as StatusAcompanhamento | null,
            dataInscricao: new Date(inscricao.data_inscricao),
            arquivos: documentos,
            fotos: fotos
          } as OrcamentoInscrito;

          console.log('🎉 useMeusOrcamentos: Orçamento processado com sucesso:', {
            id: orcamentoProcessado.id,
            status: orcamentoProcessado.status,
            necessidade: orcamentoProcessado.necessidade?.substring(0, 50) + '...',
            quantidadeEmpresas: orcamentoProcessado.quantidadeEmpresas,
            inscricaoId: orcamentoProcessado.inscricaoId
          });

          return orcamentoProcessado;
        })
      );

      // ETAPA 5: Filtrar resultados nulos e ordenar por data de inscrição
      const orcamentosValidos = orcamentosProcessados
        .filter(orc => orc !== null)
        .sort((a, b) => b.dataInscricao.getTime() - a.dataInscricao.getTime());

      console.log('✅ useMeusOrcamentos: RESUMO FINAL:');
      console.log('📊 Total de inscrições processadas:', inscricoes.length);
      console.log('📊 Total de orçamentos encontrados:', orcamentos.length);
      console.log('📊 Total de orçamentos processados com sucesso:', orcamentosValidos.length);
      console.log('📋 Status dos orçamentos finais:', 
        orcamentosValidos.map(o => ({ 
          id: o.id, 
          status: o.status,
          inscricaoId: o.inscricaoId 
        }))
      );
      
      // Verificar se algum orçamento específico está faltando
      if (orcamentosValidos.length < inscricoes.length) {
        console.warn('⚠️ useMeusOrcamentos: ATENÇÃO - Alguns orçamentos não foram processados!');
        console.warn('📊 Inscrições originais:', inscricoes.length);
        console.warn('📊 Orçamentos processados:', orcamentosValidos.length);
        
        const idsProcessados = orcamentosValidos.map(o => o.inscricaoId);
        const inscricoesPerdidas = inscricoes.filter(i => !idsProcessados.includes(i.id));
        console.warn('❌ Inscrições perdidas:', inscricoesPerdidas);
      }
      
      setOrcamentosInscritos(orcamentosValidos);
      setLoading(false);
    } catch (error) {
      console.error('💥 useMeusOrcamentos: Erro geral ao carregar orçamentos:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarMeusOrcamentos();
  }, [userId]);

  return {
    orcamentosInscritos,
    loading,
    recarregar: carregarMeusOrcamentos
  };
};
