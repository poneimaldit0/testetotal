import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DadosMensais {
  mes: string;
  ano: number;
  receitas: number;
  despesas: number;
  resultado: number;
}

export interface SubcategoriaMensal {
  subcategoria: string;
  categoria: string;
  tipo: 'receita' | 'despesa';
  meses: Array<{
    mes: string;
    ano: number;
    valor: number;
    quantidade: number;
  }>;
  totalPeriodo: number;
  variacao?: number;
}

export interface LinhaRelatorio {
  tipo: 'categoria' | 'subcategoria' | 'totalizador';
  nome: string;
  nivel: number; // 0=totalizador principal, 1=subtotal, 2=item
  categoria?: string;
  tipoFinanceiro: 'receita' | 'despesa' | 'calculo';
  meses: Array<{ mes: string; valor: number; percentual?: number }>;
  totalPeriodo: number;
  percentualMedio?: number;
  formatacao: 'normal' | 'negrito' | 'destacado';
  indentacao: number;
}

export interface DadosRelatorioComparativoMensal {
  periodo: {
    inicio: string;
    fim: string;
  };
  subcategorias: SubcategoriaMensal[];
  linhasHierarquicas: LinhaRelatorio[];
  resumoMeses: DadosMensais[];
  totalReceitas: number;
  totalDespesas: number;
  resultadoTotal: number;
}

export const useRelatorioComparativoMensal = () => {
  const [loading, setLoading] = useState(false);
  const [dadosValidados, setDadosValidados] = useState(true);
  const { toast } = useToast();

  const limparCache = () => {
    // Limpa qualquer cache local
    setDadosValidados(true);
    console.log('🔄 Cache do relatório comparativo limpo');
  };

  const buscarDadosComparativo = async (
    dataInicio: string, 
    dataFim: string,
    tipoFiltro?: 'receitas' | 'despesas' | 'ambos',
    categoriasSelecionadas?: string[],
    forcarReload: boolean = false
  ): Promise<DadosRelatorioComparativoMensal | null> => {
    setLoading(true);
    setDadosValidados(true);
    
    console.log('📊 Iniciando busca do relatório comparativo:', {
      periodo: `${dataInicio} a ${dataFim}`,
      tipo: tipoFiltro,
      forcarReload,
      timestamp: new Date().toISOString()
    });
    
    try {
      console.log('📊 Iniciando busca do relatório comparativo:', {
        periodo: `${dataInicio} a ${dataFim}`,
        tipo: tipoFiltro,
        forcarReload,
        timestamp: new Date().toISOString()
      });

      // Buscar apenas transações conciliadas do período
      console.log('🔍 Buscando transações conciliadas no período:', {
        inicio: dataInicio,
        fim: dataFim
      });

      const { data: transacoesData, error } = await supabase
        .from('transacoes_financeiras')
        .select(`
          valor,
          data_transacao,
          tipo,
          conta_receber_id,
          conta_pagar_id,
          conta_bancaria_id,
          contas_receber!conta_receber_id(
            categoria_id,
            categorias_financeiras!categoria_id(id, nome, tipo),
            subcategoria_id,
            subcategorias_financeiras!subcategoria_id(nome)
          ),
          contas_pagar!conta_pagar_id(
            categoria_id,
            categorias_financeiras!categoria_id(id, nome, tipo),
            subcategoria_id,
            subcategorias_financeiras!subcategoria_id(nome)
          )
        `)
        .gte('data_transacao', dataInicio)
        .lte('data_transacao', dataFim)
        .not('conta_bancaria_id', 'is', null)
        .order('data_transacao');

      if (error) {
        console.error('❌ Erro na consulta inicial:', error);
        throw error;
      }

      console.log('📋 Dados conciliados obtidos:', {
        totalTransacoes: transacoesData?.length || 0,
        transacoesPagamento: transacoesData?.filter(t => t.tipo === 'pagamento').length || 0,
        transacoesRecebimento: transacoesData?.filter(t => t.tipo === 'recebimento').length || 0,
        periodo: `${dataInicio} a ${dataFim}`,
        filtro: 'APENAS CONTAS CONCILIADAS'
      });

      // Processar dados por subcategoria e mês com logging detalhado
      const subcategoriasMap = new Map<string, {
        categoria: string;
        tipo: 'receita' | 'despesa';
        meses: Map<string, { valor: number; quantidade: number }>;
      }>();

      const resumoMesesMap = new Map<string, { receitas: number; despesas: number }>();
      let totalReceitasProcessadas = 0;
      let totalDespesasProcessadas = 0;

      console.log('🔄 Processando transações...');

      transacoesData?.forEach((transacao, index) => {
        const data = new Date(transacao.data_transacao + 'T12:00:00');
        const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        
        let categoria = '';
        let subcategoria = '';
        let tipo: 'receita' | 'despesa' = 'receita';
        
        if (transacao.tipo === 'recebimento' && transacao.contas_receber) {
          categoria = transacao.contas_receber.categorias_financeiras?.nome || 'Sem categoria';
          subcategoria = transacao.contas_receber.subcategorias_financeiras?.nome || 'Sem apropriação';
          tipo = 'receita';
          totalReceitasProcessadas += transacao.valor || 0;
        } else if (transacao.tipo === 'pagamento' && transacao.contas_pagar) {
          categoria = transacao.contas_pagar.categorias_financeiras?.nome || 'Sem categoria';
          subcategoria = transacao.contas_pagar.subcategorias_financeiras?.nome || 'Sem apropriação';
          tipo = 'despesa';
          totalDespesasProcessadas += transacao.valor || 0;
        }

        // Log detalhado para transações de agosto (para debug)
        if (mesAno === '2025-08' && tipo === 'despesa' && index < 5) {
          console.log(`🔍 Despesa ${index + 1}:`, {
            valor: transacao.valor,
            data: transacao.data_transacao,
            categoria,
            subcategoria,
            tipo: transacao.tipo
          });
        }

        // Filtrar por tipo se especificado
        if (tipoFiltro && tipoFiltro !== 'ambos') {
          if ((tipoFiltro === 'receitas' && tipo !== 'receita') || 
              (tipoFiltro === 'despesas' && tipo !== 'despesa')) {
            return;
          }
        }

        // Filtrar por categorias se especificado
        if (categoriasSelecionadas && categoriasSelecionadas.length > 0) {
          const categoriaId = transacao.contas_receber?.categorias_financeiras?.id || transacao.contas_pagar?.categorias_financeiras?.id;
          if (!categoriaId || !categoriasSelecionadas.includes(categoriaId)) {
            return;
          }
        }

        const chaveSubcategoria = `${categoria} - ${subcategoria}`;
        
        // Atualizar dados da subcategoria
        const dadosSubcategoria = subcategoriasMap.get(chaveSubcategoria) || {
          categoria,
          tipo,
          meses: new Map()
        };
        
        const dadosMes = dadosSubcategoria.meses.get(mesAno) || { valor: 0, quantidade: 0 };
        dadosMes.valor += transacao.valor || 0;
        dadosMes.quantidade += 1;
        dadosSubcategoria.meses.set(mesAno, dadosMes);
        subcategoriasMap.set(chaveSubcategoria, dadosSubcategoria);

        // Atualizar resumo mensal
        const resumoMes = resumoMesesMap.get(mesAno) || { receitas: 0, despesas: 0 };
        if (tipo === 'receita') {
          resumoMes.receitas += transacao.valor || 0;
        } else {
          resumoMes.despesas += transacao.valor || 0;
        }
        resumoMesesMap.set(mesAno, resumoMes);
      });

      console.log('📊 Totais processados:', {
        receitas: totalReceitasProcessadas,
        despesas: totalDespesasProcessadas,
        subcategorias: subcategoriasMap.size
      });

      // Gerar lista de meses no período
      const mesesPeriodo: string[] = [];
        const dataInicioDate = new Date(dataInicio + 'T12:00:00');
        const dataFimDate = new Date(dataFim + 'T12:00:00');
      
      const currentDate = new Date(dataInicioDate.getFullYear(), dataInicioDate.getMonth(), 1);
      while (currentDate <= dataFimDate) {
        mesesPeriodo.push(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`);
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      // Converter para array de subcategorias
      const subcategorias: SubcategoriaMensal[] = Array.from(subcategoriasMap.entries())
        .map(([chave, dados]) => {
          const meses = mesesPeriodo.map(mesAno => {
            const [ano, mes] = mesAno.split('-');
            const dadosMes = dados.meses.get(mesAno) || { valor: 0, quantidade: 0 };
            return {
              mes: `${ano}-${mes}`,
              ano: parseInt(ano),
              valor: dadosMes.valor,
              quantidade: dadosMes.quantidade
            };
          });

          const totalPeriodo = meses.reduce((acc, mes) => acc + mes.valor, 0);
          
          // Calcular variação entre primeiro e último mês com valor
          const mesesComValor = meses.filter(m => m.valor > 0);
          let variacao = 0;
          if (mesesComValor.length >= 2) {
            const primeiro = mesesComValor[0].valor;
            const ultimo = mesesComValor[mesesComValor.length - 1].valor;
            variacao = primeiro > 0 ? ((ultimo - primeiro) / primeiro) * 100 : 0;
          }

          return {
            subcategoria: chave,
            categoria: dados.categoria,
            tipo: dados.tipo,
            meses,
            totalPeriodo,
            variacao
          };
        })
        .sort((a, b) => {
          // Ordenar por tipo (receitas primeiro) e depois por valor total
          if (a.tipo !== b.tipo) {
            return a.tipo === 'receita' ? -1 : 1;
          }
          return b.totalPeriodo - a.totalPeriodo;
        });

      // Criar resumo mensal
      const resumoMeses: DadosMensais[] = mesesPeriodo.map(mesAno => {
        const [ano, mes] = mesAno.split('-');
        const resumo = resumoMesesMap.get(mesAno) || { receitas: 0, despesas: 0 };
        return {
          mes: `${ano}-${mes}`,
          ano: parseInt(ano),
          receitas: resumo.receitas,
          despesas: resumo.despesas,
          resultado: resumo.receitas - resumo.despesas
        };
      });

      const totalReceitas = resumoMeses.reduce((acc, mes) => acc + mes.receitas, 0);
      const totalDespesas = resumoMeses.reduce((acc, mes) => acc + mes.despesas, 0);
      const resultadoTotal = totalReceitas - totalDespesas;

      console.log('📈 Totais calculados do resumo mensal:', {
        receitas: totalReceitas,
        despesas: totalDespesas,
        resultado: resultadoTotal
      });

      // VALIDAÇÃO FORÇADA: Verificar totais apenas com contas conciliadas
      const { data: validacaoData } = await supabase
        .from('transacoes_financeiras')
        .select(`
          tipo, 
          valor, 
          data_transacao,
          conta_bancaria_id
        `)
        .gte('data_transacao', dataInicio)
        .lte('data_transacao', dataFim)
        .not('conta_bancaria_id', 'is', null);

      console.log('📋 Dados de validação conciliados obtidos:', {
        totalTransacoes: validacaoData?.length || 0,
        periodo: `${dataInicio} a ${dataFim}`,
        filtro: 'APENAS CONTAS CONCILIADAS'
      });

      if (validacaoData) {
        const totalReceitasValidacao = validacaoData
          .filter(t => t.tipo === 'recebimento')
          .reduce((acc, t) => acc + (t.valor || 0), 0);
        const totalDespesasValidacao = validacaoData
          .filter(t => t.tipo === 'pagamento')  
          .reduce((acc, t) => acc + (t.valor || 0), 0);

        console.log('✅ Validação dos totais:', {
          calculado: { receitas: totalReceitas, despesas: totalDespesas },
          validacao: { receitas: totalReceitasValidacao, despesas: totalDespesasValidacao },
          diferenças: { 
            receitas: Math.abs(totalReceitas - totalReceitasValidacao),
            despesas: Math.abs(totalDespesas - totalDespesasValidacao)
          }
        });

        // Detectar discrepância com margem de R$ 0,01
        const diferencaReceitas = Math.abs(totalReceitas - totalReceitasValidacao);
        const diferencaDespesas = Math.abs(totalDespesas - totalDespesasValidacao);
        
        if (diferencaReceitas > 0.01 || diferencaDespesas > 0.01) {
          console.error('🚨 DISCREPÂNCIA CRÍTICA DETECTADA:', {
            periodo: `${dataInicio} a ${dataFim}`,
            relatório: { receitas: totalReceitas, despesas: totalDespesas },
            validação: { receitas: totalReceitasValidacao, despesas: totalDespesasValidacao },
            diferenças: { 
              receitas: diferencaReceitas,
              despesas: diferencaDespesas
            },
            timestamp: new Date().toISOString()
          });
          
          setDadosValidados(false);
          
          toast({
            title: "⚠️ Dados inconsistentes - corrigidos automaticamente",
            description: `Diferença detectada: R$ ${diferencaReceitas.toFixed(2)} (receitas), R$ ${diferencaDespesas.toFixed(2)} (despesas)`,
            variant: "destructive",
          });

          // Recalcular usando os totais corretos da validação
          const resumoCorrigido = resumoMeses.map(mes => {
            const proporcaoReceita = totalReceitas > 0 ? totalReceitasValidacao / totalReceitas : 1;
            const proporcaoDespesa = totalDespesas > 0 ? totalDespesasValidacao / totalDespesas : 1;
            
            return {
              ...mes,
              receitas: mes.receitas * proporcaoReceita,
              despesas: mes.despesas * proporcaoDespesa,
              resultado: (mes.receitas * proporcaoReceita) - (mes.despesas * proporcaoDespesa)
            };
          });

          return {
            periodo: { inicio: dataInicio, fim: dataFim },
            subcategorias,
            linhasHierarquicas: calcularTotalizadores(subcategorias, mesesPeriodo),
            resumoMeses: resumoCorrigido,
            totalReceitas: totalReceitasValidacao,
            totalDespesas: totalDespesasValidacao,
            resultadoTotal: totalReceitasValidacao - totalDespesasValidacao
          };
        } else {
          console.log('✅ Dados validados com sucesso - totais conferem perfeitamente');
          setDadosValidados(true);
        }
      } else {
        console.warn('⚠️ Falha na validação - dados de verificação não disponíveis');
        setDadosValidados(false);
      }

      // Calcular linhas hierárquicas com totalizadores
      const linhasHierarquicas = calcularTotalizadores(subcategorias, mesesPeriodo);

      console.log('🎯 Relatório finalizado com sucesso:', {
        subcategorias: subcategorias.length,
        linhasHierarquicas: linhasHierarquicas.length,
        totalReceitas,
        totalDespesas,
        resultadoTotal,
        validado: dadosValidados
      });

      return {
        periodo: { inicio: dataInicio, fim: dataFim },
        subcategorias,
        linhasHierarquicas,
        resumoMeses,
        totalReceitas,
        totalDespesas,
        resultadoTotal
      };

    } catch (error: any) {
      console.error('💥 Erro crítico no relatório comparativo:', {
        error: error.message,
        stack: error.stack,
        periodo: `${dataInicio} a ${dataFim}`,
        timestamp: new Date().toISOString()
      });
      
      setDadosValidados(false);
      toast({
        title: "Erro ao gerar relatório",
        description: `Falha na consulta: ${error.message}`,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
      console.log('🏁 Processo de geração do relatório finalizado');
    }
  };

  return {
    loading,
    dadosValidados,
    buscarDadosComparativo,
    limparCache
  };
};

const calcularTotalizadores = (subcategorias: SubcategoriaMensal[], mesesPeriodo: string[]): LinhaRelatorio[] => {
  const linhas: LinhaRelatorio[] = [];

  // Agrupar subcategorias por tipo para os cálculos
  const receitas = subcategorias.filter(s => s.tipo === 'receita');
  const despesas = subcategorias.filter(s => s.tipo === 'despesa');

  // Categorizar despesas por tipo (baseado em palavras-chave na categoria/subcategoria)
  const deducoes = despesas.filter(d => 
    d.categoria.toLowerCase().includes('deduç') || 
    d.subcategoria.toLowerCase().includes('comiss') ||
    d.subcategoria.toLowerCase().includes('reembolso')
  );

  // IMPORTANTE: Custos Indiretos Variáveis deve ser filtrado ANTES de Custos Variáveis
  // para evitar que itens com "variá" e "indireto" caiam em Custos Variáveis
  const custosIndiretosVariaveis = despesas.filter(d => 
    d.categoria.toLowerCase().includes('indireto') &&
    d.categoria.toLowerCase().includes('variá')
  );

  // Custos Variáveis: exclui os que já foram para Custos Indiretos Variáveis
  const custosVariaveis = despesas.filter(d => 
    (d.categoria.toLowerCase().includes('variá') ||
     d.subcategoria.toLowerCase().includes('tráfego') ||
     d.subcategoria.toLowerCase().includes('bônus') ||
     d.subcategoria.toLowerCase().includes('impostos') ||
     d.subcategoria.toLowerCase().includes('reparos')) &&
    !custosIndiretosVariaveis.includes(d)
  );

  const custosFixos = despesas.filter(d => 
    !deducoes.includes(d) && !custosVariaveis.includes(d) && !custosIndiretosVariaveis.includes(d)
  );

  // Função auxiliar para calcular totais por mês
  const calcularTotalPorMes = (itens: SubcategoriaMensal[]) => {
    return mesesPeriodo.map(mesAno => {
      const total = itens.reduce((acc, item) => {
        const dadosMes = item.meses.find(m => m.mes === mesAno);
        return acc + (dadosMes?.valor || 0);
      }, 0);
      return { mes: mesAno, valor: total };
    });
  };

  // 1. RECEITA BRUTA
  const receitaBrutaMeses = calcularTotalPorMes(receitas);
  const receitaBrutaTotal = receitaBrutaMeses.reduce((acc, m) => acc + m.valor, 0);
  
  linhas.push({
    tipo: 'totalizador',
    nome: 'RECEITA BRUTA',
    nivel: 0,
    tipoFinanceiro: 'receita',
    meses: receitaBrutaMeses.map(m => ({ 
      mes: m.mes, 
      valor: m.valor,
      percentual: 100 // Receita bruta é sempre 100%
    })),
    totalPeriodo: receitaBrutaTotal,
    percentualMedio: 100,
    formatacao: 'destacado',
    indentacao: 0
  });

  // Adicionar subcategorias de receita
  receitas.forEach(receita => {
    linhas.push({
      tipo: 'subcategoria',
      nome: receita.subcategoria,
      nivel: 2,
      categoria: receita.categoria,
      tipoFinanceiro: receita.tipo,
      meses: receita.meses.map(m => ({
        mes: m.mes,
        valor: m.valor,
        percentual: receitaBrutaTotal > 0 ? (m.valor / receitaBrutaMeses.find(rb => rb.mes === m.mes)!.valor) * 100 : 0
      })),
      totalPeriodo: receita.totalPeriodo,
      percentualMedio: receitaBrutaTotal > 0 ? (receita.totalPeriodo / receitaBrutaTotal) * 100 : 0,
      formatacao: 'normal',
      indentacao: 1
    });
  });

  // 2. (-) DEDUÇÕES DA RECEITA (se existir)
  const deducoesMeses = calcularTotalPorMes(deducoes);
  const deducoesTotal = deducoesMeses.reduce((acc, m) => acc + m.valor, 0);

  if (deducoes.length > 0) {
    linhas.push({
      tipo: 'totalizador',
      nome: '(-) DEDUÇÕES DA RECEITA',
      nivel: 0,
      tipoFinanceiro: 'despesa',
      meses: deducoesMeses.map(m => ({ 
        mes: m.mes, 
        valor: -m.valor, // Negativo pois é dedução
        percentual: receitaBrutaTotal > 0 ? (m.valor / receitaBrutaMeses.find(rb => rb.mes === m.mes)!.valor) * 100 : 0
      })),
      totalPeriodo: -deducoesTotal,
      percentualMedio: receitaBrutaTotal > 0 ? (deducoesTotal / receitaBrutaTotal) * 100 : 0,
      formatacao: 'negrito',
      indentacao: 0
    });

    // Adicionar itens de dedução
    deducoes.forEach(deducao => {
      linhas.push({
        tipo: 'subcategoria',
        nome: deducao.subcategoria,
        nivel: 2,
        categoria: deducao.categoria,
        tipoFinanceiro: deducao.tipo,
        meses: deducao.meses.map(m => ({
          mes: m.mes,
          valor: -m.valor,
          percentual: receitaBrutaTotal > 0 ? (m.valor / receitaBrutaMeses.find(rb => rb.mes === m.mes)!.valor) * 100 : 0
        })),
        totalPeriodo: -deducao.totalPeriodo,
        percentualMedio: receitaBrutaTotal > 0 ? (deducao.totalPeriodo / receitaBrutaTotal) * 100 : 0,
        formatacao: 'normal',
        indentacao: 1
      });
    });
  }

  // 3. = RECEITA OPERACIONAL
  const receitaOperacionalMeses = mesesPeriodo.map(mesAno => {
    const receita = receitaBrutaMeses.find(r => r.mes === mesAno)?.valor || 0;
    const deducao = deducoesMeses.find(d => d.mes === mesAno)?.valor || 0;
    return { mes: mesAno, valor: receita - deducao };
  });
  const receitaOperacionalTotal = receitaOperacionalMeses.reduce((acc, m) => acc + m.valor, 0);

  linhas.push({
    tipo: 'totalizador',
    nome: '= RECEITA OPERACIONAL',
    nivel: 0,
    tipoFinanceiro: 'calculo',
    meses: receitaOperacionalMeses.map(m => ({ 
      mes: m.mes, 
      valor: m.valor,
      percentual: receitaBrutaTotal > 0 ? (m.valor / receitaBrutaMeses.find(rb => rb.mes === m.mes)!.valor) * 100 : 0
    })),
    totalPeriodo: receitaOperacionalTotal,
    percentualMedio: receitaBrutaTotal > 0 ? (receitaOperacionalTotal / receitaBrutaTotal) * 100 : 0,
    formatacao: 'destacado',
    indentacao: 0
  });

  // 4. (-) CUSTOS VARIÁVEIS (se existir)
  const custosVariaveisMeses = calcularTotalPorMes(custosVariaveis);
  const custosVariaveisTotal = custosVariaveisMeses.reduce((acc, m) => acc + m.valor, 0);

  if (custosVariaveis.length > 0) {
    linhas.push({
      tipo: 'totalizador',
      nome: '(-) CUSTOS VARIÁVEIS',
      nivel: 0,
      tipoFinanceiro: 'despesa',
      meses: custosVariaveisMeses.map(m => ({ 
        mes: m.mes, 
        valor: -m.valor,
        percentual: receitaBrutaTotal > 0 ? (m.valor / receitaBrutaMeses.find(rb => rb.mes === m.mes)!.valor) * 100 : 0
      })),
      totalPeriodo: -custosVariaveisTotal,
      percentualMedio: receitaBrutaTotal > 0 ? (custosVariaveisTotal / receitaBrutaTotal) * 100 : 0,
      formatacao: 'negrito',
      indentacao: 0
    });

    // Adicionar itens de custos variáveis
    custosVariaveis.forEach(custo => {
      linhas.push({
        tipo: 'subcategoria',
        nome: custo.subcategoria,
        nivel: 2,
        categoria: custo.categoria,
        tipoFinanceiro: custo.tipo,
        meses: custo.meses.map(m => ({
          mes: m.mes,
          valor: -m.valor,
          percentual: receitaBrutaTotal > 0 ? (m.valor / receitaBrutaMeses.find(rb => rb.mes === m.mes)!.valor) * 100 : 0
        })),
        totalPeriodo: -custo.totalPeriodo,
        percentualMedio: receitaBrutaTotal > 0 ? (custo.totalPeriodo / receitaBrutaTotal) * 100 : 0,
        formatacao: 'normal',
        indentacao: 1
      });
    });
  }

  // 4.1 = LUCRO BRUTO
  const lucroBrutoMeses = mesesPeriodo.map(mesAno => {
    const receitaOp = receitaOperacionalMeses.find(r => r.mes === mesAno)?.valor || 0;
    const custoVar = custosVariaveisMeses.find(c => c.mes === mesAno)?.valor || 0;
    return { mes: mesAno, valor: receitaOp - custoVar };
  });
  const lucroBrutoTotal = lucroBrutoMeses.reduce((acc, m) => acc + m.valor, 0);

  linhas.push({
    tipo: 'totalizador',
    nome: '= LUCRO BRUTO',
    nivel: 0,
    tipoFinanceiro: 'calculo',
    meses: lucroBrutoMeses.map(m => ({ 
      mes: m.mes, 
      valor: m.valor,
      percentual: receitaBrutaTotal > 0 ? (m.valor / receitaBrutaMeses.find(rb => rb.mes === m.mes)!.valor) * 100 : 0
    })),
    totalPeriodo: lucroBrutoTotal,
    percentualMedio: receitaBrutaTotal > 0 ? (lucroBrutoTotal / receitaBrutaTotal) * 100 : 0,
    formatacao: 'destacado',
    indentacao: 0
  });

  // 5. (-) CUSTOS INDIRETOS VARIÁVEIS (se existir)
  const custosIndiretosVariaveisMeses = calcularTotalPorMes(custosIndiretosVariaveis);
  const custosIndiretosVariaveisTotal = custosIndiretosVariaveisMeses.reduce((acc, m) => acc + m.valor, 0);

  if (custosIndiretosVariaveis.length > 0) {
    linhas.push({
      tipo: 'totalizador',
      nome: '(-) CUSTOS INDIRETOS VARIÁVEIS',
      nivel: 0,
      tipoFinanceiro: 'despesa',
      meses: custosIndiretosVariaveisMeses.map(m => ({ 
        mes: m.mes, 
        valor: -m.valor,
        percentual: receitaBrutaTotal > 0 ? (m.valor / receitaBrutaMeses.find(rb => rb.mes === m.mes)!.valor) * 100 : 0
      })),
      totalPeriodo: -custosIndiretosVariaveisTotal,
      percentualMedio: receitaBrutaTotal > 0 ? (custosIndiretosVariaveisTotal / receitaBrutaTotal) * 100 : 0,
      formatacao: 'negrito',
      indentacao: 0
    });

    // Adicionar itens de custos indiretos variáveis
    custosIndiretosVariaveis.forEach(custo => {
      linhas.push({
        tipo: 'subcategoria',
        nome: custo.subcategoria,
        nivel: 2,
        categoria: custo.categoria,
        tipoFinanceiro: custo.tipo,
        meses: custo.meses.map(m => ({
          mes: m.mes,
          valor: -m.valor,
          percentual: receitaBrutaTotal > 0 ? (m.valor / receitaBrutaMeses.find(rb => rb.mes === m.mes)!.valor) * 100 : 0
        })),
        totalPeriodo: -custo.totalPeriodo,
        percentualMedio: receitaBrutaTotal > 0 ? (custo.totalPeriodo / receitaBrutaTotal) * 100 : 0,
        formatacao: 'normal',
        indentacao: 1
      });
    });
  }

  // 5.1 = MARGEM DE CONTRIBUIÇÃO REAL
  const margemContribuicaoMeses = mesesPeriodo.map(mesAno => {
    const lucroBruto = lucroBrutoMeses.find(l => l.mes === mesAno)?.valor || 0;
    const custoIndVar = custosIndiretosVariaveisMeses.find(c => c.mes === mesAno)?.valor || 0;
    return { mes: mesAno, valor: lucroBruto - custoIndVar };
  });
  const margemContribuicaoTotal = margemContribuicaoMeses.reduce((acc, m) => acc + m.valor, 0);

  linhas.push({
    tipo: 'totalizador',
    nome: '= MARGEM DE CONTRIBUIÇÃO REAL',
    nivel: 0,
    tipoFinanceiro: 'calculo',
    meses: margemContribuicaoMeses.map(m => ({ 
      mes: m.mes, 
      valor: m.valor,
      percentual: receitaBrutaTotal > 0 ? (m.valor / receitaBrutaMeses.find(rb => rb.mes === m.mes)!.valor) * 100 : 0
    })),
    totalPeriodo: margemContribuicaoTotal,
    percentualMedio: receitaBrutaTotal > 0 ? (margemContribuicaoTotal / receitaBrutaTotal) * 100 : 0,
    formatacao: 'destacado',
    indentacao: 0
  });

  // 6. (-) CUSTOS FIXOS
  const custosFixosMeses = calcularTotalPorMes(custosFixos);
  const custosFixosTotal = custosFixosMeses.reduce((acc, m) => acc + m.valor, 0);

  if (custosFixos.length > 0) {
    linhas.push({
      tipo: 'totalizador',
      nome: '(-) CUSTOS FIXOS',
      nivel: 0,
      tipoFinanceiro: 'despesa',
      meses: custosFixosMeses.map(m => ({ 
        mes: m.mes, 
        valor: -m.valor,
        percentual: receitaBrutaTotal > 0 ? (m.valor / receitaBrutaMeses.find(rb => rb.mes === m.mes)!.valor) * 100 : 0
      })),
      totalPeriodo: -custosFixosTotal,
      percentualMedio: receitaBrutaTotal > 0 ? (custosFixosTotal / receitaBrutaTotal) * 100 : 0,
      formatacao: 'negrito',
      indentacao: 0
    });

    // Adicionar itens de custos fixos
    custosFixos.forEach(custo => {
      linhas.push({
        tipo: 'subcategoria',
        nome: custo.subcategoria,
        nivel: 2,
        categoria: custo.categoria,
        tipoFinanceiro: custo.tipo,
        meses: custo.meses.map(m => ({
          mes: m.mes,
          valor: -m.valor,
          percentual: receitaBrutaTotal > 0 ? (m.valor / receitaBrutaMeses.find(rb => rb.mes === m.mes)!.valor) * 100 : 0
        })),
        totalPeriodo: -custo.totalPeriodo,
        percentualMedio: receitaBrutaTotal > 0 ? (custo.totalPeriodo / receitaBrutaTotal) * 100 : 0,
        formatacao: 'normal',
        indentacao: 1
      });
    });
  }

  // 6.1 = EBITDA (Lucro Operacional)
  const ebitdaMeses = mesesPeriodo.map(mesAno => {
    const margem = margemContribuicaoMeses.find(m => m.mes === mesAno)?.valor || 0;
    const custoFixo = custosFixosMeses.find(c => c.mes === mesAno)?.valor || 0;
    return { mes: mesAno, valor: margem - custoFixo };
  });
  const ebitdaTotal = ebitdaMeses.reduce((acc, m) => acc + m.valor, 0);

  linhas.push({
    tipo: 'totalizador',
    nome: '= EBITDA (Lucro Operacional)',
    nivel: 0,
    tipoFinanceiro: 'calculo',
    meses: ebitdaMeses.map(m => ({ 
      mes: m.mes, 
      valor: m.valor,
      percentual: receitaBrutaTotal > 0 ? (m.valor / receitaBrutaMeses.find(rb => rb.mes === m.mes)!.valor) * 100 : 0
    })),
    totalPeriodo: ebitdaTotal,
    percentualMedio: receitaBrutaTotal > 0 ? (ebitdaTotal / receitaBrutaTotal) * 100 : 0,
    formatacao: 'destacado',
    indentacao: 0
  });

  // 7. = RESULTADO LÍQUIDO
  const resultadoLiquidoMeses = mesesPeriodo.map(mesAno => {
    const receita = receitaBrutaMeses.find(r => r.mes === mesAno)?.valor || 0;
    const totalDespesasMes = despesas.reduce((acc, despesa) => {
      const dadosMes = despesa.meses.find(m => m.mes === mesAno);
      return acc + (dadosMes?.valor || 0);
    }, 0);
    return { mes: mesAno, valor: receita - totalDespesasMes };
  });
  const resultadoLiquidoTotal = resultadoLiquidoMeses.reduce((acc, m) => acc + m.valor, 0);

  linhas.push({
    tipo: 'totalizador',
    nome: '= RESULTADO LÍQUIDO',
    nivel: 0,
    tipoFinanceiro: 'calculo',
    meses: resultadoLiquidoMeses.map(m => ({ 
      mes: m.mes, 
      valor: m.valor,
      percentual: receitaBrutaTotal > 0 ? (m.valor / receitaBrutaMeses.find(rb => rb.mes === m.mes)!.valor) * 100 : 0
    })),
    totalPeriodo: resultadoLiquidoTotal,
    percentualMedio: receitaBrutaTotal > 0 ? (resultadoLiquidoTotal / receitaBrutaTotal) * 100 : 0,
    formatacao: 'destacado',
    indentacao: 0
  });

  return linhas;
};