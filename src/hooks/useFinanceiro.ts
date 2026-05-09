import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFinanceiroSync } from './useFinanceiroSync';
import { formatarDataLocal, adicionarDias, adicionarMeses, adicionarAnos, criarDataLocal } from '@/utils/dateUtils';
import type {
  CategoriaFinanceira,
  ContaReceber,
  ContaPagar,
  TransacaoFinanceira,
  DashboardFinanceiro,
  CreateContaReceberInput,
  CreateContaPagarInput,
  FornecedorOption,
  ContaBancaria,
  MovimentacaoBancaria,
  CreateContaBancariaInput,
  CreateMovimentacaoBancariaInput,
  DashboardBancario,
  AtualizarSaldoInput,
  ContaVencimento,
  ContaRecorrenteInfo,
  ExclusaoRecorrenteOptions,
  ValidacaoEdicaoContaPaga,
  MotivoPerda
} from '@/types/financeiro';

export const useFinanceiro = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { triggerGlobalUpdate } = useFinanceiroSync();
  
  // Cache para evitar consultas repetitivas
  const cacheRef = useRef(new Map<string, { data: ContaRecorrenteInfo; timestamp: number }>());
  const CACHE_TTL = 30000; // 30 segundos

  // Função utilitária para sanitizar campos UUID
  const sanitizeUuidField = (value: string | undefined | null): string | null => {
    if (!value || value.trim() === '') {
      return null;
    }
    return value;
  };

  // Categorias - memoizada para evitar re-criação
  const buscarCategorias = useCallback(async (): Promise<CategoriaFinanceira[]> => {
    const { data, error } = await supabase
      .from('categorias_financeiras')
      .select('*')
      .eq('ativa', true)
      .order('nome');

    if (error) {
      toast({
        title: "Erro ao carregar categorias",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }

    return (data || []) as CategoriaFinanceira[];
  }, [toast]);

  // Contas a Receber
  const buscarContasReceber = async (): Promise<ContaReceber[]> => {
    const { data, error } = await supabase
      .from('contas_receber')
      .select(`
        *,
        categoria:categorias_financeiras(*)
      `)
      .order('data_vencimento');

    if (error) {
      toast({
        title: "Erro ao carregar contas a receber",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }

    return (data || []) as ContaReceber[];
  };

  const criarContaReceber = async (conta: CreateContaReceberInput): Promise<boolean> => {
    setLoading(true);
    
    // Mapear campos para corresponder à estrutura da tabela
    const contaParaCriar = {
      cliente_nome: conta.cliente_nome,
      cliente_email: conta.cliente_email,
      cliente_telefone: conta.cliente_telefone,
      descricao: conta.descricao,
      valor_original: conta.valor_original,
      data_vencimento: conta.data_vencimento,
      categoria_id: sanitizeUuidField(conta.categoria_id),
      subcategoria_id: sanitizeUuidField(conta.subcategoria_id),
      observacoes: conta.observacoes,
      fornecedor_cliente_id: sanitizeUuidField(conta.fornecedor_cliente_id),
      orcamento_id: sanitizeUuidField(conta.orcamento_id)
    };
    
    const { error } = await supabase
      .from('contas_receber')
      .insert([contaParaCriar]);

    setLoading(false);

    if (error) {
      toast({
        title: "Erro ao criar conta a receber",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Conta a receber criada",
      description: "A conta foi criada com sucesso",
    });
    return true;
  };

  const receberConta = async (contaId: string, valorRecebido: number, dataRecebimento: string, formaPagamento?: string, contaBancariaId?: string): Promise<boolean> => {
    setLoading(true);
    
    // Buscar conta atual
    const { data: conta, error: fetchError } = await supabase
      .from('contas_receber')
      .select('*')
      .eq('id', contaId)
      .single();

    if (fetchError || !conta) {
      setLoading(false);
      toast({
        title: "Erro ao buscar conta",
        description: fetchError?.message || "Conta não encontrada",
        variant: "destructive",
      });
      return false;
    }

    const novoValorRecebido = conta.valor_recebido + valorRecebido;
    const isRecebidoCompleto = novoValorRecebido >= conta.valor_original;

    // Atualizar conta
    const { error: updateError } = await supabase
      .from('contas_receber')
      .update({
        valor_recebido: novoValorRecebido,
        status: isRecebidoCompleto ? 'recebido' : 'pendente',
        data_recebimento: isRecebidoCompleto ? dataRecebimento : null
      })
      .eq('id', contaId);

    if (updateError) {
      setLoading(false);
      toast({
        title: "Erro ao atualizar conta",
        description: updateError.message,
        variant: "destructive",
      });
      return false;
    }

    // Criar transação
    const { error: transacaoError } = await supabase
      .from('transacoes_financeiras')
      .insert([{
        tipo: 'recebimento',
        conta_receber_id: contaId,
        valor: valorRecebido,
        data_transacao: dataRecebimento,
        forma_pagamento: formaPagamento,
        conta_bancaria_id: sanitizeUuidField(contaBancariaId)
      }]);

    setLoading(false);

    if (transacaoError) {
      toast({
        title: "Erro ao registrar transação",
        description: transacaoError.message,
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Recebimento registrado",
      description: `Valor de R$ ${valorRecebido.toFixed(2)} foi registrado`,
    });
    return true;
  };

  // Função para verificar se uma conta pode ter valor pago/recebido editado
  const verificarContaEditavelValor = useCallback(async (contaId: string, tipo: 'pagar' | 'receber') => {
    try {
      const tabela = tipo === 'pagar' ? 'contas_pagar' : 'contas_receber';
      const { data: conta, error: contaError } = await supabase
        .from(tabela)
        .select('id, status')
        .eq('id', contaId)
        .single();

      if (contaError || !conta) return { podeEditar: false, motivo: 'Conta não encontrada' };

      // Só pode editar se estiver paga/recebida
      const statusValido = tipo === 'pagar' ? conta.status === 'pago' : conta.status === 'recebido';
      if (!statusValido) {
        return { podeEditar: false, motivo: 'Conta não está paga/recebida' };
      }

      // Verificar se há movimentação bancária não conciliada
      const { data: movimentacao, error: movError } = await supabase
        .from('movimentacoes_bancarias')
        .select('id, conciliado')
        .eq('origem_tipo', `conta_${tipo}`)
        .eq('origem_id', contaId)
        .single();

      if (movError || !movimentacao) {
        return { podeEditar: false, motivo: 'Movimentação bancária não encontrada' };
      }

      if (movimentacao.conciliado) {
        return { podeEditar: false, motivo: 'Movimentação já está conciliada' };
      }

      return { podeEditar: true, motivo: '' };
    } catch (error) {
      console.error('Erro ao verificar editabilidade:', error);
      return { podeEditar: false, motivo: 'Erro interno' };
    }
  }, [supabase]);

  const editarContaReceber = async (contaId: string, dadosAtualizados: Partial<ContaReceber>): Promise<boolean> => {
    try {
      setLoading(true);

      // Se estamos editando valor_recebido, fazer validações especiais
      if (dadosAtualizados.valor_recebido !== undefined) {
        const verificacao = await verificarContaEditavelValor(contaId, 'receber');
        if (!verificacao.podeEditar) {
          toast({
            title: "Não é possível editar",
            description: verificacao.motivo,
            variant: "destructive",
          });
          return false;
        }

        // Buscar dados atuais para calcular diferença
        const { data: contaAtual, error: contaError } = await supabase
          .from('contas_receber')
          .select('valor_recebido')
          .eq('id', contaId)
          .single();

        if (contaError || !contaAtual) {
          toast({
            title: "Erro",
            description: "Não foi possível encontrar a conta",
            variant: "destructive",
          });
          return false;
        }

        const valorAnterior = Number(contaAtual.valor_recebido);
        const novoValor = Number(dadosAtualizados.valor_recebido);
        const diferenca = novoValor - valorAnterior;

        // Atualizar conta a receber
        const { error: updateError } = await supabase
          .from('contas_receber')
          .update({ valor_recebido: novoValor })
          .eq('id', contaId);

        if (updateError) throw updateError;

        // Atualizar transação financeira
        const { error: transacaoError } = await supabase
          .from('transacoes_financeiras')
          .update({ valor: novoValor })
          .eq('conta_receber_id', contaId);

        if (transacaoError) throw transacaoError;

        // Atualizar movimentação bancária
        const { error: movError } = await supabase
          .from('movimentacoes_bancarias')
          .update({ valor: novoValor })
          .eq('origem_tipo', 'conta_receber')
          .eq('origem_id', contaId);

        if (movError) throw movError;

        // Ajustar saldo da conta bancária se há diferença
        if (diferenca !== 0) {
          const { data: movimentacao } = await supabase
            .from('movimentacoes_bancarias')
            .select('conta_bancaria_id')
            .eq('origem_tipo', 'conta_receber')
            .eq('origem_id', contaId)
            .single();

          if (movimentacao) {
            // Buscar saldo atual e calcular novo saldo
            const { data: contaBancaria, error: fetchError } = await supabase
              .from('contas_bancarias')
              .select('saldo_atual')
              .eq('id', movimentacao.conta_bancaria_id)
              .single();

            if (fetchError || !contaBancaria) throw fetchError || new Error('Conta bancária não encontrada');

            const novoSaldo = Number(contaBancaria.saldo_atual) + diferenca;

            const { error: saldoError } = await supabase
              .from('contas_bancarias')
              .update({ 
                saldo_atual: novoSaldo,
                updated_at: new Date().toISOString()
              })
              .eq('id', movimentacao.conta_bancaria_id);

            if (saldoError) throw saldoError;
          }
        }

        toast({
          title: "Sucesso",
          description: "Valor recebido atualizado com sucesso!",
        });

        triggerGlobalUpdate();
        return true;
      }

      // Se editando valor_original de conta recebida não conciliada, sincronizar com valor_recebido
      if (dadosAtualizados.valor_original !== undefined) {
        const { data: contaAtual, error: fetchError } = await supabase
          .from('contas_receber')
          .select('status, valor_recebido, conta_bancaria_id')
          .eq('id', contaId)
          .single();

        if (fetchError) {
          console.error('Erro ao buscar conta atual:', fetchError);
        } else if (contaAtual?.status === 'recebido') {
          // Verificar se pode editar
          const verificacao = await verificarContaEditavelValor(contaId, 'receber');
          
          if (verificacao.podeEditar) {
            // Calcular diferença
            const valorAnterior = Number(contaAtual.valor_recebido);
            const novoValor = Number(dadosAtualizados.valor_original);
            const diferenca = novoValor - valorAnterior;

            // Atualizar valor_recebido também
            dadosAtualizados.valor_recebido = novoValor;

            // Atualizar movimentação bancária
            const { error: movError } = await supabase
              .from('movimentacoes_bancarias')
              .update({ valor: novoValor })
              .eq('origem_tipo', 'conta_receber')
              .eq('origem_id', contaId);

            if (movError) {
              console.error('Erro ao atualizar movimentação bancária:', movError);
            }

            // Ajustar saldo da conta bancária se necessário
            if (diferenca !== 0 && contaAtual.conta_bancaria_id) {
              const { data: contaBancaria, error: bancoError } = await supabase
                .from('contas_bancarias')
                .select('saldo_atual')
                .eq('id', contaAtual.conta_bancaria_id)
                .single();

              if (!bancoError && contaBancaria) {
                const novoSaldo = Number(contaBancaria.saldo_atual) + diferenca;
                await supabase
                  .from('contas_bancarias')
                  .update({ saldo_atual: novoSaldo })
                  .eq('id', contaAtual.conta_bancaria_id);
              }
            }

            toast({
              title: "Conta editada",
              description: "Valor atualizado e sincronizado com extrato bancário",
            });
          } else {
            // Se não pode editar por estar conciliado, avisar mas permitir outras alterações
            toast({
              title: "Aviso",
              description: `Alteração de valor não propagada para movimentação bancária: ${verificacao.motivo}. Outras alterações foram salvas.`,
              variant: "default",
            });
          }
        }
      }

      // Edição normal (dados gerais)
      const { error } = await supabase
        .from('contas_receber')
        .update(dadosAtualizados)
        .eq('id', contaId);

      if (error) {
        toast({
          title: "Erro ao editar conta",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      if (!dadosAtualizados.valor_original) {
        toast({
          title: "Conta editada",
          description: "A conta foi atualizada com sucesso",
        });
      }
      
      triggerGlobalUpdate();
      return true;
    } catch (error) {
      console.error('Erro inesperado ao editar conta a receber:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao editar conta a receber",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Função memoizada com cache para buscar contas recorrentes
  const buscarContasRecorrenteRelacionadas = useCallback(async (conta: ContaReceber | ContaPagar): Promise<ContaRecorrenteInfo> => {
    const cacheKey = `${conta.id}-${conta.descricao}-${conta.valor_original}`;
    const agora = Date.now();
    
    // Verificar cache primeiro
    const cached = cacheRef.current.get(cacheKey);
    if (cached && (agora - cached.timestamp) < CACHE_TTL) {
      console.log('[FINANCEIRO] Usando cache para conta:', conta.id);
      return cached.data;
    }
    
    console.log('[FINANCEIRO] Iniciando busca de contas recorrentes para:', conta.id);
    
    try {
      // Detectar se é conta a receber ou pagar
      const isContaReceber = 'cliente_nome' in conta;
      const nomeCliente = isContaReceber 
        ? (conta as ContaReceber).cliente_nome 
        : (conta as ContaPagar).fornecedor_nome;
      
      // Fazer consulta mais simples e rápida
      let contasRelacionadas: any[] = [];
      
      if (isContaReceber) {
        const { data, error } = await supabase
          .from('contas_receber')
          .select('id, descricao, valor_original')
          .eq('cliente_nome', nomeCliente)
          .eq('valor_original', conta.valor_original)
          .in('status', ['pendente'])
          .neq('id', conta.id)
          .limit(10); // Limitar resultado
        
        if (error) throw error;
        contasRelacionadas = data || [];
      } else {
        const { data, error } = await supabase
          .from('contas_pagar')
          .select('id, descricao, valor_original')
          .eq('fornecedor_nome', nomeCliente)
          .eq('valor_original', conta.valor_original)
          .in('status', ['pendente'])
          .neq('id', conta.id)
          .limit(10); // Limitar resultado
        
        if (error) throw error;
        contasRelacionadas = data || [];
      }

      // Filtrar contas que parecem ser da mesma série recorrente
      const contasSerie = contasRelacionadas.filter((c: any) => {
        const descBase = conta.descricao.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
        const descRelac = c.descricao.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
        return descBase === descRelac;
      });

      const resultado: ContaRecorrenteInfo = {
        total_contas: contasSerie.length + 1,
        contas_abertas: contasSerie.length,
        contas_ids: contasSerie.map((c: any) => c.id),
        valor_total: contasSerie.reduce((acc: number, c: any) => acc + Number(c.valor_original), 0) + Number(conta.valor_original),
        frequencia: detectarFrequencia(conta.descricao)
      };

      // Salvar no cache
      cacheRef.current.set(cacheKey, { data: resultado, timestamp: agora });
      
      // Limpar cache antigo (máximo 50 entradas)
      if (cacheRef.current.size > 50) {
        const firstKey = cacheRef.current.keys().next().value;
        cacheRef.current.delete(firstKey);
      }

      console.log('[FINANCEIRO] Resultado da busca recorrente:', resultado);
      return resultado;
    } catch (error) {
      console.error('[FINANCEIRO] Erro ao buscar contas recorrentes:', error);
      
      // Retornar estrutura padrão em caso de erro
      const resultadoPadrao: ContaRecorrenteInfo = {
        total_contas: 1,
        contas_abertas: 0,
        contas_ids: [],
        valor_total: Number(conta.valor_original),
        frequencia: 'única'
      };
      
      // Cache do erro também (por menor tempo)
      cacheRef.current.set(cacheKey, { data: resultadoPadrao, timestamp: agora });
      return resultadoPadrao;
    }
  }, []);

  const detectarFrequencia = (descricao: string): string => {
    const match = descricao.match(/\((\d+)\/(\d+)\)/);
    if (!match) return 'única';
    
    const total = parseInt(match[2]);
    if (total <= 12) return 'mensal';
    if (total <= 4) return 'trimestral';
    if (total <= 2) return 'semestral';
    return 'anual';
  };

  const excluirContaReceber = async (contaId: string | string[]): Promise<boolean> => {
    setLoading(true);
    
    const ids = Array.isArray(contaId) ? contaId : [contaId];
    
    for (const id of ids) {
      // Verificar se a conta pode ser excluída
      const { data: conta, error: fetchError } = await supabase
        .from('contas_receber')
        .select('status, valor_recebido, valor_original')
        .eq('id', id)
        .single();

      if (fetchError || !conta) {
        setLoading(false);
        toast({
          title: "Erro ao buscar conta",
          description: fetchError?.message || "Conta não encontrada",
          variant: "destructive",
        });
        return false;
      }

      if (conta.status === 'recebido' || conta.valor_recebido > 0) {
        setLoading(false);
        toast({
          title: "Exclusão não permitida",
          description: "Não é possível excluir contas que já possuem valores recebidos",
          variant: "destructive",
        });
        return false;
      }
    }

    // Excluir transações relacionadas de todas as contas
    for (const id of ids) {
      const { error: transacaoError } = await supabase
        .from('transacoes_financeiras')
        .delete()
        .eq('conta_receber_id', id);

      if (transacaoError) {
        setLoading(false);
        toast({
          title: "Erro ao excluir transações",
          description: transacaoError.message,
          variant: "destructive",
        });
        return false;
      }
    }

    // Excluir contas
    const { error } = await supabase
      .from('contas_receber')
      .delete()
      .in('id', ids);

    setLoading(false);

    if (error) {
      toast({
        title: "Erro ao excluir conta(s)",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    const mensagem = ids.length === 1 
      ? "A conta a receber foi excluída com sucesso"
      : `${ids.length} contas a receber foram excluídas com sucesso`;

    toast({
      title: "Conta(s) excluída(s)",
      description: mensagem,
    });
    return true;
  };

  // Contas a Pagar
  const buscarContasPagar = async (): Promise<ContaPagar[]> => {
    const { data, error } = await supabase
      .from('contas_pagar')
      .select(`
        *,
        categoria:categorias_financeiras(*)
      `)
      .order('data_vencimento');

    if (error) {
      toast({
        title: "Erro ao carregar contas a pagar",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }

    return (data || []) as ContaPagar[];
  };

  const criarContaPagar = async (conta: CreateContaPagarInput): Promise<boolean> => {
    setLoading(true);
    
    // Filtrar apenas os campos que existem na tabela contas_pagar
    const dadosParaBanco = {
      fornecedor_nome: conta.fornecedor_nome,
      fornecedor_email: conta.fornecedor_email,
      fornecedor_telefone: conta.fornecedor_telefone,
      descricao: conta.descricao,
      valor_original: conta.valor_original,
      data_vencimento: conta.data_vencimento,
      categoria_id: sanitizeUuidField(conta.categoria_id),
      subcategoria_id: sanitizeUuidField(conta.subcategoria_id),
      observacoes: conta.observacoes,
      fornecedor_cliente_id: sanitizeUuidField(conta.fornecedor_cliente_id),
    };

      // Se for recorrente, criar múltiplas contas
    if (conta.is_recorrente && conta.quantidade_parcelas && conta.quantidade_parcelas > 1) {
      const contasParaCriar = [];
      const dataBase = criarDataLocal(conta.data_vencimento);
      
      for (let i = 0; i < conta.quantidade_parcelas; i++) {
        let dataVencimento: Date;
        
        // Calcular nova data baseada na frequência usando funções locais
        switch (conta.frequencia_recorrencia) {
          case 'semanal':
            dataVencimento = adicionarDias(dataBase, i * 7);
            break;
          case 'quinzenal':
            dataVencimento = adicionarDias(dataBase, i * 15);
            break;
          case 'mensal':
            dataVencimento = adicionarMeses(dataBase, i);
            break;
          case 'trimestral':
            dataVencimento = adicionarMeses(dataBase, i * 3);
            break;
          case 'semestral':
            dataVencimento = adicionarMeses(dataBase, i * 6);
            break;
          case 'anual':
            dataVencimento = adicionarAnos(dataBase, i);
            break;
        }
        
        contasParaCriar.push({
          ...dadosParaBanco,
          data_vencimento: formatarDataLocal(dataVencimento),
          descricao: `${conta.descricao} (${i + 1}/${conta.quantidade_parcelas})`
        });
      }
      
      const { error } = await supabase
        .from('contas_pagar')
        .insert(contasParaCriar);
        
      setLoading(false);
      
      if (error) {
        toast({
          title: "Erro ao criar contas a pagar",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }
      
      toast({
        title: "Contas a pagar criadas",
        description: `${conta.quantidade_parcelas} contas foram criadas com sucesso`,
      });
      return true;
    } else {
      // Criar conta única
      const { error } = await supabase
        .from('contas_pagar')
        .insert([dadosParaBanco]);

      setLoading(false);

      if (error) {
        toast({
          title: "Erro ao criar conta a pagar",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Conta a pagar criada",
        description: "A conta foi criada com sucesso",
      });
      return true;
    }
  };

  const pagarConta = async (contaId: string, valorPago: number, dataPagamento: string, formaPagamento?: string, contaBancariaId?: string): Promise<boolean> => {
    setLoading(true);
    
    // Buscar conta atual
    const { data: conta, error: fetchError } = await supabase
      .from('contas_pagar')
      .select('*')
      .eq('id', contaId)
      .single();

    if (fetchError || !conta) {
      setLoading(false);
      toast({
        title: "Erro ao buscar conta",
        description: fetchError?.message || "Conta não encontrada",
        variant: "destructive",
      });
      return false;
    }

    const novoValorPago = conta.valor_pago + valorPago;
    const isPagoCompleto = novoValorPago >= conta.valor_original;

    // Atualizar conta
    const { error: updateError } = await supabase
      .from('contas_pagar')
      .update({
        valor_pago: novoValorPago,
        status: isPagoCompleto ? 'pago' : 'pendente',
        data_pagamento: isPagoCompleto ? dataPagamento : null
      })
      .eq('id', contaId);

    if (updateError) {
      setLoading(false);
      toast({
        title: "Erro ao atualizar conta",
        description: updateError.message,
        variant: "destructive",
      });
      return false;
    }

    // Criar transação
    const { error: transacaoError } = await supabase
      .from('transacoes_financeiras')
      .insert([{
        tipo: 'pagamento',
        conta_pagar_id: contaId,
        valor: valorPago,
        data_transacao: dataPagamento,
        forma_pagamento: formaPagamento,
        conta_bancaria_id: contaBancariaId
      }]);

    setLoading(false);

    if (transacaoError) {
      toast({
        title: "Erro ao registrar transação",
        description: transacaoError.message,
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Pagamento registrado",
      description: `Valor de R$ ${valorPago.toFixed(2)} foi registrado`,
    });
    return true;
  };

  const editarContaPagar = async (contaId: string, dadosAtualizados: Partial<ContaPagar>): Promise<boolean> => {
    try {
      setLoading(true);

      // Se estamos editando valor_pago, fazer validações especiais
      if (dadosAtualizados.valor_pago !== undefined) {
        const verificacao = await verificarContaEditavelValor(contaId, 'pagar');
        if (!verificacao.podeEditar) {
          toast({
            title: "Não é possível editar",
            description: verificacao.motivo,
            variant: "destructive",
          });
          return false;
        }

        // Buscar dados atuais para calcular diferença
        const { data: contaAtual, error: contaError } = await supabase
          .from('contas_pagar')
          .select('valor_pago')
          .eq('id', contaId)
          .single();

        if (contaError || !contaAtual) {
          toast({
            title: "Erro",
            description: "Não foi possível encontrar a conta",
            variant: "destructive",
          });
          return false;
        }

        const valorAnterior = Number(contaAtual.valor_pago);
        const novoValor = Number(dadosAtualizados.valor_pago);
        const diferenca = valorAnterior - novoValor; // Diferença invertida para contas a pagar

        // Atualizar conta a pagar
        const { error: updateError } = await supabase
          .from('contas_pagar')
          .update({ valor_pago: novoValor })
          .eq('id', contaId);

        if (updateError) throw updateError;

        // Atualizar transação financeira
        const { error: transacaoError } = await supabase
          .from('transacoes_financeiras')
          .update({ valor: novoValor })
          .eq('conta_pagar_id', contaId);

        if (transacaoError) throw transacaoError;

        // Atualizar movimentação bancária
        const { error: movError } = await supabase
          .from('movimentacoes_bancarias')
          .update({ valor: novoValor })
          .eq('origem_tipo', 'conta_pagar')
          .eq('origem_id', contaId);

        if (movError) throw movError;

        // Ajustar saldo da conta bancária se há diferença
        if (diferenca !== 0) {
          const { data: movimentacao } = await supabase
            .from('movimentacoes_bancarias')
            .select('conta_bancaria_id')
            .eq('origem_tipo', 'conta_pagar')
            .eq('origem_id', contaId)
            .single();

          if (movimentacao) {
            // Buscar saldo atual e calcular novo saldo
            const { data: contaBancaria, error: fetchError } = await supabase
              .from('contas_bancarias')
              .select('saldo_atual')
              .eq('id', movimentacao.conta_bancaria_id)
              .single();

            if (fetchError || !contaBancaria) throw fetchError || new Error('Conta bancária não encontrada');

            const novoSaldo = Number(contaBancaria.saldo_atual) + diferenca;

            const { error: saldoError } = await supabase
              .from('contas_bancarias')
              .update({ 
                saldo_atual: novoSaldo,
                updated_at: new Date().toISOString()
              })
              .eq('id', movimentacao.conta_bancaria_id);

            if (saldoError) throw saldoError;
          }
        }

        toast({
          title: "Sucesso",
          description: "Valor pago atualizado com sucesso!",
        });

        triggerGlobalUpdate();
        return true;
      }

      // Se está alterando o valor_original, validar se é conta paga
      if (dadosAtualizados.valor_original) {
        const { data: validacaoData, error: validacaoError } = await supabase
          .rpc('validar_edicao_conta_paga', {
            p_conta_id: contaId,
            p_novo_valor: dadosAtualizados.valor_original
          });

        if (validacaoError) {
          console.error('Erro ao validar edição:', validacaoError);
          toast({
            title: "Erro",
            description: "Erro ao validar edição da conta",
            variant: "destructive"
          });
          return false;
        }

        const validacao = validacaoData as unknown as ValidacaoEdicaoContaPaga;

        if (!validacao.success) {
          toast({
            title: "Erro",
            description: validacao.message,
            variant: "destructive"
          });
          return false;
        }

        // Se tem warning (conta paga), informar ao usuário
        if (validacao.warning && validacao.impacto) {
          const impacto = validacao.impacto;
          toast({
            title: "Atenção - Conta Paga",
            description: `Esta edição afetará ${impacto.transacoes_afetadas} transações e ${impacto.movimentacoes_afetadas} movimentações bancárias. A diferença de valor é R$ ${impacto.diferenca.toFixed(2)}.`,
            variant: "default"
          });
        }
      }

      // Edição normal (dados gerais)
      const { error } = await supabase
        .from('contas_pagar')
        .update({
          ...dadosAtualizados,
          updated_at: new Date().toISOString()
        })
        .eq('id', contaId);

      if (error) {
        console.error('Erro ao editar conta a pagar:', error);
        toast({
          title: "Erro ao editar conta",
          description: error.message,
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Conta editada",
        description: "A conta foi atualizada com sucesso. As transações relacionadas foram sincronizadas automaticamente."
      });

      triggerGlobalUpdate();
      return true;
    } catch (error) {
      console.error('Erro ao editar conta a pagar:', error);
      toast({
        title: "Erro",
        description: "Erro interno do sistema",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const excluirContaPagar = async (contaId: string | string[]): Promise<boolean> => {
    setLoading(true);
    
    const ids = Array.isArray(contaId) ? contaId : [contaId];
    
    for (const id of ids) {
      // Verificar se a conta pode ser excluída
      const { data: conta, error: fetchError } = await supabase
        .from('contas_pagar')
        .select('status, valor_pago, valor_original')
        .eq('id', id)
        .single();

      if (fetchError || !conta) {
        setLoading(false);
        toast({
          title: "Erro ao buscar conta",
          description: fetchError?.message || "Conta não encontrada",
          variant: "destructive",
        });
        return false;
      }

      if (conta.status === 'pago' || conta.valor_pago > 0) {
        setLoading(false);
        toast({
          title: "Exclusão não permitida",
          description: "Não é possível excluir contas que já possuem valores pagos",
          variant: "destructive",
        });
        return false;
      }
    }

    // Excluir transações relacionadas de todas as contas
    for (const id of ids) {
      const { error: transacaoError } = await supabase
        .from('transacoes_financeiras')
        .delete()
        .eq('conta_pagar_id', id);

      if (transacaoError) {
        setLoading(false);
        toast({
          title: "Erro ao excluir transações",
          description: transacaoError.message,
          variant: "destructive",
        });
        return false;
      }
    }

    // Excluir contas
    const { error } = await supabase
      .from('contas_pagar')
      .delete()
      .in('id', ids);

    setLoading(false);

    if (error) {
      toast({
        title: "Erro ao excluir conta(s)",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    const mensagem = ids.length === 1 
      ? "A conta a pagar foi excluída com sucesso"
      : `${ids.length} contas a pagar foram excluídas com sucesso`;

    toast({
      title: "Conta(s) excluída(s)",
      description: mensagem,
    });
    return true;
  };

  // Dashboard com alertas avançados
  const buscarDashboard = async (periodoSelecionado: number = 30): Promise<DashboardFinanceiro> => {
    const hoje = formatarDataLocal(new Date());
    const amanha = formatarDataLocal(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const proximos7Dias = formatarDataLocal(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const fimPeriodo = formatarDataLocal(new Date(Date.now() + periodoSelecionado * 24 * 60 * 60 * 1000));

    // Buscar contas a receber
    const { data: contasReceber } = await supabase
      .from('contas_receber')
      .select('valor_original, valor_recebido, status, data_vencimento')
      .neq('status', 'perda')
      .neq('status', 'cancelado');

    // Buscar contas a pagar
    const { data: contasPagar } = await supabase
      .from('contas_pagar')
      .select('valor_original, valor_pago, status, data_vencimento')
      .neq('status', 'cancelado');

    // Buscar transações do período selecionado
    const { data: transacoesPeriodo } = await supabase
      .from('transacoes_financeiras')
      .select('tipo, valor')
      .gte('data_transacao', hoje)
      .lte('data_transacao', fimPeriodo);

    // Total a receber (que vencem no período)
    const totalReceber = contasReceber?.filter(c => 
      c.status === 'pendente' && c.data_vencimento >= hoje && c.data_vencimento <= fimPeriodo
    ).reduce((acc, conta) => acc + (conta.valor_original - conta.valor_recebido), 0) || 0;

    // Total a pagar (que vencem no período)
    const totalPagar = contasPagar?.filter(c => 
      c.status === 'pendente' && c.data_vencimento >= hoje && c.data_vencimento <= fimPeriodo
    ).reduce((acc, conta) => acc + (conta.valor_original - conta.valor_pago), 0) || 0;

    // Receitas previstas para o período
    const receitasPeriodo = transacoesPeriodo?.filter(t => t.tipo === 'recebimento')
      .reduce((acc, t) => acc + t.valor, 0) || 0;

    // Despesas previstas para o período
    const despesasPeriodo = transacoesPeriodo?.filter(t => t.tipo === 'pagamento')
      .reduce((acc, t) => acc + t.valor, 0) || 0;

    const contasVencidas = [
      ...(contasReceber?.filter(c => c.status === 'pendente' && c.data_vencimento < hoje) || []),
      ...(contasPagar?.filter(c => c.status === 'pendente' && c.data_vencimento < hoje) || [])
    ].length;

    // Alertas específicos (sempre fixos)
    const hoje_count = [
      ...(contasReceber?.filter(c => c.status === 'pendente' && c.data_vencimento === hoje) || []),
      ...(contasPagar?.filter(c => c.status === 'pendente' && c.data_vencimento === hoje) || [])
    ].length;

    const amanha_count = [
      ...(contasReceber?.filter(c => c.status === 'pendente' && c.data_vencimento === amanha) || []),
      ...(contasPagar?.filter(c => c.status === 'pendente' && c.data_vencimento === amanha) || [])
    ].length;

    const proximos7Dias_count = [
      ...(contasReceber?.filter(c => c.status === 'pendente' && c.data_vencimento <= proximos7Dias && c.data_vencimento >= hoje) || []),
      ...(contasPagar?.filter(c => c.status === 'pendente' && c.data_vencimento <= proximos7Dias && c.data_vencimento >= hoje) || [])
    ].length;

    const fluxoCaixa = totalReceber - totalPagar;

    // Calcular projeção de fluxo de caixa por mês baseado em contas pendentes
    const projecaoFluxoCaixa = [];
    const mesesMap = new Map<string, { entrada: number; saida: number }>();
    
    // Processar contas a receber pendentes
    contasReceber?.filter(c => c.status === 'pendente' && c.data_vencimento >= hoje)
      .forEach(conta => {
        const mesAno = new Date(conta.data_vencimento).toLocaleDateString('pt-BR', { 
          month: 'short', 
          year: '2-digit' 
        });
        const mes = mesesMap.get(mesAno) || { entrada: 0, saida: 0 };
        mes.entrada += (conta.valor_original - conta.valor_recebido);
        mesesMap.set(mesAno, mes);
      });

    // Processar contas a pagar pendentes  
    contasPagar?.filter(c => c.status === 'pendente' && c.data_vencimento >= hoje)
      .forEach(conta => {
        const mesAno = new Date(conta.data_vencimento).toLocaleDateString('pt-BR', { 
          month: 'short', 
          year: '2-digit' 
        });
        const mes = mesesMap.get(mesAno) || { entrada: 0, saida: 0 };
        mes.saida += (conta.valor_original - conta.valor_pago);
        mesesMap.set(mesAno, mes);
      });

    // Converter para array e calcular saldo acumulado
    let saldoAcumulado = 0;
    Array.from(mesesMap.entries())
      .sort(([a], [b]) => {
        const [mesA, anoA] = a.split(' ');
        const [mesB, anoB] = b.split(' ');
        const dataA = new Date(2000 + parseInt(anoA), new Date(`${mesA} 1, 2000`).getMonth());
        const dataB = new Date(2000 + parseInt(anoB), new Date(`${mesB} 1, 2000`).getMonth());
        return dataA.getTime() - dataB.getTime();
      })
      .slice(0, 6) // Limitar a 6 meses
      .forEach(([mes, dados]) => {
        const saldo = dados.entrada - dados.saida;
        saldoAcumulado += saldo;
        projecaoFluxoCaixa.push({
          mes,
          entrada: dados.entrada,
          saida: dados.saida,
          saldo,
          saldoAcumulado
        });
      });

    // Calcular receitas vs despesas mensais baseado no período selecionado
    const receitasDespesasMensais = [];
    const mesesReceitasDespesas = new Map<string, { receitas: number; despesas: number }>();
    
    // Processar contas a receber que vencem no período
    contasReceber?.filter(c => 
      c.status === 'pendente' && 
      c.data_vencimento >= hoje && 
      c.data_vencimento <= fimPeriodo
    ).forEach(conta => {
      const mesAno = new Date(conta.data_vencimento).toLocaleDateString('pt-BR', { 
        month: 'short', 
        year: '2-digit' 
      });
      const mes = mesesReceitasDespesas.get(mesAno) || { receitas: 0, despesas: 0 };
      mes.receitas += (conta.valor_original - conta.valor_recebido);
      mesesReceitasDespesas.set(mesAno, mes);
    });

    // Processar contas a pagar que vencem no período
    contasPagar?.filter(c => 
      c.status === 'pendente' && 
      c.data_vencimento >= hoje && 
      c.data_vencimento <= fimPeriodo
    ).forEach(conta => {
      const mesAno = new Date(conta.data_vencimento).toLocaleDateString('pt-BR', { 
        month: 'short', 
        year: '2-digit' 
      });
      const mes = mesesReceitasDespesas.get(mesAno) || { receitas: 0, despesas: 0 };
      mes.despesas += (conta.valor_original - conta.valor_pago);
      mesesReceitasDespesas.set(mesAno, mes);
    });

    // Converter para array ordenado
    Array.from(mesesReceitasDespesas.entries())
      .sort(([a], [b]) => {
        const [mesA, anoA] = a.split(' ');
        const [mesB, anoB] = b.split(' ');
        const dataA = new Date(2000 + parseInt(anoA), new Date(`${mesA} 1, 2000`).getMonth());
        const dataB = new Date(2000 + parseInt(anoB), new Date(`${mesB} 1, 2000`).getMonth());
        return dataA.getTime() - dataB.getTime();
      })
      .forEach(([mes, dados]) => {
        const saldoLiquido = dados.receitas - dados.despesas;
        receitasDespesasMensais.push({
          mes,
          receitas: dados.receitas,
          despesas: dados.despesas,
          saldoLiquido
        });
      });

    return {
      totalReceber,
      totalPagar,
      receitasPeriodo,
      despesasPeriodo,
      contasVencidas,
      fluxoCaixa,
      alertasVencimento: {
        hoje: hoje_count,
        amanha: amanha_count,
        proximos7Dias: proximos7Dias_count
      },
      periodoSelecionado,
      projecaoFluxoCaixa,
      receitasDespesasMensais
    };
  };

  const buscarContasPorVencimento = async (tipo: 'hoje' | 'amanha' | 'proximos7Dias' | 'vencidas'): Promise<ContaVencimento[]> => {
    try {
      const hoje = new Date();
      const amanha = adicionarDias(hoje, 1);
      const proximos7Dias = adicionarDias(hoje, 7);

      let dataInicio: string, dataFim: string;

      switch (tipo) {
        case 'hoje':
          dataInicio = dataFim = formatarDataLocal(hoje);
          break;
        case 'amanha':
          dataInicio = dataFim = formatarDataLocal(amanha);
          break;
        case 'proximos7Dias':
          dataInicio = formatarDataLocal(adicionarDias(amanha, 1));
          dataFim = formatarDataLocal(proximos7Dias);
          break;
        case 'vencidas':
          dataInicio = '2020-01-01';
          dataFim = formatarDataLocal(adicionarDias(hoje, -1));
          break;
      }

      // Buscar contas a receber
      const { data: contasReceber } = await supabase
        .from('contas_receber')
        .select(`
          *,
          categoria:categorias_financeiras(*)
        `)
        .gte('data_vencimento', dataInicio)
        .lte('data_vencimento', dataFim)
        .neq('status', 'recebido')
        .neq('status', 'perda')
        .neq('status', 'cancelado');

      // Buscar contas a pagar
      const { data: contasPagar } = await supabase
        .from('contas_pagar')
        .select(`
          *,
          categoria:categorias_financeiras(*)
        `)
        .gte('data_vencimento', dataInicio)
        .lte('data_vencimento', dataFim)
        .neq('status', 'pago')
        .neq('status', 'cancelado');

      const contasFormatadas: ContaVencimento[] = [
        ...(contasReceber || []).map(c => ({
          id: c.id,
          tipo: 'conta_receber' as const,
          descricao: c.descricao,
          valor_pendente: c.valor_original - c.valor_recebido,
          cliente_fornecedor: c.cliente_nome,
          data_vencimento: c.data_vencimento,
          status: criarDataLocal(c.data_vencimento) < hoje ? 'vencido' as const : (c.status as 'pendente' | 'recebido' | 'pago' | 'vencido' | 'cancelado'),
          // Campos adicionais para compatibilidade
          valor_original: c.valor_original,
          valor_recebido: c.valor_recebido,
          data_recebimento: c.data_recebimento,
          categoria_id: c.categoria_id,
          observacoes: c.observacoes,
          created_at: c.created_at,
          updated_at: c.updated_at,
          cliente_nome: c.cliente_nome,
          cliente_email: c.cliente_email,
          cliente_telefone: c.cliente_telefone,
          orcamento_id: c.orcamento_id,
          categoria: c.categoria as CategoriaFinanceira
        })),
        ...(contasPagar || []).map(c => ({
          id: c.id,
          tipo: 'conta_pagar' as const,
          descricao: c.descricao,
          valor_pendente: c.valor_original - c.valor_pago,
          cliente_fornecedor: c.fornecedor_nome,
          data_vencimento: c.data_vencimento,
          status: criarDataLocal(c.data_vencimento) < hoje ? 'vencido' as const : (c.status as 'pendente' | 'recebido' | 'pago' | 'vencido' | 'cancelado'),
          // Campos adicionais para compatibilidade
          valor_original: c.valor_original,
          valor_pago: c.valor_pago,
          data_pagamento: c.data_pagamento,
          categoria_id: c.categoria_id,
          observacoes: c.observacoes,
          created_at: c.created_at,
          updated_at: c.updated_at,
          fornecedor_nome: c.fornecedor_nome,
          fornecedor_email: c.fornecedor_email,
          fornecedor_telefone: c.fornecedor_telefone,
          categoria: c.categoria as CategoriaFinanceira
        }))
      ];

      return contasFormatadas.sort((a, b) => 
        new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
      );
    } catch (error) {
      console.error('Erro ao buscar contas por vencimento:', error);
      toast({
        title: "Erro",
        description: "Erro ao buscar contas por vencimento",
        variant: "destructive",
      });
      return [];
    }
  };

  // Função para buscar contas com filtros
  const buscarContasReceberComFiltros = async (filtros?: {
    status?: string;
    dataInicio?: string;
    dataFim?: string;
    busca?: string;
  }): Promise<ContaReceber[]> => {
    let query = supabase
      .from('contas_receber')
      .select(`
        *,
        categoria:categorias_financeiras(*)
      `);

    if (filtros?.status) {
      query = query.eq('status', filtros.status);
    }

    if (filtros?.dataInicio) {
      query = query.gte('data_vencimento', filtros.dataInicio);
    }

    if (filtros?.dataFim) {
      query = query.lte('data_vencimento', filtros.dataFim);
    }

    if (filtros?.busca) {
      query = query.or(`cliente_nome.ilike.%${filtros.busca}%,descricao.ilike.%${filtros.busca}%`);
    }

    const { data, error } = await query.order('data_vencimento');

    if (error) {
      toast({
        title: "Erro ao carregar contas a receber",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }

    return (data || []) as ContaReceber[];
  };

  const buscarContasPagarComFiltros = async (filtros?: {
    status?: string;
    dataInicio?: string;
    dataFim?: string;
    busca?: string;
  }): Promise<ContaPagar[]> => {
    let query = supabase
      .from('contas_pagar')
      .select(`
        *,
        categoria:categorias_financeiras(*)
      `);

    if (filtros?.status) {
      query = query.eq('status', filtros.status);
    }

    if (filtros?.dataInicio) {
      query = query.gte('data_vencimento', filtros.dataInicio);
    }

    if (filtros?.dataFim) {
      query = query.lte('data_vencimento', filtros.dataFim);
    }

    if (filtros?.busca) {
      query = query.or(`fornecedor_nome.ilike.%${filtros.busca}%,descricao.ilike.%${filtros.busca}%`);
    }

    const { data, error } = await query.order('data_vencimento');

    if (error) {
      toast({
        title: "Erro ao carregar contas a pagar",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }

    return (data || []) as ContaPagar[];
  };

  // Funções para fornecedores
  const buscarFornecedores = async (): Promise<FornecedorOption[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, email, telefone, empresa, status')
      .eq('tipo_usuario', 'fornecedor')
      .order('status', { ascending: false })
      .order('nome', { ascending: true });

    if (error) {
      toast({
        title: "Erro ao carregar fornecedores",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }

    return (data || []) as FornecedorOption[];
  };

  // Função para criar contas recorrentes
  const criarContaReceberRecorrente = async (conta: CreateContaReceberInput): Promise<boolean> => {
    if (!conta.is_recorrente || !conta.frequencia_recorrencia || !conta.quantidade_parcelas) {
      return criarContaReceber(conta);
    }

    setLoading(true);

    try {
      const contasParaCriar: any[] = [];
      const dataBase = criarDataLocal(conta.data_vencimento);

      for (let i = 0; i < conta.quantidade_parcelas; i++) {
        let dataVencimento: Date;
        
        // Calcular nova data baseada na frequência usando funções locais
        switch (conta.frequencia_recorrencia) {
          case 'semanal':
            dataVencimento = adicionarDias(dataBase, i * 7);
            break;
          case 'quinzenal':
            dataVencimento = adicionarDias(dataBase, i * 15);
            break;
          case 'mensal':
            dataVencimento = adicionarMeses(dataBase, i);
            break;
          case 'trimestral':
            dataVencimento = adicionarMeses(dataBase, i * 3);
            break;
          case 'semestral':
            dataVencimento = adicionarMeses(dataBase, i * 6);
            break;
          case 'anual':
            dataVencimento = adicionarAnos(dataBase, i);
            break;
        }

        const contaParaCriar = {
          cliente_nome: conta.cliente_nome,
          cliente_email: conta.cliente_email,
          cliente_telefone: conta.cliente_telefone,
          descricao: `${conta.descricao} (${i + 1}/${conta.quantidade_parcelas})`,
          valor_original: conta.valor_original,
          data_vencimento: formatarDataLocal(dataVencimento),
          categoria_id: sanitizeUuidField(conta.categoria_id),
          observacoes: conta.observacoes,
          fornecedor_cliente_id: sanitizeUuidField(conta.fornecedor_cliente_id),
          orcamento_id: sanitizeUuidField(conta.orcamento_id)
        };

        contasParaCriar.push(contaParaCriar);
      }

      const { error } = await supabase
        .from('contas_receber')
        .insert(contasParaCriar);

      setLoading(false);

      if (error) {
        toast({
          title: "Erro ao criar contas recorrentes",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Contas recorrentes criadas",
        description: `${conta.quantidade_parcelas} contas foram criadas com sucesso`,
      });
      return true;
    } catch (error) {
      setLoading(false);
      toast({
        title: "Erro ao criar contas recorrentes",
        description: "Erro interno do sistema",
        variant: "destructive",
      });
      return false;
    }
  };

  // Função para criar contas com fluxo variável
  const criarContaReceberVariavel = async (conta: CreateContaReceberInput): Promise<boolean> => {
    if (!conta.parcelas_variaveis || conta.parcelas_variaveis.length < 2) {
      toast({
        title: "Erro de validação",
        description: "Fluxo variável deve ter pelo menos 2 parcelas",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);

    try {
      const contasParaCriar: any[] = [];

      // Criar uma conta para cada parcela
      conta.parcelas_variaveis.forEach((parcela, index) => {
        const contaCompleta = {
          cliente_nome: conta.cliente_nome,
          cliente_email: conta.cliente_email || null,
          cliente_telefone: conta.cliente_telefone || null,
          descricao: parcela.observacoes 
            ? `${conta.descricao} - ${parcela.observacoes}` 
            : `${conta.descricao} - Parcela ${index + 1}/${conta.parcelas_variaveis!.length}`,
          valor_original: parcela.valor,
          data_vencimento: parcela.data_vencimento,
          categoria_id: sanitizeUuidField(conta.categoria_id),
          observacoes: parcela.observacoes || conta.observacoes,
          fornecedor_cliente_id: sanitizeUuidField(conta.fornecedor_cliente_id),
        };

        contasParaCriar.push(contaCompleta);
      });

      // Inserir todas as contas de uma vez
      const { error } = await supabase
        .from('contas_receber')
        .insert(contasParaCriar);

      if (error) throw error;

      triggerGlobalUpdate();
      
      setLoading(false);
      toast({
        title: "Contas criadas com sucesso",
        description: `${contasParaCriar.length} contas com fluxo variável foram criadas`,
      });
      return true;

    } catch (error) {
      console.error('Erro ao criar contas com fluxo variável:', error);
      setLoading(false);
      toast({
        title: "Erro ao criar contas",
        description: "Erro interno do sistema",
        variant: "destructive",
      });
      return false;
    }
  };

  // Função para criar contas a pagar com fluxo variável
  const criarContaPagarVariavel = async (conta: CreateContaPagarInput): Promise<boolean> => {
    if (!conta.parcelas_variaveis || conta.parcelas_variaveis.length < 2) {
      toast({
        title: "Erro de validação",
        description: "Fluxo variável deve ter pelo menos 2 parcelas",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);

    try {
      const contasParaCriar: any[] = [];

      // Criar uma conta para cada parcela
      conta.parcelas_variaveis.forEach((parcela, index) => {
        const contaCompleta = {
          fornecedor_nome: conta.fornecedor_nome,
          fornecedor_email: conta.fornecedor_email || null,
          fornecedor_telefone: conta.fornecedor_telefone || null,
          descricao: parcela.observacoes 
            ? `${conta.descricao} - ${parcela.observacoes}` 
            : `${conta.descricao} - Parcela ${index + 1}/${conta.parcelas_variaveis!.length}`,
          valor_original: parcela.valor,
          data_vencimento: parcela.data_vencimento,
          categoria_id: sanitizeUuidField(conta.categoria_id),
          subcategoria_id: sanitizeUuidField(conta.subcategoria_id),
          observacoes: parcela.observacoes || conta.observacoes,
          fornecedor_cliente_id: sanitizeUuidField(conta.fornecedor_cliente_id),
        };

        contasParaCriar.push(contaCompleta);
      });

      // Inserir todas as contas de uma vez
      const { error } = await supabase
        .from('contas_pagar')
        .insert(contasParaCriar);

      if (error) throw error;

      triggerGlobalUpdate();
      
      setLoading(false);
      toast({
        title: "Contas a pagar criadas",
        description: `${contasParaCriar.length} contas com fluxo variável foram criadas`,
      });
      return true;

    } catch (error) {
      console.error('Erro ao criar contas a pagar com fluxo variável:', error);
      setLoading(false);
      toast({
        title: "Erro ao criar contas",
        description: "Erro interno do sistema",
        variant: "destructive",
      });
      return false;
    }
  };

  // Funções Bancárias
  const buscarContasBancarias = async (): Promise<ContaBancaria[]> => {
    try {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('*')
        .order('nome');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar contas bancárias:', error);
      toast({
        title: "Erro",
        description: "Erro ao buscar contas bancárias",
        variant: "destructive",
      });
      return [];
    }
  };

  const criarContaBancaria = async (conta: CreateContaBancariaInput): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('contas_bancarias')
        .insert([conta]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conta bancária criada com sucesso",
      });
      return true;
    } catch (error) {
      console.error('Erro ao criar conta bancária:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar conta bancária",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const editarContaBancaria = async (contaId: string, dadosAtualizados: Partial<ContaBancaria>): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('contas_bancarias')
        .update({
          ...dadosAtualizados,
          updated_at: new Date().toISOString()
        })
        .eq('id', contaId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conta bancária atualizada com sucesso",
      });
      return true;
    } catch (error) {
      console.error('Erro ao editar conta bancária:', error);
      toast({
        title: "Erro",
        description: "Erro ao editar conta bancária",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const atualizarSaldoBancario = async (contaId: string, dadosAtualizacao: AtualizarSaldoInput): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Buscar saldo atual da conta
      const { data: contaAtual, error: contaError } = await supabase
        .from('contas_bancarias')
        .select('saldo_atual, nome')
        .eq('id', contaId)
        .single();

      if (contaError) throw contaError;

      const saldoAnterior = contaAtual.saldo_atual;
      const { novo_saldo, observacao } = dadosAtualizacao;
      const diferenca = novo_saldo - saldoAnterior;

      // Atualizar saldo da conta
      const { error: updateError } = await supabase
        .from('contas_bancarias')
        .update({
          saldo_atual: novo_saldo,
          updated_at: new Date().toISOString()
        })
        .eq('id', contaId);

      if (updateError) throw updateError;

      // Criar movimentação de ajuste no extrato se houver diferença
      if (diferenca !== 0) {
        const { error: movError } = await supabase
          .from('movimentacoes_bancarias')
          .insert([{
            conta_bancaria_id: contaId,
            data_movimentacao: new Date().toISOString().split('T')[0],
            tipo: diferenca > 0 ? 'entrada' : 'saida',
            valor: Math.abs(diferenca),
            descricao: `Ajuste de saldo: ${observacao} (Saldo anterior: R$ ${saldoAnterior.toFixed(2)})`,
            origem_tipo: 'ajuste_saldo',
            conciliado: true
          }]);

        if (movError) throw movError;
      }

      toast({
        title: "Sucesso",
        description: "Saldo atualizado com sucesso e registrado no extrato",
      });
      return true;
    } catch (error) {
      console.error('Erro ao atualizar saldo:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar saldo da conta",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const buscarMovimentacoesBancarias = async (contaBancariaId?: string, filtros?: {
    dataInicio?: string;
    dataFim?: string;
    conciliado?: boolean;
  }): Promise<MovimentacaoBancaria[]> => {
    try {
      let query = supabase
        .from('movimentacoes_bancarias')
        .select(`
          *,
          conta_bancaria:contas_bancarias(*)
        `)
        .order('data_movimentacao', { ascending: false });

      if (contaBancariaId) {
        query = query.eq('conta_bancaria_id', contaBancariaId);
      }

      if (filtros?.dataInicio) {
        query = query.gte('data_movimentacao', filtros.dataInicio);
      }

      if (filtros?.dataFim) {
        query = query.lte('data_movimentacao', filtros.dataFim);
      }

      if (filtros?.conciliado !== undefined) {
        query = query.eq('conciliado', filtros.conciliado);
      }

      const { data, error } = await query;

      if (error) throw error;
      
    // Buscar informações adicionais das contas de origem
    const movimentacoesComDetalhes = await Promise.all(
      (data || []).map(async (mov: any) => {
        let pessoa_nome = null;
        let pessoa_email = null;
        let categoria_nome = null;
        let subcategoria_nome = null;

        if (mov.origem_id && mov.origem_tipo) {
          try {
            if (mov.origem_tipo === 'conta_pagar') {
              // Para contas a pagar, buscar fornecedor
              const { data: contaOrigem } = await supabase
                .from('contas_pagar')
                .select(`
                  fornecedor_nome,
                  fornecedor_email,
                  categoria:categorias_financeiras(nome),
                  subcategoria:subcategorias_financeiras(nome)
                `)
                .eq('id', mov.origem_id)
                .maybeSingle();

              if (contaOrigem) {
                pessoa_nome = contaOrigem.fornecedor_nome;
                pessoa_email = contaOrigem.fornecedor_email;
                categoria_nome = (contaOrigem as any).categoria?.nome;
                subcategoria_nome = (contaOrigem as any).subcategoria?.nome;
              }
            } else if (mov.origem_tipo === 'conta_receber') {
              // Para contas a receber, buscar cliente
              const { data: contaOrigem } = await supabase
                .from('contas_receber')
                .select(`
                  cliente_nome,
                  cliente_email,
                  categoria:categorias_financeiras(nome),
                  subcategoria:subcategorias_financeiras(nome)
                `)
                .eq('id', mov.origem_id)
                .maybeSingle();

              if (contaOrigem) {
                pessoa_nome = contaOrigem.cliente_nome;
                pessoa_email = contaOrigem.cliente_email;
                categoria_nome = (contaOrigem as any).categoria?.nome;
                subcategoria_nome = (contaOrigem as any).subcategoria?.nome;
              }
            }
          } catch (error) {
            console.error('Erro ao buscar detalhes da movimentação:', error);
          }
        }

        return {
          ...mov,
          pessoa_nome,
          pessoa_email,
          categoria_nome,
          subcategoria_nome
        };
      })
    );
      
      return movimentacoesComDetalhes as MovimentacaoBancaria[];
    } catch (error) {
      console.error('Erro ao buscar movimentações bancárias:', error);
      toast({
        title: "Erro",
        description: "Erro ao buscar movimentações bancárias",
        variant: "destructive",
      });
      return [];
    }
  };

  const criarMovimentacaoBancaria = async (movimentacao: CreateMovimentacaoBancariaInput): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('movimentacoes_bancarias')
        .insert([movimentacao]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Movimentação bancária criada com sucesso",
      });
      return true;
    } catch (error) {
      console.error('Erro ao criar movimentação bancária:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar movimentação bancária",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const marcarTransacaoConciliada = async (movimentacaoId: string, conciliado: boolean): Promise<boolean> => {
    try {
      // Buscar dados da movimentação antes de atualizar
      const { data: movimentacao, error: movError } = await supabase
        .from('movimentacoes_bancarias')
        .select('id, conta_bancaria_id, valor, tipo, conciliado')
        .eq('id', movimentacaoId)
        .single();

      if (movError) throw movError;
      if (!movimentacao) throw new Error('Movimentação não encontrada');

      // Verificar se o status já está no estado desejado
      if (movimentacao.conciliado === conciliado) {
        toast({
          title: "Aviso",
          description: `Transação já está ${conciliado ? 'conciliada' : 'não conciliada'}`,
        });
        return true;
      }

      // Calcular impacto no saldo
      let impactoSaldo = Number(movimentacao.valor);
      
      // Se está marcando como conciliada
      if (conciliado) {
        // Entrada: soma ao saldo, Saída: subtrai do saldo
        impactoSaldo = movimentacao.tipo === 'entrada' ? impactoSaldo : -impactoSaldo;
      } else {
        // Se está desmarcando, fazer o movimento inverso
        impactoSaldo = movimentacao.tipo === 'entrada' ? -impactoSaldo : impactoSaldo;
      }

      // Usar transação para garantir atomicidade
      const { error } = await supabase.rpc('atualizar_conciliacao_e_saldo', {
        p_movimentacao_id: movimentacaoId,
        p_conta_bancaria_id: movimentacao.conta_bancaria_id,
        p_conciliado: conciliado,
        p_impacto_saldo: impactoSaldo
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Transação ${conciliado ? 'marcada como conciliada' : 'desmarcada'} e saldo atualizado`,
      });
      
      // Disparar atualização global para sincronizar todos os componentes
      triggerGlobalUpdate();
      
      return true;
    } catch (error) {
      console.error('Erro ao marcar transação:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status da transação",
        variant: "destructive",
      });
      return false;
    }
  };

  const buscarDashboardBancario = async (): Promise<DashboardBancario> => {
    try {
      // Buscar saldos das contas
      const { data: contas, error: contasError } = await supabase
        .from('contas_bancarias')
        .select('id, nome, banco, saldo_atual')
        .eq('ativa', true);

      if (contasError) throw contasError;

      // Buscar transações não conciliadas
      const { data: naoConciliadas, error: naoConciliadasError } = await supabase
        .from('movimentacoes_bancarias')
        .select('id')
        .eq('conciliado', false);

      if (naoConciliadasError) throw naoConciliadasError;

      const saldoTotal = (contas || []).reduce((total, conta) => total + Number(conta.saldo_atual), 0);

      return {
        saldo_total: saldoTotal,
        saldos_por_conta: (contas || []).map(conta => ({
          conta_bancaria_id: conta.id,
          nome: conta.nome,
          banco: conta.banco,
          saldo: Number(conta.saldo_atual)
        })),
        transacoes_nao_conciliadas: naoConciliadas?.length || 0,
        ultimo_saldo_atualizado: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao buscar dashboard bancário:', error);
      return {
        saldo_total: 0,
        saldos_por_conta: [],
        transacoes_nao_conciliadas: 0,
        ultimo_saldo_atualizado: new Date().toISOString()
      };
    }
  };

  // Buscar motivos de perda do Financeiro
  const buscarMotivosPerda = async (): Promise<MotivoPerda[]> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('motivos_perda_financeiro')
        .select('*')
        .eq('ativo', true)
        .order('ordem');
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar motivos de perda:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Marcar conta como perda
  const marcarComoPerda = async (
    contaId: string, 
    motivoPerdaId: string, 
    justificativa?: string,
    dataPerda?: string
  ): Promise<void> => {
    try {
      setLoading(true);
      
      const updateData: any = {
        status: 'perda',
        motivo_perda_id: motivoPerdaId,
        data_perda: dataPerda || new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      };
      
      if (justificativa) {
        updateData.justificativa_perda = justificativa;
      }
      
      const { error } = await supabase
        .from('contas_receber')
        .update(updateData)
        .eq('id', contaId);
      
      if (error) throw error;
      
      triggerGlobalUpdate();
      
      toast({
        title: "Sucesso",
        description: "Conta marcada como perda com sucesso",
      });
    } catch (error) {
      console.error('Erro ao marcar conta como perda:', error);
      toast({
        title: "Erro",
        description: "Erro ao marcar conta como perda",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Reverter marcação de perda
  const reverterPerda = async (contaId: string): Promise<void> => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('contas_receber')
        .update({
          status: 'pendente',
          motivo_perda_id: null,
          justificativa_perda: null,
          data_perda: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', contaId);
      
      if (error) throw error;
      
      triggerGlobalUpdate();
      
      toast({
        title: "Sucesso",
        description: "Marcação de perda revertida com sucesso",
      });
    } catch (error) {
      console.error('Erro ao reverter perda:', error);
      toast({
        title: "Erro",
        description: "Erro ao reverter marcação de perda",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    buscarCategorias,
    buscarContasReceber,
    buscarContasReceberComFiltros,
    criarContaReceber,
    criarContaReceberRecorrente,
    criarContaReceberVariavel,
    receberConta,
    editarContaReceber,
    excluirContaReceber,
    buscarContasPagar,
    buscarContasPagarComFiltros,
    criarContaPagar,
    criarContaPagarVariavel,
    pagarConta,
    editarContaPagar,
    excluirContaPagar,
    buscarDashboard,
    buscarContasPorVencimento,
    buscarFornecedores,
    // Sistema Bancário
    buscarContasBancarias,
    criarContaBancaria,
    editarContaBancaria,
    atualizarSaldoBancario,
    buscarMovimentacoesBancarias,
    criarMovimentacaoBancaria,
    marcarTransacaoConciliada,
    buscarDashboardBancario,
    // Funções para contas recorrentes
    buscarContasRecorrenteRelacionadas,
    // Função para verificar editabilidade de valores
    verificarContaEditavelValor,
    // Gestão de perdas
    buscarMotivosPerda,
    marcarComoPerda,
    reverterPerda
  };
};