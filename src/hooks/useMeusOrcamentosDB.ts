
import { supabase } from '@/integrations/supabase/client';
import { StatusAcompanhamento } from '@/hooks/useStatusAcompanhamento';

export const buscarInscricoesFornecedor = async (userId: string) => {
  const { data: inscricoes, error: errorInscricoes } = await supabase
    .from('inscricoes_fornecedores')
    .select('*')
    .eq('fornecedor_id', userId)
    .order('data_inscricao', { ascending: false });

  if (errorInscricoes) {
    throw new Error('Erro ao carregar inscrições');
  }

  return inscricoes || [];
};

export const buscarOrcamentosPorIds = async (orcamentoIds: string[]) => {
  console.log('🔍 [useMeusOrcamentosDB] Buscando orçamentos com arquivos para IDs:', orcamentoIds);
  
  const { data: orcamentosData, error: errorOrcamentos } = await supabase
    .from('orcamentos')
    .select(`
      *,
      arquivos_orcamento (
        id,
        nome_arquivo,
        tipo_arquivo,
        tamanho,
        url_arquivo
      ),
      horarios_visita_orcamento (id)
    `)
    .in('id', orcamentoIds);

  if (errorOrcamentos) {
    console.error('❌ [useMeusOrcamentosDB] Erro ao carregar dados dos orçamentos:', errorOrcamentos);
    throw new Error('Erro ao carregar dados dos orçamentos');
  }

  console.log(`✅ [useMeusOrcamentosDB] Encontrados ${orcamentosData?.length || 0} orçamentos`);
  
  // Log detalhado dos arquivos
  orcamentosData?.forEach((orc, index) => {
    const arquivos = Array.isArray(orc.arquivos_orcamento) ? orc.arquivos_orcamento : [];
    console.log(`📂 [useMeusOrcamentosDB] Orçamento ${index + 1} (${orc.id}): ${arquivos.length} arquivo(s)`, arquivos);
  });

  return orcamentosData || [];
};

export const buscarContagemEmpresasPorOrcamento = async (orcamentoIds: string[]) => {
  const { data: contagemEmpresas, error: errorContagem } = await supabase
    .from('candidaturas_fornecedores')
    .select('orcamento_id')
    .in('orcamento_id', orcamentoIds)
    .is('data_desistencia', null);

  if (errorContagem) {
    console.error('Erro ao contar empresas:', errorContagem);
    return [];
  }

  return contagemEmpresas || [];
};
