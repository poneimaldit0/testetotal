import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  FornecedorReputacao, 
  PortfolioFornecedor, 
  AvaliacaoFornecedor, 
  DepoimentoFornecedor, 
  SeloFornecedor,
  MediaAvaliacoes 
} from '@/types/fornecedor-reputacao';

export const useFornecedorReputacao = () => {
  const [loading, setLoading] = useState(false);
  const [reputacao, setReputacao] = useState<FornecedorReputacao | null>(null);
  const { toast } = useToast();

  const criarReputacaoVazia = (profileData: any): FornecedorReputacao => ({
    id: profileData?.id || '',
    nome: profileData?.nome || 'Nome não informado',
    empresa: profileData?.empresa || 'Empresa não informada',
    descricao_fornecedor: profileData?.descricao_fornecedor,
    telefone: profileData?.telefone,
    email: profileData?.email,
    whatsapp: profileData?.whatsapp,
    site_url: profileData?.site_url,
    endereco: profileData?.endereco,
    logo_url: profileData?.logo_url,
    portfolios: [],
    avaliacoes: [],
    depoimentos: [],
    selos: [],
    media_avaliacoes: {
      nota_geral: 0,
      prazo: 0,
      qualidade: 0,
      gestao_mao_obra: 0,
      gestao_materiais: 0,
      custo_planejado: 0,
      total_avaliacoes: 0
    }
  });

  const buscarReputacaoFornecedor = useCallback(async (fornecedorId: string): Promise<FornecedorReputacao | null> => {
    if (!fornecedorId) return null;
    
    try {
      setLoading(true);
      console.log('🔍 [useFornecedorReputacao] Buscando reputação para fornecedor:', fornecedorId);

      // Buscar dados básicos do fornecedor
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, nome, empresa, descricao_fornecedor, telefone, email, whatsapp, site_url, endereco, logo_url')
        .eq('id', fornecedorId)
        .eq('tipo_usuario', 'fornecedor')
        .single();

      if (profileError) {
        console.error('❌ [useFornecedorReputacao] Erro ao buscar profile:', profileError);
        throw profileError;
      }

      console.log('✅ [useFornecedorReputacao] Profile encontrado:', profile);

      // Buscar portfólios
      const { data: portfolios, error: portfoliosError } = await supabase
        .from('portfolios_fornecedores')
        .select('*')
        .eq('fornecedor_id', fornecedorId)
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (portfoliosError) {
        console.error('❌ [useFornecedorReputacao] Erro ao buscar portfolios:', portfoliosError);
        throw portfoliosError;
      }

      console.log('✅ [useFornecedorReputacao] Portfolios encontrados:', portfolios?.length || 0);

      // Buscar avaliações
      const { data: avaliacoes, error: avaliacoesError } = await supabase
        .from('avaliacoes_fornecedores')
        .select('*')
        .eq('fornecedor_id', fornecedorId)
        .order('data_avaliacao', { ascending: false });

      if (avaliacoesError) {
        console.error('❌ [useFornecedorReputacao] Erro ao buscar avaliações:', avaliacoesError);
        throw avaliacoesError;
      }

      console.log('✅ [useFornecedorReputacao] Avaliações encontradas:', avaliacoes?.length || 0);

      // Buscar depoimentos
      const { data: depoimentos, error: depoimentosError } = await supabase
        .from('depoimentos_fornecedores')
        .select('*')
        .eq('fornecedor_id', fornecedorId)
        .eq('ativo', true)
        .order('data_depoimento', { ascending: false });

      if (depoimentosError) {
        console.error('❌ [useFornecedorReputacao] Erro ao buscar depoimentos:', depoimentosError);
        throw depoimentosError;
      }

      console.log('✅ [useFornecedorReputacao] Depoimentos encontrados:', depoimentos?.length || 0);

      // Buscar selos ativos
      const { data: selos, error: selosError } = await supabase
        .from('selos_fornecedores')
        .select('*')
        .eq('fornecedor_id', fornecedorId)
        .eq('ativo', true)
        .or('data_expiracao.is.null,data_expiracao.gte.' + new Date().toISOString().split('T')[0])
        .order('data_concessao', { ascending: false });

      if (selosError) {
        console.error('❌ [useFornecedorReputacao] Erro ao buscar selos:', selosError);
        throw selosError;
      }

      console.log('✅ [useFornecedorReputacao] Selos encontrados:', selos?.length || 0);

      // Calcular média das avaliações
      const { data: mediaData, error: mediaError } = await supabase
        .rpc('calcular_media_avaliacoes', { p_fornecedor_id: fornecedorId });

      if (mediaError) {
        console.error('Erro ao calcular média de avaliações:', mediaError);
        // Não interromper o fluxo, apenas log do erro
      }

      // Garantir que sempre temos uma estrutura válida de média com valores numéricos
      const safeNumber = (value: any): number => {
        const num = Number(value);
        return isNaN(num) || !isFinite(num) ? 0 : num;
      };

      const mediaAvaliacoes = {
        nota_geral: safeNumber((mediaData as any)?.nota_geral),
        prazo: safeNumber((mediaData as any)?.prazo),
        qualidade: safeNumber((mediaData as any)?.qualidade),
        gestao_mao_obra: safeNumber((mediaData as any)?.gestao_mao_obra),
        gestao_materiais: safeNumber((mediaData as any)?.gestao_materiais),
        custo_planejado: safeNumber((mediaData as any)?.custo_planejado),
        total_avaliacoes: safeNumber((mediaData as any)?.total_avaliacoes)
      };

      const reputacaoCompleta = {
        id: profile.id,
        nome: profile.nome || '',
        empresa: profile.empresa || '',
        descricao_fornecedor: profile.descricao_fornecedor,
        telefone: profile.telefone,
        email: profile.email,
        whatsapp: profile.whatsapp,
        site_url: profile.site_url,
        endereco: profile.endereco,
        logo_url: profile.logo_url,
        portfolios: (portfolios || []) as PortfolioFornecedor[],
        avaliacoes: (avaliacoes || []) as AvaliacaoFornecedor[],
        depoimentos: (depoimentos || []) as DepoimentoFornecedor[],
        selos: (selos || []) as SeloFornecedor[],
        media_avaliacoes: mediaAvaliacoes as MediaAvaliacoes
      };

      console.log('🎯 [useFornecedorReputacao] Reputação completa criada:', {
        fornecedor: profile.nome,
        portfolios: portfolios?.length || 0,
        avaliacoes: avaliacoes?.length || 0,
        depoimentos: depoimentos?.length || 0,
        selos: selos?.length || 0,
        mediaGeral: mediaAvaliacoes.nota_geral
      });

      setReputacao(reputacaoCompleta);
      return reputacaoCompleta;

    } catch (error) {
      console.error('❌ [useFornecedorReputacao] Erro ao buscar reputação do fornecedor:', error);
      // Retornar estrutura vazia em caso de erro para não quebrar o fluxo
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, nome, empresa, descricao_fornecedor, telefone, email, whatsapp, site_url, endereco, logo_url')
          .eq('id', fornecedorId)
          .single();
        
        console.log('🔄 [useFornecedorReputacao] Retornando estrutura vazia para:', profile?.nome || fornecedorId);
        return criarReputacaoVazia(profile);
      } catch {
        console.log('🔄 [useFornecedorReputacao] Retornando null para fornecedor não encontrado:', fornecedorId);
        return null;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const criarPortfolio = async (portfolio: Omit<PortfolioFornecedor, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('portfolios_fornecedores')
        .insert({
          ...portfolio,
          data_projeto: portfolio.data_projeto || null
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Item do portfólio criado com sucesso"
      });

      return data;
    } catch (error) {
      console.error('Erro ao criar portfólio:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar item do portfólio",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const atualizarPortfolio = async (id: string, portfolio: Partial<PortfolioFornecedor>) => {
    try {
      setLoading(true);
      const updateData = { ...portfolio };
      if (updateData.data_projeto !== undefined) {
        updateData.data_projeto = updateData.data_projeto || null;
      }
      const { data, error } = await supabase
        .from('portfolios_fornecedores')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Item do portfólio atualizado com sucesso"
      });

      return data;
    } catch (error) {
      console.error('Erro ao atualizar portfólio:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar item do portfólio",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const excluirPortfolio = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('portfolios_fornecedores')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Item do portfólio excluído com sucesso"
      });
    } catch (error) {
      console.error('Erro ao excluir portfólio:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir item do portfólio",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const criarDepoimento = async (depoimento: Omit<DepoimentoFornecedor, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('depoimentos_fornecedores')
        .insert({
          ...depoimento,
          data_depoimento: depoimento.data_depoimento || null
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Depoimento criado com sucesso"
      });

      return data;
    } catch (error) {
      console.error('Erro ao criar depoimento:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar depoimento",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const atualizarDepoimento = async (id: string, depoimento: Partial<DepoimentoFornecedor>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('depoimentos_fornecedores')
        .update({
          ...depoimento,
          data_depoimento: depoimento.data_depoimento || null
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Depoimento atualizado com sucesso"
      });

      return data;
    } catch (error) {
      console.error('Erro ao atualizar depoimento:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar depoimento",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const excluirDepoimento = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('depoimentos_fornecedores')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Depoimento excluído com sucesso"
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao excluir depoimento:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir depoimento",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const criarSelo = async (selo: Omit<SeloFornecedor, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('selos_fornecedores')
        .insert({
          ...selo,
          data_expiracao: selo.data_expiracao || null
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Selo concedido com sucesso"
      });

      return data;
    } catch (error) {
      console.error('Erro ao conceder selo:', error);
      toast({
        title: "Erro",
        description: "Erro ao conceder selo",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const criarAvaliacao = async (avaliacao: Omit<AvaliacaoFornecedor, 'id' | 'created_at'>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('avaliacoes_fornecedores')
        .insert({
          ...avaliacao,
          data_avaliacao: avaliacao.data_avaliacao || new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Avaliação criada com sucesso"
      });

      return data;
    } catch (error) {
      console.error('Erro ao criar avaliação:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar avaliação",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const atualizarDescricaoFornecedor = async (fornecedorId: string, descricao: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .update({ descricao_fornecedor: descricao })
        .eq('id', fornecedorId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Descrição do fornecedor atualizada com sucesso"
      });

      return data;
    } catch (error) {
      console.error('Erro ao atualizar descrição:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar descrição do fornecedor",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const atualizarPerfilCompleto = async (fornecedorId: string, dadosPerfil: any) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .update({
          nome: dadosPerfil.nome,
          empresa: dadosPerfil.empresa,
          telefone: dadosPerfil.telefone,
          whatsapp: dadosPerfil.whatsapp,
          site_url: dadosPerfil.site_url,
          endereco: dadosPerfil.endereco,
          logo_url: dadosPerfil.logo_url,
          descricao_fornecedor: dadosPerfil.descricao_fornecedor
        })
        .eq('id', fornecedorId)
        .select()
        .single();

      if (error) throw error;

      // Atualizar estado local
      if (reputacao) {
        setReputacao({
          ...reputacao,
          nome: dadosPerfil.nome || reputacao.nome,
          empresa: dadosPerfil.empresa || reputacao.empresa,
          descricao_fornecedor: dadosPerfil.descricao_fornecedor,
          telefone: dadosPerfil.telefone,
          email: dadosPerfil.email,
          whatsapp: dadosPerfil.whatsapp,
          site_url: dadosPerfil.site_url,
          endereco: dadosPerfil.endereco,
          logo_url: dadosPerfil.logo_url
        });
      }

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso"
      });

      return data;
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil do fornecedor",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    reputacao,
    setReputacao,
    buscarReputacaoFornecedor,
    criarPortfolio,
    atualizarPortfolio,
    excluirPortfolio,
    criarDepoimento,
    atualizarDepoimento,
    excluirDepoimento,
    criarSelo,
    criarAvaliacao,
    atualizarDescricaoFornecedor,
    atualizarPerfilCompleto
  };
};