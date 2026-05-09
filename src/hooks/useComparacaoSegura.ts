import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ComparacaoData, PropostaComparacao, CategoriaProposta, ItemProposta } from '@/types/comparacao';
import { useToast } from '@/hooks/use-toast';
import { SecureLogger } from '@/utils/secureLogger';

export const useComparacaoSegura = (token: string | null) => {
  const [data, setData] = useState<ComparacaoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const retryWithDelay = async (fn: () => Promise<any>, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        SecureLogger.warn(`Tentativa ${i + 1} falhou`, error, { component: 'useComparacaoSegura' });
        
        if (i === retries - 1) throw error;
        if (error.message?.includes('connection') || error.code === 'PGRST204') {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        } else {
          throw error;
        }
      }
    }
  };

  const buscarOrcamento = async (orcamentoId: string) => {
    return retryWithDelay(async () => {
      const { data, error } = await supabase
        .from('orcamentos')
        .select('id, necessidade, local, categorias, tamanho_imovel, data_publicacao, prazo_inicio_texto')
        .eq('id', orcamentoId)
        .single();
      
      if (error) throw new Error('Erro ao buscar orçamento: ' + error.message);
      return data;
    });
  };

  const buscarCandidaturas = async (orcamentoId: string) => {
    return retryWithDelay(async () => {
      const { data, error } = await supabase
        .from('candidaturas_fornecedores')
        .select('id, fornecedor_id, nome, email, telefone, empresa, data_candidatura, status_acompanhamento')
        .eq('orcamento_id', orcamentoId);
      
      if (error) throw new Error('Erro ao buscar candidaturas: ' + error.message);
      return data || [];
    });
  };

  const buscarChecklistProposta = async (candidaturaId: string) => {
    return retryWithDelay(async () => {
      const { data, error } = await supabase
        .from('checklist_propostas')
        .select(`
          id, valor_total_estimado, status, observacoes, forma_pagamento,
          revisoes_propostas_clientes!checklist_proposta_id(
            id, status, data_solicitacao, data_resposta
          )
        `)
        .eq('candidatura_id', candidaturaId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw new Error('Erro ao buscar checklist: ' + error.message);
      }
      return data;
    });
  };

  const buscarRespostasChecklist = async (checklistPropostaId: string) => {
    return retryWithDelay(async () => {
      const { data, error } = await supabase
        .from('respostas_checklist')
        .select(`
          id, incluido, valor_estimado, ambientes, observacoes, 
          item_extra, nome_item_extra, descricao_item_extra,
          item_id,
          checklist_itens!item_id(id, categoria, nome, descricao, ordem)
        `)
        .eq('checklist_proposta_id', checklistPropostaId);
      
      if (error) throw new Error('Erro ao buscar respostas: ' + error.message);
      
      SecureLogger.debug(`Respostas encontradas para checklist ${checklistPropostaId}`, {
        total: data?.length || 0,
        incluidos: data?.filter(r => r.incluido).length || 0,
        detalhes: data?.map(r => ({
          id: r.id,
          incluido: r.incluido,
          item_extra: r.item_extra,
          nome: r.item_extra ? r.nome_item_extra : r.checklist_itens?.nome
        }))
      });
      
      return data || [];
    });
  };

  const validarTokenEBuscarPropostas = async (tokenAcesso: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🔍 [ComparacaoSegura] INÍCIO - Token: ${tokenAcesso.substring(0, 8)}...`);

      // 1. Validar token
      const { data: validationResult, error: validationError } = await retryWithDelay(async () => {
        return await supabase.rpc('validar_token_comparacao', { p_token: tokenAcesso });
      });

      console.log(`🔍 [ComparacaoSegura] Token validation:`, {
        success: (validationResult as any)?.success,
        error: validationError,
        result: validationResult
      });

      if (validationError || !(validationResult as any)?.success) {
        console.log(`❌ [ComparacaoSegura] Token validation FAILED:`, {
          error: validationError,
          result_message: (validationResult as any)?.message
        });
        throw new Error((validationResult as any)?.message || 'Token inválido');
      }

      const result = validationResult as any;
      const orcamentoId = result.orcamento_id;
      const tokenInfo = result.token_info;

      console.log(`🔍 [ComparacaoSegura] Orçamento ID obtido: ${orcamentoId}`);

      // 2. Buscar orçamento
      const orcamento = await buscarOrcamento(orcamentoId);
      console.log(`🔍 [ComparacaoSegura] Orçamento carregado:`, {
        id: orcamento.id,
        necessidade: orcamento.necessidade,
        status: orcamento.status
      });

      // 3. Buscar candidaturas
      const candidaturas = await buscarCandidaturas(orcamentoId);
      console.log(`🔍 [ComparacaoSegura] Candidaturas encontradas:`, {
        total: candidaturas.length,
        candidaturas: candidaturas.map(c => ({
          id: c.id,
          nome: c.nome,
          email: c.email,
          status_acompanhamento: c.status_acompanhamento
        }))
      });

      // 4. Processar cada candidatura
      const propostas: PropostaComparacao[] = [];
      
      console.log(`🔍 [ComparacaoSegura] Processando ${candidaturas.length} candidaturas para orçamento ${orcamentoId}`);
      
      for (const candidatura of candidaturas) {
        try {
          console.log(`🔍 [ComparacaoSegura] Processando candidatura:`, {
            id: candidatura.id,
            nome: candidatura.nome,
            email: candidatura.email
          });

          // Buscar checklist da candidatura
          const checklist = await buscarChecklistProposta(candidatura.id);
          
          console.log(`🔍 [ComparacaoSegura] Checklist encontrado:`, {
            candidatura: candidatura.nome,
            tem_checklist: !!checklist,
            checklist_id: checklist?.id,
            status: checklist?.status,
            valor: checklist?.valor_total_estimado,
            status_valido: checklist ? ['finalizada', 'em_revisao', 'enviado', 'pendente_revisao'].includes(checklist.status) : false,
            foi_revisada: checklist?.revisoes_propostas_clientes?.some(r => r.status === 'concluida') || false
          });
          
          if (!checklist || !['finalizada', 'em_revisao', 'enviado', 'pendente_revisao'].includes(checklist.status)) {
            console.log(`❌ [ComparacaoSegura] Candidatura ${candidatura.nome} IGNORADA:`, {
              motivo: !checklist ? 'sem_checklist' : `status_invalido: ${checklist.status}`,
              status_esperado: ['finalizada', 'em_revisao', 'enviado', 'pendente_revisao']
            });
            continue;
          }

          console.log(`✅ [ComparacaoSegura] Candidatura ${candidatura.nome} ACEITA - buscando respostas...`);

          // Buscar respostas do checklist
          const respostas = await buscarRespostasChecklist(checklist.id);
          
          console.log(`🔍 [ComparacaoSegura] Respostas do checklist:`, {
            candidatura: candidatura.nome,
            checklist_id: checklist.id,
            total_respostas: respostas.length,
            respostas_incluidas: respostas.filter(r => r.incluido).length,
            primeira_resposta: respostas[0] ? {
              id: respostas[0].id,
              incluido: respostas[0].incluido,
              item_extra: respostas[0].item_extra,
              nome_checklist: respostas[0].checklist_itens?.nome,
              nome_extra: respostas[0].nome_item_extra
            } : null
          });

          SecureLogger.debug(`Processando candidatura ${candidatura.nome}`, {
            valor: checklist.valor_total_estimado,
            respostas: respostas.length,
            fornecedor_email: candidatura.email,
            status: checklist.status,
            respostas_incluidas: respostas.filter(r => r.incluido).length
          });
          
          // Debug específico para o orçamento em questão
          if (orcamentoId === '06a5513a-5923-4ae7-a389-5e2f99f5c1ef') {
            console.log(`🔍 [ComparacaoSegura] DEBUG ORÇAMENTO ESPECÍFICO:`, {
              orcamento_id: orcamentoId,
              candidatura: {
                id: candidatura.id,
                nome: candidatura.nome,
                email: candidatura.email
              },
              checklist: {
                id: checklist?.id,
                status: checklist?.status,
                valor_total: checklist?.valor_total_estimado
              },
              respostas: {
                total: respostas.length,
                incluidas: respostas.filter(r => r.incluido).length,
                com_checklist_itens: respostas.filter(r => r.checklist_itens).length,
                sem_checklist_itens: respostas.filter(r => !r.checklist_itens).length
              }
            });
          }

          // Organizar itens por categoria
          const categorias: Record<string, CategoriaProposta> = {};
          
          SecureLogger.debug(`Processando ${respostas.length} respostas para ${candidatura.nome}`, {
            respostasIncluidas: respostas.filter(r => r.incluido).length,
            respostasDetalhes: respostas.map(r => ({
              id: r.id,
              incluido: r.incluido,
              item_extra: r.item_extra,
              tem_checklist_itens: !!r.checklist_itens,
              nome_item: r.item_extra ? r.nome_item_extra : r.checklist_itens?.nome
            }))
          });
          
          respostas.forEach((resposta: any) => {
            if (resposta.incluido) {
              let categoria = 'Itens Extras';
              let item: ItemProposta;
              
              SecureLogger.debug(`[PROCESSANDO ITEM] ${resposta.checklist_itens?.nome || resposta.nome_item_extra}`, {
                id: resposta.id,
                item_extra: resposta.item_extra,
                tem_checklist_itens: !!resposta.checklist_itens,
                nome_checklist: resposta.checklist_itens?.nome,
                nome_extra: resposta.nome_item_extra
              });
              
              // LÓGICA CORRIGIDA: Priorizar item_extra === true COM nome válido
              if (resposta.item_extra === true && resposta.nome_item_extra?.trim()) {
                SecureLogger.debug(`[ITEM EXTRA VÁLIDO] Processando como item extra`, {
                  nome: resposta.nome_item_extra,
                  id: resposta.id
                });
                
                categoria = 'Itens Extras';
                item = {
                  id: resposta.id,
                  nome: resposta.nome_item_extra.trim(),
                  descricao: resposta.descricao_item_extra,
                  incluido: resposta.incluido,
                  valor_estimado: resposta.valor_estimado || 0,
                  ambientes: resposta.ambientes || [],
                  observacoes: resposta.observacoes || '',
                  ordem: 999, // Itens extras aparecem por último
                  item_extra: true
                };
              } else if (resposta.checklist_itens?.nome?.trim()) {
                SecureLogger.debug(`[ITEM DO CHECKLIST] Processando item normal`, {
                  nome: resposta.checklist_itens.nome,
                  categoria: resposta.checklist_itens.categoria,
                  id: resposta.id
                });
                
                // Item do checklist padrão
                categoria = resposta.checklist_itens.categoria;
                item = {
                  id: resposta.id,
                  nome: resposta.checklist_itens.nome,
                  descricao: resposta.checklist_itens.descricao,
                  incluido: resposta.incluido,
                  valor_estimado: resposta.valor_estimado || 0,
                  ambientes: resposta.ambientes || [],
                  observacoes: resposta.observacoes || '',
                  ordem: resposta.checklist_itens.ordem || 0,
                  item_extra: false
                };
              } else {
                // Pular itens inválidos (sem nome válido)
                SecureLogger.warn(`[ITEM INVÁLIDO] Item sem nome válido ignorado`, {
                  id: resposta.id,
                  item_extra: resposta.item_extra,
                  nome_extra: resposta.nome_item_extra,
                  nome_checklist: resposta.checklist_itens?.nome
                });
                return;
              }
              
              if (!categorias[categoria]) {
                categorias[categoria] = {
                  itens: [],
                  subtotal: 0
                };
              }
              
              SecureLogger.debug(`[ADICIONANDO ITEM À CATEGORIA] ${categoria}`, {
                nome: item.nome,
                item_extra: item.item_extra,
                categoria: categoria
              });
              
              categorias[categoria].itens.push(item);
              categorias[categoria].subtotal += item.valor_estimado;
            }
          });

          SecureLogger.debug(`Categorias processadas para ${candidatura.nome}`, {
            total_categorias: Object.keys(categorias).length,
            categorias: Object.keys(categorias),
            total_itens: Object.values(categorias).reduce((acc, cat) => acc + cat.itens.length, 0)
          });

          // Ordenar itens por ordem dentro de cada categoria
          Object.keys(categorias).forEach(categoria => {
            categorias[categoria].itens.sort((a: any, b: any) => a.ordem - b.ordem);
          });

          propostas.push({
            id: checklist.id, // ID do checklist_propostas para revisões
            candidatura_id: candidatura.id,
            orcamento_id: orcamentoId,
            fornecedor: {
              id: candidatura.fornecedor_id,
              nome: candidatura.nome,
              empresa: candidatura.empresa,
              email: candidatura.email,
              telefone: candidatura.telefone
            },
            proposta: {
              valor_total_estimado: checklist.valor_total_estimado || 0,
              status: checklist.status,
              observacoes: checklist.observacoes,
              forma_pagamento: checklist.forma_pagamento,
              categorias,
              foi_revisada: checklist.revisoes_propostas_clientes?.some(r => r.status === 'concluida') || false
            },
            status_acompanhamento: candidatura.status_acompanhamento,
            data_candidatura: candidatura.data_candidatura
          });
          
        } catch (candidaturaError: any) {
          SecureLogger.warn(`Erro ao processar candidatura ${candidatura.nome}`, candidaturaError);
        }
      }

      console.log(`🔍 [ComparacaoSegura] RESULTADO FINAL:`, { 
        total_propostas: propostas.length,
        orcamento_id: orcamentoId,
        propostas_detalhes: propostas.map(p => ({
          id: p.id,
          fornecedor: p.fornecedor.nome,
          email: p.fornecedor.email,
          valor: p.proposta.valor_total_estimado,
          status: p.proposta.status,
          total_categorias: Object.keys(p.proposta.categorias || {}).length,
          total_itens: Object.values(p.proposta.categorias || {}).reduce((acc, cat) => acc + cat.itens.length, 0)
        }))
      });

      setData({
        orcamento,
        propostas,
        token_info: tokenInfo
      });

    } catch (err: any) {
      SecureLogger.error('Erro na comparação segura', err);
      
      let errorMessage = 'Erro inesperado ao carregar dados';
      
      if (err.message?.includes('connection') || err.message?.includes('redefinida')) {
        errorMessage = 'Problemas de conectividade. Tentando novamente...';
        // Tentar novamente após 2 segundos
        setTimeout(() => {
          if (token) validarTokenEBuscarPropostas(token);
        }, 2000);
      } else if (err.message?.includes('Token')) {
        errorMessage = err.message;
      } else if (err.message?.includes('orçamento')) {
        errorMessage = 'Orçamento não encontrado ou inacessível';
      }
      
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      validarTokenEBuscarPropostas(token);
    }
  }, [token]);

  return {
    data,
    loading,
    error,
    refetch: () => token && validarTokenEBuscarPropostas(token)
  };
};