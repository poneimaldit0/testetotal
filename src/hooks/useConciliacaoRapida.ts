import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFinanceiro } from './useFinanceiro';
import type { 
  ItemExtratoBanco, 
  ContaParaVincular, 
  VinculoExtrato, 
  SugestaoVinculo,
  ResumoConciliacao 
} from '@/types/conciliacao';
import { parseExtratoOFX } from '@/utils/parseExtratoOFX';
import { parseExtratoCSV } from '@/utils/parseExtratoCSV';

export const useConciliacaoRapida = (contaBancariaId: string) => {
  const [loading, setLoading] = useState(false);
  const [itensExtrato, setItensExtrato] = useState<ItemExtratoBanco[]>([]);
  const [contasDisponiveis, setContasDisponiveis] = useState<ContaParaVincular[]>([]);
  const [vinculos, setVinculos] = useState<Map<string, VinculoExtrato>>(new Map());
  const [sugestoes, setSugestoes] = useState<SugestaoVinculo[]>([]);
  
  const { toast } = useToast();
  const { receberConta, pagarConta } = useFinanceiro();

  // Importar extrato do arquivo
  const importarExtrato = useCallback(async (arquivo: File): Promise<boolean> => {
    setLoading(true);
    
    try {
      const conteudo = await arquivo.text();
      const extensao = arquivo.name.split('.').pop()?.toLowerCase();
      
      let resultado;
      if (extensao === 'ofx') {
        resultado = parseExtratoOFX(conteudo, arquivo.name);
      } else if (extensao === 'csv') {
        resultado = parseExtratoCSV(conteudo, arquivo.name);
      } else {
        toast({
          title: "Formato não suportado",
          description: "Use arquivos .ofx ou .csv",
          variant: "destructive"
        });
        return false;
      }

      if (!resultado.sucesso) {
        toast({
          title: "Erro ao importar",
          description: resultado.erros.join(', '),
          variant: "destructive"
        });
        return false;
      }

      setItensExtrato(resultado.itens);
      
      // Carregar contas pendentes para o período do extrato
      if (resultado.itens.length > 0) {
        const dataInicio = resultado.itens[0].data;
        const dataFim = resultado.itens[resultado.itens.length - 1].data;
        await carregarContasPendentes(dataInicio, dataFim);
      }

      toast({
        title: "Extrato importado",
        description: `${resultado.itens.length} transações encontradas`
      });

      return true;
    } catch (error) {
      console.error('Erro ao importar extrato:', error);
      toast({
        title: "Erro",
        description: "Falha ao processar arquivo",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Carregar contas pendentes no período
  const carregarContasPendentes = useCallback(async (dataInicio: string, dataFim: string) => {
    try {
      // Expandir período em 5 dias para pegar contas próximas
      const inicio = new Date(dataInicio);
      inicio.setDate(inicio.getDate() - 5);
      const fim = new Date(dataFim);
      fim.setDate(fim.getDate() + 5);

      const [receberResult, pagarResult] = await Promise.all([
        supabase
          .from('contas_receber')
          .select('id, descricao, valor_original, data_vencimento, cliente_nome, status')
          .in('status', ['pendente', 'vencido'])
          .gte('data_vencimento', inicio.toISOString().split('T')[0])
          .lte('data_vencimento', fim.toISOString().split('T')[0]),
        supabase
          .from('contas_pagar')
          .select('id, descricao, valor_original, data_vencimento, fornecedor_nome, status')
          .in('status', ['pendente', 'vencido'])
          .gte('data_vencimento', inicio.toISOString().split('T')[0])
          .lte('data_vencimento', fim.toISOString().split('T')[0])
      ]);

      const contas: ContaParaVincular[] = [];

      if (receberResult.data) {
        contas.push(...receberResult.data.map(c => ({
          id: c.id,
          tipo: 'receber' as const,
          descricao: c.descricao,
          valor: c.valor_original,
          dataVencimento: c.data_vencimento,
          cliente_fornecedor: c.cliente_nome,
          status: c.status
        })));
      }

      if (pagarResult.data) {
        contas.push(...pagarResult.data.map(c => ({
          id: c.id,
          tipo: 'pagar' as const,
          descricao: c.descricao,
          valor: c.valor_original,
          dataVencimento: c.data_vencimento,
          cliente_fornecedor: c.fornecedor_nome,
          status: c.status
        })));
      }

      setContasDisponiveis(contas);
      
      // Gerar sugestões automáticas
      gerarSugestoes(itensExtrato.length > 0 ? itensExtrato : [], contas);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    }
  }, [itensExtrato]);

  // Gerar sugestões de vinculação
  const gerarSugestoes = useCallback((itens: ItemExtratoBanco[], contas: ContaParaVincular[]) => {
    const novasSugestoes: SugestaoVinculo[] = [];
    
    for (const item of itens) {
      // Filtrar contas compatíveis (entrada -> receber, saída -> pagar)
      const contasCompativeis = contas.filter(c => 
        (item.tipo === 'entrada' && c.tipo === 'receber') ||
        (item.tipo === 'saida' && c.tipo === 'pagar')
      );

      for (const conta of contasCompativeis) {
        const similaridade = calcularSimilaridade(item, conta);
        
        if (similaridade >= 70) {
          novasSugestoes.push({
            extratoItem: item,
            conta,
            similaridade,
            motivoSugestao: gerarMotivoSugestao(item, conta, similaridade)
          });
        }
      }
    }

    // Ordenar por similaridade decrescente
    novasSugestoes.sort((a, b) => b.similaridade - a.similaridade);
    
    // Remover duplicatas (mesma conta sugerida múltiplas vezes)
    const vistos = new Set<string>();
    const sugestoesFiltradas = novasSugestoes.filter(s => {
      const chave = `${s.extratoItem.id}-${s.conta.id}`;
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    });

    setSugestoes(sugestoesFiltradas);
  }, []);

  // Calcular similaridade entre item do extrato e conta
  const calcularSimilaridade = (item: ItemExtratoBanco, conta: ContaParaVincular): number => {
    let pontos = 0;
    
    // Valor similar (até 5% de diferença = 50 pontos)
    const diferencaValor = Math.abs(item.valor - conta.valor) / conta.valor;
    if (diferencaValor <= 0.01) pontos += 50;
    else if (diferencaValor <= 0.05) pontos += 40;
    else if (diferencaValor <= 0.10) pontos += 20;
    
    // Data próxima (até 3 dias = 30 pontos)
    const dataItem = new Date(item.data);
    const dataVenc = new Date(conta.dataVencimento);
    const diasDiferenca = Math.abs((dataItem.getTime() - dataVenc.getTime()) / (1000 * 60 * 60 * 24));
    if (diasDiferenca <= 1) pontos += 30;
    else if (diasDiferenca <= 3) pontos += 20;
    else if (diasDiferenca <= 7) pontos += 10;
    
    // Descrição similar (20 pontos)
    const descricaoItem = item.descricao.toLowerCase();
    const descricaoConta = conta.descricao.toLowerCase();
    const clienteFornecedor = conta.cliente_fornecedor.toLowerCase();
    
    if (descricaoItem.includes(clienteFornecedor) || clienteFornecedor.includes(descricaoItem.split(' ')[0])) {
      pontos += 20;
    } else if (descricaoItem.split(' ').some(palavra => 
      palavra.length > 3 && (descricaoConta.includes(palavra) || clienteFornecedor.includes(palavra))
    )) {
      pontos += 10;
    }

    return Math.min(100, pontos);
  };

  // Gerar motivo da sugestão
  const gerarMotivoSugestao = (item: ItemExtratoBanco, conta: ContaParaVincular, similaridade: number): string => {
    const motivos: string[] = [];
    
    const diferencaValor = Math.abs(item.valor - conta.valor);
    if (diferencaValor < 0.01) {
      motivos.push('Valor exato');
    } else if (diferencaValor / conta.valor <= 0.05) {
      motivos.push('Valor próximo');
    }
    
    const diasDiferenca = Math.abs(
      (new Date(item.data).getTime() - new Date(conta.dataVencimento).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diasDiferenca <= 1) {
      motivos.push('Data coincide');
    } else if (diasDiferenca <= 3) {
      motivos.push('Data próxima');
    }

    return motivos.join(' • ') || `Similaridade ${similaridade}%`;
  };

  // Vincular item do extrato a uma conta
  const vincularItem = useCallback((
    extratoId: string, 
    contaId: string, 
    contaTipo: 'receber' | 'pagar',
    corrigirValor?: boolean,
    valorExtrato?: number
  ) => {
    const novosVinculos = new Map(vinculos);
    novosVinculos.set(extratoId, {
      extratoId,
      contaId,
      contaTipo,
      similaridade: 100,
      autoSugerido: false,
      corrigirValor,
      valorExtrato
    });
    setVinculos(novosVinculos);

    // Marcar item como vinculado
    setItensExtrato(prev => prev.map(item => 
      item.id === extratoId ? { ...item, vinculado: true, contaVinculadaId: contaId, contaVinculadaTipo: contaTipo } : item
    ));
  }, [vinculos]);

  // Desvincular item
  const desvincularItem = useCallback((extratoId: string) => {
    const novosVinculos = new Map(vinculos);
    novosVinculos.delete(extratoId);
    setVinculos(novosVinculos);

    setItensExtrato(prev => prev.map(item => 
      item.id === extratoId ? { ...item, vinculado: false, contaVinculadaId: undefined, contaVinculadaTipo: undefined } : item
    ));
  }, [vinculos]);

  // Ignorar item do extrato
  const ignorarItem = useCallback((extratoId: string) => {
    setItensExtrato(prev => prev.map(item => 
      item.id === extratoId ? { ...item, ignorado: true, vinculado: false } : item
    ));
    
    // Remover sugestões relacionadas
    setSugestoes(prev => prev.filter(s => s.extratoItem.id !== extratoId));
  }, []);

  // Restaurar item ignorado
  const restaurarItem = useCallback((extratoId: string) => {
    setItensExtrato(prev => prev.map(item => 
      item.id === extratoId ? { ...item, ignorado: false } : item
    ));
  }, []);

  // Criar conta a partir do extrato (com suporte a recorrência)
  const criarContaDoExtrato = useCallback(async (
    itemExtrato: ItemExtratoBanco,
    dadosConta: {
      clienteFornecedor: string;
      fornecedorClienteId?: string;
      descricao: string;
      categoriaId?: string;
      subcategoriaId?: string;
      marcarComoBaixado: boolean;
      tipoLancamento: 'unico' | 'recorrente';
      frequenciaRecorrencia?: 'mensal' | 'semanal' | 'quinzenal';
      quantidadeParcelas?: number;
    }
  ): Promise<boolean> => {
    setLoading(true);
    try {
      // Verificar se já existe conta similar para evitar duplicação
      const campoNome = itemExtrato.tipo === 'entrada' ? 'cliente_nome' : 'fornecedor_nome';
      
      let contasExistentes: { id: string }[] | null = null;
      if (itemExtrato.tipo === 'entrada') {
        const { data } = await supabase
          .from('contas_receber')
          .select('id')
          .eq('cliente_nome', dadosConta.clienteFornecedor)
          .eq('valor_original', itemExtrato.valor)
          .eq('data_vencimento', itemExtrato.data)
          .limit(1);
        contasExistentes = data;
      } else {
        const { data } = await supabase
          .from('contas_pagar')
          .select('id')
          .eq('fornecedor_nome', dadosConta.clienteFornecedor)
          .eq('valor_original', itemExtrato.valor)
          .eq('data_vencimento', itemExtrato.data)
          .limit(1);
        contasExistentes = data;
      }

      if (contasExistentes && contasExistentes.length > 0) {
        toast({
          title: "Conta já existe",
          description: "Já existe uma conta com os mesmos dados. Use 'Vincular' para associá-la.",
          variant: "destructive"
        });
        setLoading(false);
        return false;
      }
      const isRecorrente = dadosConta.tipoLancamento === 'recorrente';
      const qtdParcelas = isRecorrente ? (dadosConta.quantidadeParcelas || 2) : 1;

      // Função para calcular a data da parcela
      const calcularDataParcela = (dataBase: Date, indice: number): string => {
        let dataParcela = new Date(dataBase);
        if (dadosConta.frequenciaRecorrencia === 'mensal') {
          dataParcela.setMonth(dataParcela.getMonth() + indice);
        } else if (dadosConta.frequenciaRecorrencia === 'quinzenal') {
          dataParcela.setDate(dataParcela.getDate() + (indice * 14));
        } else { // semanal
          dataParcela.setDate(dataParcela.getDate() + (indice * 7));
        }
        return dataParcela.toISOString().split('T')[0];
      };

      const dataBase = new Date(itemExtrato.data);
      const contasCriadas: any[] = [];

      for (let i = 0; i < qtdParcelas; i++) {
        const dataParcela = isRecorrente ? calcularDataParcela(dataBase, i) : itemExtrato.data;
        const isPrimeiraParcela = i === 0;
        const deveBaixar = dadosConta.marcarComoBaixado && isPrimeiraParcela;
        const descricaoParcela = isRecorrente 
          ? `${dadosConta.descricao} (${i + 1}/${qtdParcelas})`
          : dadosConta.descricao;

        if (itemExtrato.tipo === 'entrada') {
          contasCriadas.push({
            descricao: descricaoParcela,
            valor_original: itemExtrato.valor,
            data_vencimento: dataParcela,
            cliente_nome: dadosConta.clienteFornecedor,
            fornecedor_cliente_id: dadosConta.fornecedorClienteId || null,
            categoria_id: dadosConta.categoriaId || null,
            subcategoria_id: dadosConta.subcategoriaId || null,
            status: deveBaixar ? 'recebido' : 'pendente',
            is_recorrente: isRecorrente,
            frequencia_recorrencia: isRecorrente ? dadosConta.frequenciaRecorrencia : null,
            quantidade_parcelas: isRecorrente ? qtdParcelas : null,
            ...(deveBaixar && {
              data_recebimento: dataParcela,
              valor_recebido: itemExtrato.valor,
              conta_bancaria_id: contaBancariaId
            })
          });
        } else {
          contasCriadas.push({
            descricao: descricaoParcela,
            valor_original: itemExtrato.valor,
            data_vencimento: dataParcela,
            fornecedor_nome: dadosConta.clienteFornecedor,
            fornecedor_cliente_id: dadosConta.fornecedorClienteId || null,
            categoria_id: dadosConta.categoriaId || null,
            subcategoria_id: dadosConta.subcategoriaId || null,
            status: deveBaixar ? 'pago' : 'pendente',
            is_recorrente: isRecorrente,
            frequencia_recorrencia: isRecorrente ? dadosConta.frequenciaRecorrencia : null,
            quantidade_parcelas: isRecorrente ? qtdParcelas : null,
            ...(deveBaixar && {
              data_pagamento: dataParcela,
              valor_pago: itemExtrato.valor,
              conta_bancaria_id: contaBancariaId
            })
          });
        }
      }

      // Inserir todas as contas
      const tabela = itemExtrato.tipo === 'entrada' ? 'contas_receber' : 'contas_pagar';
      const { data: contasInseridas, error } = await supabase
        .from(tabela)
        .insert(contasCriadas)
        .select('id');

      if (error) throw error;

      // Criar transação financeira para a primeira parcela baixada (aciona o trigger de movimentação bancária)
      if (dadosConta.marcarComoBaixado && contasInseridas && contasInseridas.length > 0) {
        const primeiraContaId = contasInseridas[0].id;
        
        const transacao = {
          tipo: itemExtrato.tipo === 'entrada' ? 'recebimento' : 'pagamento',
          ...(itemExtrato.tipo === 'entrada' 
            ? { conta_receber_id: primeiraContaId }
            : { conta_pagar_id: primeiraContaId }
          ),
          valor: itemExtrato.valor,
          data_transacao: itemExtrato.data,
          conta_bancaria_id: contaBancariaId
        };
        
        const { error: transacaoError } = await supabase
          .from('transacoes_financeiras')
          .insert([transacao]);
          
        if (transacaoError) {
          console.error('Erro ao criar transação financeira:', transacaoError);
        }
      }

      // Marcar item como vinculado
      setItensExtrato(prev => prev.map(item => 
        item.id === itemExtrato.id ? { ...item, vinculado: true } : item
      ));

      toast({
        title: isRecorrente ? "Contas criadas" : "Conta criada",
        description: isRecorrente
          ? `${qtdParcelas} parcelas criadas com sucesso`
          : (dadosConta.marcarComoBaixado 
              ? "Conta criada e baixada com sucesso" 
              : "Conta criada com sucesso")
      });

      return true;
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar conta",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [contaBancariaId, toast]);

  // Aceitar sugestão
  const aceitarSugestao = useCallback((sugestao: SugestaoVinculo) => {
    vincularItem(sugestao.extratoItem.id, sugestao.conta.id, sugestao.conta.tipo);
    
    // Remover sugestão da lista
    setSugestoes(prev => prev.filter(s => 
      s.extratoItem.id !== sugestao.extratoItem.id || s.conta.id !== sugestao.conta.id
    ));
  }, [vincularItem]);

  // Conciliar todos os itens vinculados
  const conciliarVinculados = useCallback(async (): Promise<boolean> => {
    if (vinculos.size === 0) {
      toast({
        title: "Nenhum item vinculado",
        description: "Vincule itens do extrato às contas antes de conciliar",
        variant: "destructive"
      });
      return false;
    }

    setLoading(true);
    let sucesso = 0;
    let erros = 0;

    try {
      for (const [extratoId, vinculo] of vinculos) {
        const itemExtrato = itensExtrato.find(i => i.id === extratoId);
        if (!itemExtrato) continue;

        const dataTransacao = itemExtrato.data;
        
        if (vinculo.contaTipo === 'receber') {
          // Se precisa corrigir o valor, atualiza primeiro
          if (vinculo.corrigirValor && vinculo.valorExtrato) {
            await supabase
              .from('contas_receber')
              .update({ valor_original: vinculo.valorExtrato })
              .eq('id', vinculo.contaId);
          }

          const resultado = await receberConta(
            vinculo.contaId,
            itemExtrato.valor,
            dataTransacao,
            undefined,
            contaBancariaId
          );
          if (resultado) sucesso++;
          else erros++;
        } else {
          // Se precisa corrigir o valor, atualiza primeiro
          if (vinculo.corrigirValor && vinculo.valorExtrato) {
            await supabase
              .from('contas_pagar')
              .update({ valor_original: vinculo.valorExtrato })
              .eq('id', vinculo.contaId);
          }

          const resultado = await pagarConta(
            vinculo.contaId,
            itemExtrato.valor,
            dataTransacao,
            undefined,
            contaBancariaId
          );
          if (resultado) sucesso++;
          else erros++;
        }
      }

      if (sucesso > 0) {
        toast({
          title: "Conciliação realizada",
          description: `${sucesso} contas baixadas com sucesso${erros > 0 ? `, ${erros} erros` : ''}`
        });
        
        // Limpar vinculos processados
        setVinculos(new Map());
        setItensExtrato(prev => prev.map(item => ({
          ...item,
          vinculado: false,
          contaVinculadaId: undefined,
          contaVinculadaTipo: undefined
        })));
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro na conciliação:', error);
      toast({
        title: "Erro",
        description: "Falha ao processar conciliação",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [vinculos, itensExtrato, contaBancariaId, receberConta, pagarConta, toast]);

  // Calcular resumo
  const calcularResumo = useCallback((): ResumoConciliacao => {
    const contasVinculadasIds = new Set(
      Array.from(vinculos.values()).map(v => v.contaId)
    );
    const itensAtivos = itensExtrato.filter(i => !i.ignorado);

    return {
      totalItensExtrato: itensAtivos.length,
      itensVinculados: vinculos.size + itensExtrato.filter(i => i.vinculado && !vinculos.has(i.id)).length,
      itensSemCorrespondencia: itensAtivos.filter(i => !i.vinculado).length,
      contasSemMovimentacao: contasDisponiveis.filter(c => !contasVinculadasIds.has(c.id)).length,
      totalCreditos: itensAtivos.filter(i => i.tipo === 'entrada').reduce((sum, i) => sum + i.valor, 0),
      totalDebitos: itensAtivos.filter(i => i.tipo === 'saida').reduce((sum, i) => sum + i.valor, 0)
    };
  }, [itensExtrato, vinculos, contasDisponiveis]);

  // Limpar tudo
  const limpar = useCallback(() => {
    setItensExtrato([]);
    setContasDisponiveis([]);
    setVinculos(new Map());
    setSugestoes([]);
  }, []);

  return {
    loading,
    itensExtrato,
    contasDisponiveis,
    vinculos,
    sugestoes,
    importarExtrato,
    vincularItem,
    desvincularItem,
    aceitarSugestao,
    conciliarVinculados,
    calcularResumo,
    limpar,
    carregarContasPendentes,
    ignorarItem,
    restaurarItem,
    criarContaDoExtrato
  };
};
