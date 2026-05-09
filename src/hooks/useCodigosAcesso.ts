import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CodigoAcesso, PropostaComCodigo, CandidaturaComCodigo } from '@/types/acessoPropostas';

export const useCodigosAcesso = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Gerar código único de fornecedor (FORN + 4 chars aleatórios)
  const gerarCodigoFornecedor = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'FORN';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Extrair código do orçamento (primeiros 8 chars do UUID)
  const extrairCodigoOrcamento = (orcamentoId: string): string => {
    return orcamentoId.replace(/-/g, '').slice(0, 8).toUpperCase();
  };

  // Gerar código de acesso para uma candidatura
  const gerarCodigoAcesso = async (orcamentoId: string, candidaturaId: string): Promise<CodigoAcesso | null> => {
    setLoading(true);
    try {
      console.log('🔍 [useCodigosAcesso] Verificando código existente...', { orcamentoId, candidaturaId });
      
      // Verificar se já existe código para esta candidatura
      const { data: existingCode, error: selectError } = await supabase
        .from('codigos_acesso_propostas')
        .select('*')
        .eq('candidatura_id', candidaturaId)
        .maybeSingle();

      if (selectError) {
        console.error('❌ [useCodigosAcesso] Erro ao verificar código existente:', selectError);
        throw selectError;
      }

      if (existingCode) {
        console.log('✅ [useCodigosAcesso] Código já existe, retornando...', existingCode);
        // Não mostrar toast de erro, apenas retornar o código existente
        return existingCode;
      }

      console.log('🔄 [useCodigosAcesso] Gerando novo código...');
      
      const codigoOrcamento = extrairCodigoOrcamento(orcamentoId);
      const codigoFornecedor = gerarCodigoFornecedor();

      console.log('📝 [useCodigosAcesso] Dados para inserção:', {
        orcamento_id: orcamentoId,
        candidatura_id: candidaturaId,
        codigo_orcamento: codigoOrcamento,
        codigo_fornecedor: codigoFornecedor
      });

      const { data, error } = await supabase
        .from('codigos_acesso_propostas')
        .insert({
          orcamento_id: orcamentoId,
          candidatura_id: candidaturaId,
          codigo_orcamento: codigoOrcamento,
          codigo_fornecedor: codigoFornecedor,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [useCodigosAcesso] Erro ao inserir código:', error);
        throw error;
      }

      console.log('✅ [useCodigosAcesso] Código gerado com sucesso:', data);

      toast({
        title: "Código gerado com sucesso",
        description: `Código do fornecedor: ${codigoFornecedor}`,
      });

      return data;
    } catch (error: any) {
      console.error('❌ [useCodigosAcesso] Erro ao gerar código:', error);
      
      // Melhor mensagem de erro baseada no tipo de erro
      let errorMessage = "Não foi possível gerar o código de acesso.";
      if (error?.message?.includes('row-level security')) {
        errorMessage = "Você não tem permissão para gerar códigos para esta candidatura.";
      } else if (error?.code === '23505') {
        errorMessage = "Código já existe para esta candidatura.";
      } else if (error?.message) {
        errorMessage = `Erro: ${error.message}`;
      }
      
      toast({
        title: "Erro ao gerar código",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Buscar proposta pelos códigos (função pública)
  const buscarPropostaPorCodigos = async (
    codigoOrcamento: string, 
    codigoFornecedor: string
  ): Promise<PropostaComCodigo | null> => {
    setLoading(true);
    try {
      console.log('🔍 [useCodigosAcesso] Buscando proposta com códigos:', { 
        codigoOrcamento: codigoOrcamento.toUpperCase(), 
        codigoFornecedor: codigoFornecedor.toUpperCase() 
      });

      const { data, error } = await supabase.rpc('buscar_proposta_por_codigos', {
        p_codigo_orcamento: codigoOrcamento.toUpperCase(),
        p_codigo_fornecedor: codigoFornecedor.toUpperCase(),
      });

      if (error) {
        console.error('❌ [useCodigosAcesso] Erro na função RPC:', error);
        throw error;
      }

      console.log('📊 [useCodigosAcesso] Resposta da função RPC:', data);

      // A função RPC agora retorna diretamente o JSON com os dados ou null
      if (!data) {
        console.log('❌ [useCodigosAcesso] Nenhum resultado encontrado');
        toast({
          title: "Códigos inválidos",
          description: "Códigos não encontrados ou expirados. Verifique os códigos e tente novamente.",
          variant: "destructive",
        });
        return null;
      }

      console.log('✅ [useCodigosAcesso] Proposta encontrada com sucesso');
      return data as unknown as PropostaComCodigo;
    } catch (error: any) {
      console.error('❌ [useCodigosAcesso] Erro ao buscar proposta:', error);
      
      let errorMessage = "Não foi possível validar os códigos.";
      if (error?.message?.includes('expired')) {
        errorMessage = "Os códigos de acesso expiraram. Solicite novos códigos.";
      } else if (error?.message?.includes('not found')) {
        errorMessage = "Códigos não encontrados. Verifique se estão corretos.";
      } else if (error?.message) {
        errorMessage = `Erro: ${error.message}`;
      }
      
      toast({
        title: "Erro ao buscar proposta",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Listar códigos de um orçamento
  const listarCodigosOrcamento = async (orcamentoId: string): Promise<CandidaturaComCodigo[]> => {
    setLoading(true);
    try {
      // Buscar candidaturas com códigos (se existirem)
      const { data: candidaturas, error: candidaturasError } = await supabase
        .from('candidaturas_fornecedores')
        .select(`
          id,
          nome,
          email,
          empresa,
          telefone,
          data_candidatura,
          status_acompanhamento,
          codigos_acesso_propostas (
            id,
            codigo_orcamento,
            codigo_fornecedor,
            created_at,
            expires_at,
            visualizacoes,
            ultimo_acesso
          )
        `)
        .eq('orcamento_id', orcamentoId)
        .order('data_candidatura', { ascending: false });

      if (candidaturasError) throw candidaturasError;

      return candidaturas?.map(candidatura => ({
        candidatura_id: candidatura.id,
        nome: candidatura.nome,
        email: candidatura.email,
        empresa: candidatura.empresa,
        telefone: candidatura.telefone,
        data_candidatura: candidatura.data_candidatura,
        status_acompanhamento: candidatura.status_acompanhamento,
        codigo_acesso: candidatura.codigos_acesso_propostas?.[0] || undefined,
      })) || [];
    } catch (error) {
      console.error('Erro ao listar códigos:', error);
      toast({
        title: "Erro ao carregar códigos",
        description: "Não foi possível carregar os códigos do orçamento.",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Regenerar código de fornecedor
  const regenerarCodigoFornecedor = async (candidaturaId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const novoCodigoFornecedor = gerarCodigoFornecedor();

      const { error } = await supabase
        .from('codigos_acesso_propostas')
        .update({
          codigo_fornecedor: novoCodigoFornecedor,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Renovar expiração
        })
        .eq('candidatura_id', candidaturaId);

      if (error) throw error;

      toast({
        title: "Código regenerado",
        description: `Novo código: ${novoCodigoFornecedor}`,
      });

      return true;
    } catch (error) {
      console.error('Erro ao regenerar código:', error);
      toast({
        title: "Erro ao regenerar código",
        description: "Não foi possível regenerar o código.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    gerarCodigoAcesso,
    buscarPropostaPorCodigos,
    listarCodigosOrcamento,
    regenerarCodigoFornecedor,
    extrairCodigoOrcamento,
    gerarCodigoFornecedor,
  };
};