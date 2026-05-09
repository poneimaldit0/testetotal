import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, TrendingUp, TrendingDown, DollarSign, Clock, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { FiltrosFluxoCaixa } from './FiltrosFluxoCaixa';
import { useFluxoCaixa } from '@/hooks/useFluxoCaixa';
import { ResumoCategoriasHierarquico } from '../CategoriaHierarquica';
import type { RelatorioFluxoCaixa, MovimentacaoFluxoCaixa } from '@/types/financeiro';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export const RelatorioFluxoCaixaComponent = () => {
  const [dadosFluxo, setDadosFluxo] = useState<RelatorioFluxoCaixa | null>(null);
  const [dadosOriginais, setDadosOriginais] = useState<RelatorioFluxoCaixa | null>(null);
  const [movimentacoesExcluidas, setMovimentacoesExcluidas] = useState<Set<string>>(new Set());
  const { loading, buscarFluxoCaixa } = useFluxoCaixa();

  // Carregar exclusões do localStorage
  useEffect(() => {
    const exclusoesSalvas = localStorage.getItem('fluxoCaixa_exclusoes');
    if (exclusoesSalvas) {
      setMovimentacoesExcluidas(new Set(JSON.parse(exclusoesSalvas)));
    }
  }, []);

  // Salvar exclusões no localStorage
  useEffect(() => {
    localStorage.setItem('fluxoCaixa_exclusoes', JSON.stringify(Array.from(movimentacoesExcluidas)));
  }, [movimentacoesExcluidas]);

  const carregarFluxoCaixa = async (inicio: string, fim: string, incluirPagas: boolean, incluirEntradasFuturas: boolean, statusSelecionados: string[]) => {
    const dados = await buscarFluxoCaixa(inicio, fim, incluirPagas, incluirEntradasFuturas, statusSelecionados);
    if (dados) {
      setDadosOriginais(dados);
      const dadosComExclusoes = calcularFluxoComExclusoes(dados, movimentacoesExcluidas);
      setDadosFluxo(dadosComExclusoes);
    }
  };

  // Função para recalcular o fluxo excluindo movimentações selecionadas
  const calcularFluxoComExclusoes = (dadosOriginais: RelatorioFluxoCaixa, exclusoes: Set<string>): RelatorioFluxoCaixa => {
    if (exclusoes.size === 0) return dadosOriginais;

    const movimentacoesFiltradas = dadosOriginais.movimentacoes.filter(mov => !exclusoes.has(mov.id));
    
    // Recalcular saldo acumulado
    let saldoAcumulado = dadosOriginais.saldo_inicial || 0;
    const movimentacoesComSaldo = movimentacoesFiltradas.map(mov => {
      const valor = mov.tipo === 'entrada' 
        ? (mov.valor_recebido > 0 ? mov.valor_recebido : mov.valor_original)
        : -(mov.valor_pago > 0 ? mov.valor_pago : mov.valor_original);
      saldoAcumulado += valor;
      return { ...mov, saldo_acumulado: saldoAcumulado };
    });

    // Recalcular totais
    const totalEntradas = movimentacoesFiltradas
      .filter(mov => mov.tipo === 'entrada')
      .reduce((sum, mov) => sum + (mov.valor_recebido > 0 ? mov.valor_recebido : mov.valor_original), 0);
    
    const totalSaidas = movimentacoesFiltradas
      .filter(mov => mov.tipo === 'saida')
      .reduce((sum, mov) => sum + (mov.valor_pago > 0 ? mov.valor_pago : mov.valor_original), 0);
    
    const entradasPendentes = movimentacoesFiltradas
      .filter(mov => mov.tipo === 'entrada' && mov.status === 'pendente')
      .reduce((sum, mov) => sum + mov.valor_original, 0);
    
    const saidasPendentes = movimentacoesFiltradas
      .filter(mov => mov.tipo === 'saida' && mov.status === 'pendente')
      .reduce((sum, mov) => sum + mov.valor_original, 0);

    // Recalcular resumo por categorias
    const novoResumoCateg = movimentacoesFiltradas.reduce((acc, mov) => {
      const categoria = mov.categoria || 'Sem categoria';
      const existing = acc.find(r => r.categoria === categoria && r.tipo === mov.tipo);
      const valor = mov.tipo === 'entrada' 
        ? (mov.valor_recebido > 0 ? mov.valor_recebido : mov.valor_original)
        : (mov.valor_pago > 0 ? mov.valor_pago : mov.valor_original);
      
      if (existing) {
        existing.valor_total += valor;
        existing.quantidade += 1;
      } else {
        acc.push({
          categoria,
          tipo: mov.tipo,
          valor_total: valor,
          quantidade: 1
        });
      }
      return acc;
    }, [] as typeof dadosOriginais.resumo_categorias);

    return {
      ...dadosOriginais,
      movimentacoes: movimentacoesComSaldo,
      totais: {
        total_entradas: totalEntradas,
        total_saidas: totalSaidas,
        saldo_liquido: totalEntradas - totalSaidas,
        entradas_pendentes: entradasPendentes,
        saidas_pendentes: saidasPendentes
      },
      resumo_categorias: novoResumoCateg
    };
  };

  // Função para alternar exclusão de movimentação
  const toggleExclusaoMovimentacao = (movimentacaoId: string) => {
    const novasExclusoes = new Set(movimentacoesExcluidas);
    
    if (novasExclusoes.has(movimentacaoId)) {
      novasExclusoes.delete(movimentacaoId);
      toast.success("Operação incluída na simulação");
    } else {
      novasExclusoes.add(movimentacaoId);
      toast.success("Operação excluída da simulação");
    }
    
    setMovimentacoesExcluidas(novasExclusoes);
    
    if (dadosOriginais) {
      const dadosComExclusoes = calcularFluxoComExclusoes(dadosOriginais, novasExclusoes);
      setDadosFluxo(dadosComExclusoes);
    }
  };

  // Função para limpar simulação
  const limparSimulacao = () => {
    setMovimentacoesExcluidas(new Set());
    setDadosFluxo(dadosOriginais);
    localStorage.removeItem('fluxoCaixa_exclusoes');
    toast.success("Simulação limpa");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString + 'T12:00:00').toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', dateString, error);
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'pago':
      case 'recebido':
        return 'bg-green-100 text-green-800';
      case 'vencido':
        return 'bg-red-100 text-red-800';
      case 'cancelado':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'pago':
        return 'Pago';
      case 'recebido':
        return 'Recebido';
      case 'vencido':
        return 'Vencido';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const exportarExcel = () => {
    if (!dadosFluxo || !dadosOriginais) return;

    const wb = XLSX.utils.book_new();
    
    // Planilha principal - cenário atual (com ou sem simulação)
    const dadosExport = dadosFluxo.movimentacoes.map(mov => ({
      'Data Vencimento': formatDate(mov.data_vencimento),
      'Tipo': mov.tipo === 'entrada' ? 'Entrada' : 'Saída',
      'Descrição': mov.descricao,
      'Cliente/Fornecedor': mov.cliente_fornecedor,
      'Categoria': mov.categoria || 'Sem categoria',
      'Subcategoria': mov.subcategoria || 'Sem apropriação',
      'Valor Original': mov.valor_original,
      'Valor Pago': mov.valor_pago || 0,
      'Valor Recebido': mov.valor_recebido || 0,
      'Status': getStatusLabel(mov.status),
      'Saldo Acumulado': mov.saldo_acumulado
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExport);
    ws['!cols'] = [
      { width: 15 }, { width: 10 }, { width: 30 }, { width: 25 }, { width: 20 }, { width: 18 },
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 12 }, { width: 18 }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, movimentacoesExcluidas.size > 0 ? 'Cenário Simulado' : 'Fluxo de Caixa');
    
    // Se há simulação ativa, adicionar planilhas de comparação
    if (movimentacoesExcluidas.size > 0) {
      // Planilha do cenário original
      const dadosOriginalExport = dadosOriginais.movimentacoes.map(mov => ({
        'Data Vencimento': formatDate(mov.data_vencimento),
        'Tipo': mov.tipo === 'entrada' ? 'Entrada' : 'Saída',
        'Descrição': mov.descricao,
        'Cliente/Fornecedor': mov.cliente_fornecedor,
        'Categoria': mov.categoria || 'Sem categoria',
        'Subcategoria': mov.subcategoria || 'Sem apropriação',
        'Valor Original': mov.valor_original,
        'Valor Pago': mov.valor_pago || 0,
        'Valor Recebido': mov.valor_recebido || 0,
        'Status': getStatusLabel(mov.status),
        'Saldo Acumulado': mov.saldo_acumulado
      }));
      
      const wsOriginal = XLSX.utils.json_to_sheet(dadosOriginalExport);
      wsOriginal['!cols'] = ws['!cols'];
      XLSX.utils.book_append_sheet(wb, wsOriginal, 'Cenário Original');
      
      // Planilha de comparação
      const comparacaoData = [
        ['Indicador', 'Cenário Original', 'Cenário Simulado', 'Diferença'],
        ['Total Entradas', dadosOriginais.totais.total_entradas, dadosFluxo.totais.total_entradas, dadosFluxo.totais.total_entradas - dadosOriginais.totais.total_entradas],
        ['Total Saídas', dadosOriginais.totais.total_saidas, dadosFluxo.totais.total_saidas, dadosFluxo.totais.total_saidas - dadosOriginais.totais.total_saidas],
        ['Saldo Líquido', dadosOriginais.totais.saldo_liquido, dadosFluxo.totais.saldo_liquido, dadosFluxo.totais.saldo_liquido - dadosOriginais.totais.saldo_liquido],
        ['Operações Excluídas', 0, movimentacoesExcluidas.size, movimentacoesExcluidas.size]
      ];
      
      const wsComparacao = XLSX.utils.aoa_to_sheet(comparacaoData);
      XLSX.utils.book_append_sheet(wb, wsComparacao, 'Comparação');
    }
    
    const sufixo = movimentacoesExcluidas.size > 0 ? '_simulacao' : '';
    const periodo = `${formatDate(dadosFluxo.periodo.inicio)}_${formatDate(dadosFluxo.periodo.fim)}`;
    XLSX.writeFile(wb, `FluxoCaixa${sufixo}_${periodo}.xlsx`);
    
    toast.success("Relatório exportado com sucesso!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Relatório de Fluxo de Caixa</h2>
          <p className="text-muted-foreground">
            Visualização detalhada linha por linha de todas as movimentações financeiras
          </p>
          {movimentacoesExcluidas.size > 0 && (
            <Badge variant="secondary" className="mt-2 w-fit">
              <Eye className="w-3 h-3 mr-1" />
              Modo Simulação ({movimentacoesExcluidas.size} operações excluídas)
            </Badge>
          )}
        </div>
        {dadosFluxo && (
          <Button onClick={exportarExcel} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        )}
      </div>

      <FiltrosFluxoCaixa onFiltroChange={carregarFluxoCaixa} loading={loading} />

      {/* Painel de Simulação Ativa */}
      {movimentacoesExcluidas.size > 0 && dadosOriginais && dadosFluxo && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <EyeOff className="w-5 h-5 text-yellow-600" />
                Simulação Ativa
              </CardTitle>
              <Button 
                onClick={limparSimulacao}
                variant="outline" 
                size="sm"
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Limpar Simulação
              </Button>
            </div>
            <CardDescription>
              Você excluiu {movimentacoesExcluidas.size} operação(ões) para simular diferentes cenários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">Diferença Entradas</p>
                    <p className={`text-lg font-bold ${dadosFluxo.totais.total_entradas - dadosOriginais.totais.total_entradas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(dadosFluxo.totais.total_entradas - dadosOriginais.totais.total_entradas)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">Diferença Saídas</p>
                    <p className={`text-lg font-bold ${dadosFluxo.totais.total_saidas - dadosOriginais.totais.total_saidas <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(dadosFluxo.totais.total_saidas - dadosOriginais.totais.total_saidas)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">Impacto Saldo</p>
                    <p className={`text-lg font-bold ${dadosFluxo.totais.saldo_liquido - dadosOriginais.totais.saldo_liquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(dadosFluxo.totais.saldo_liquido - dadosOriginais.totais.saldo_liquido)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">Operações Excluídas</p>
                    <p className="text-lg font-bold text-muted-foreground">
                      {movimentacoesExcluidas.size}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {dadosFluxo && (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(dadosFluxo.totais.total_entradas)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Entradas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(dadosFluxo.totais.total_saidas)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Saídas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <DollarSign className={`h-8 w-8 ${dadosFluxo.totais.saldo_liquido >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  <div>
                    <p className={`text-2xl font-bold ${dadosFluxo.totais.saldo_liquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(dadosFluxo.totais.saldo_liquido)}
                    </p>
                    <p className="text-sm text-muted-foreground">Saldo Líquido</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">
                      {formatCurrency(dadosFluxo.totais.entradas_pendentes - dadosFluxo.totais.saidas_pendentes)}
                    </p>
                    <p className="text-sm text-muted-foreground">Pendente Líquido</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Movimentações */}
          <Card>
            <CardHeader>
              <CardTitle>Movimentações Detalhadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Cliente/Fornecedor</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Subcategoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Saldo Acumulado</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dadosOriginais?.movimentacoes.map((movimentacao) => {
                      const isExcluida = movimentacoesExcluidas.has(movimentacao.id);
                      const saldoAtual = dadosFluxo.movimentacoes.find(m => m.id === movimentacao.id)?.saldo_acumulado;
                      
                      return (
                        <TableRow 
                          key={movimentacao.id}
                          className={isExcluida ? 'opacity-50 bg-muted/30' : ''}
                        >
                          <TableCell className={`font-medium ${isExcluida ? 'line-through' : ''}`}>
                            {formatDate(movimentacao.data_vencimento)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={movimentacao.tipo === 'entrada' ? 'default' : 'secondary'}
                              className={isExcluida ? 'opacity-50' : ''}
                            >
                              {movimentacao.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                            </Badge>
                          </TableCell>
                          <TableCell className={`max-w-[200px] truncate ${isExcluida ? 'line-through' : ''}`}>
                            {movimentacao.descricao}
                          </TableCell>
                          <TableCell className={`max-w-[150px] truncate ${isExcluida ? 'line-through' : ''}`}>
                            {movimentacao.cliente_fornecedor}
                          </TableCell>
                          <TableCell className={`${isExcluida ? 'line-through' : ''}`}>
                            {movimentacao.categoria || 'Sem categoria'}
                          </TableCell>
                          <TableCell className={`text-sm text-muted-foreground ${isExcluida ? 'line-through' : ''}`}>
                            {movimentacao.subcategoria || 'Sem apropriação'}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${isExcluida ? 'line-through' : ''} ${
                            movimentacao.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {movimentacao.tipo === 'entrada' ? '+' : '-'}
                            {formatCurrency(
                              movimentacao.tipo === 'entrada'
                                ? (movimentacao.valor_recebido > 0 ? movimentacao.valor_recebido : movimentacao.valor_original)
                                : (movimentacao.valor_pago > 0 ? movimentacao.valor_pago : movimentacao.valor_original)
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={`${getStatusColor(movimentacao.status)} ${isExcluida ? 'opacity-50' : ''}`}
                            >
                              {getStatusLabel(movimentacao.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-bold ${isExcluida ? 'line-through' : ''} ${
                            (isExcluida ? movimentacao.saldo_acumulado : (saldoAtual || 0)) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(isExcluida ? movimentacao.saldo_acumulado : (saldoAtual || 0))}
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => toggleExclusaoMovimentacao(movimentacao.id)}
                              variant={isExcluida ? "outline" : "ghost"}
                              size="sm"
                              className={isExcluida ? 'border-green-300 text-green-700 hover:bg-green-50' : 'text-muted-foreground hover:text-foreground'}
                            >
                              {isExcluida ? (
                                <Eye className="w-3 h-3" />
                              ) : (
                                <EyeOff className="w-3 h-3" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {dadosFluxo.movimentacoes.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Nenhuma movimentação encontrada para o período selecionado
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumo por Categorias */}
          {dadosFluxo.resumo_categorias.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Resumo por Categorias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-green-600 mb-2">Entradas</h4>
                    <div className="space-y-2">
                      {dadosFluxo.resumo_categorias
                        .filter(cat => cat.tipo === 'entrada')
                        .map((categoria, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-sm">{categoria.categoria}</span>
                            <div className="text-right">
                              <div className="font-medium text-green-600">
                                {formatCurrency(categoria.valor_total)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {categoria.quantidade} movimentações
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-red-600 mb-2">Saídas</h4>
                    <div className="space-y-2">
                      {dadosFluxo.resumo_categorias
                        .filter(cat => cat.tipo === 'saida')
                        .map((categoria, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-sm">{categoria.categoria}</span>
                            <div className="text-right">
                              <div className="font-medium text-red-600">
                                {formatCurrency(categoria.valor_total)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {categoria.quantidade} movimentações
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!dadosFluxo && !loading && (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-muted-foreground">
                Selecione um período para visualizar o fluxo de caixa
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};