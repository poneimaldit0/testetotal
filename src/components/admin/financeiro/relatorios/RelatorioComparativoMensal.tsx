import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, TrendingUp, TrendingDown, Download, Filter, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useRelatorioComparativoMensal, type DadosRelatorioComparativoMensal, type LinhaRelatorio } from '@/hooks/useRelatorioComparativoMensal';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { exportarRelatorioComparativoExcel } from '@/utils/exportacaoRelatorioComparativo';
import { toast } from 'sonner';

export const RelatorioComparativoMensal = () => {
  const [dados, setDados] = useState<DadosRelatorioComparativoMensal | null>(null);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<string>('3meses');
  const [tipoFiltro, setTipoFiltro] = useState<'receitas' | 'despesas' | 'ambos'>('ambos');
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const { loading, dadosValidados, buscarDadosComparativo, limparCache } = useRelatorioComparativoMensal();

  const obterPeriodoDatas = (periodo: string) => {
    const hoje = new Date();
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0); // Último dia do mês atual
    let inicio: Date;

    switch (periodo) {
      case '3meses':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
        break;
      case '6meses':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);
        break;
      case '12meses':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1);
        break;
      case 'anoAtual':
        inicio = new Date(hoje.getFullYear(), 0, 1);
        break;
      case 'anoPassado':
        inicio = new Date(hoje.getFullYear() - 1, 0, 1);
        const fimAnoPassado = new Date(hoje.getFullYear() - 1, 11, 31);
        return {
          inicio: inicio.toISOString().split('T')[0],
          fim: fimAnoPassado.toISOString().split('T')[0]
        };
      default:
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1);
    }

    return {
      inicio: inicio.toISOString().split('T')[0],
      fim: fim.toISOString().split('T')[0]
    };
  };

  const carregarDados = async (forcarReload: boolean = false) => {
    if (forcarReload) {
      limparCache();
      setDados(null); // Limpar dados anteriores
    }
    
    const { inicio, fim } = obterPeriodoDatas(periodoSelecionado);
    console.log('🔄 Carregando dados do relatório:', { periodo: periodoSelecionado, tipo: tipoFiltro, forcarReload });
    
    const resultado = await buscarDadosComparativo(inicio, fim, tipoFiltro, undefined, forcarReload);
    setDados(resultado);
    setUltimaAtualizacao(new Date());
  };

  const forcarAtualizacao = () => {
    carregarDados(true);
  };

  useEffect(() => {
    console.log('🔄 Mudança detectada nos filtros:', { periodoSelecionado, tipoFiltro });
    carregarDados();
  }, [periodoSelecionado, tipoFiltro]);

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarMoedaComSinal = (valor: number) => {
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Math.abs(valor));
    
    return valor >= 0 ? `+${valorFormatado}` : `-${valorFormatado}`;
  };

  const formatarMes = (mesAno: string) => {
    const [ano, mes] = mesAno.split('-');
    return new Date(parseInt(ano), parseInt(mes) - 1).toLocaleDateString('pt-BR', {
      month: 'short',
      year: '2-digit'
    });
  };

  const formatarVariacao = (variacao?: number) => {
    if (!variacao || variacao === 0) return null;
    
    const isPositivo = variacao > 0;
    return (
      <div className={`flex items-center gap-1 text-xs ${
        isPositivo ? 'text-green-600' : 'text-red-600'
      }`}>
        {isPositivo ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {Math.abs(variacao).toFixed(1)}%
      </div>
    );
  };

  const exportarDados = () => {
    if (!dados) return;
    
    try {
      exportarRelatorioComparativoExcel(dados);
      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast.error('Erro ao exportar relatório');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Controles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Relatório Comparativo Mensal por Apropriações
              <Badge variant="secondary" className="text-xs">
                Apenas Contas Conciliadas
              </Badge>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="text-sm">
                    <strong>Regime de Caixa + Conciliação:</strong> Este relatório considera apenas as transações efetivamente pagas/recebidas E conciliadas bancariamente, garantindo máxima precisão e auditabilidade dos dados financeiros.
                  </p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3meses">Últimos 3 meses</SelectItem>
                  <SelectItem value="6meses">Últimos 6 meses</SelectItem>
                  <SelectItem value="12meses">Últimos 12 meses</SelectItem>
                  <SelectItem value="anoAtual">Ano atual</SelectItem>
                  <SelectItem value="anoPassado">Ano passado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={tipoFiltro} onValueChange={(value: any) => setTipoFiltro(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambos">Receitas e Despesas</SelectItem>
                  <SelectItem value="receitas">Apenas Receitas</SelectItem>
                  <SelectItem value="despesas">Apenas Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={forcarAtualizacao} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button onClick={exportarDados} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {dados ? (
        <>
          {/* Indicador de validação e última atualização */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
            <div className="flex items-center gap-3">
              {dadosValidados ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <span className="text-sm text-green-600 font-medium">Dados validados ✓</span>
                      <p className="text-xs text-muted-foreground">Apenas movimentações conciliadas bancariamente</p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <div>
                      <span className="text-sm text-amber-600 font-medium">Discrepância corrigida automaticamente</span>
                      <p className="text-xs text-muted-foreground">Usando apenas dados conciliados e validados</p>
                    </div>
                  </>
                )}
            </div>
            <div className="text-right">
              {ultimaAtualizacao && (
                <div className="text-xs text-muted-foreground">
                  Última atualização: {ultimaAtualizacao.toLocaleTimeString('pt-BR')}
                  <br />
                  <span className="text-primary font-medium">
                    Regime: Caixa + Conciliação Bancária
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Resumo executivo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Receitas</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatarMoeda(dados.totalReceitas)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Despesas</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatarMoeda(dados.totalDespesas)}
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Resultado</p>
                    <p className={`text-2xl font-bold ${
                      dados.resultadoTotal >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatarMoeda(dados.resultadoTotal)}
                    </p>
                  </div>
                  {dados.resultadoTotal >= 0 ? (
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  ) : (
                    <TrendingDown className="h-8 w-8 text-red-600" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela hierárquica com totalizadores */}
          <Card>
            <CardHeader>
              <CardTitle>Demonstrativo de Resultado (DRE) - Comparativo Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium min-w-[250px]">Apropriação</th>
                      {dados.resumoMeses.map(mes => (
                        <th key={mes.mes} className="text-center p-2 font-medium min-w-[120px]">
                          {formatarMes(mes.mes)}
                        </th>
                      ))}
                      <th className="text-right p-2 font-medium min-w-[130px]">Total Período</th>
                      <th className="text-center p-2 font-medium min-w-[80px]">% Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.linhasHierarquicas.map((linha, index) => {
                      const isSubcategoria = linha.tipo === 'subcategoria';
                      const isTotalizador = linha.tipo === 'totalizador';
                      const isDestacado = linha.formatacao === 'destacado';
                      const isNegrito = linha.formatacao === 'negrito';
                      
                      return (
                        <tr 
                          key={index} 
                          className={`
                            ${isTotalizador ? 'border-t-2 border-b' : 'border-b'} 
                            ${isDestacado ? 'bg-primary/5 font-bold' : ''}
                            ${isNegrito ? 'font-semibold' : ''}
                            ${isSubcategoria ? 'hover:bg-muted/30' : ''}
                          `}
                        >
                          <td className="p-2">
                            <div 
                              className="flex items-center gap-2"
                              style={{ marginLeft: `${linha.indentacao * 20}px` }}
                            >
                              {isSubcategoria && (
                                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                              )}
                              <div className={`
                                ${isDestacado ? 'text-lg font-bold' : ''}
                                ${isNegrito ? 'font-semibold' : ''}
                                ${isSubcategoria ? 'text-sm text-muted-foreground' : ''}
                              `}>
                                {linha.nome}
                              </div>
                              {linha.categoria && isSubcategoria && (
                                <Badge variant="outline" className="text-xs ml-2">
                                  {linha.categoria}
                                </Badge>
                              )}
                            </div>
                          </td>
                          
                          {linha.meses.map(mes => (
                            <td key={mes.mes} className="text-center p-2">
                              <div className="space-y-1">
                                <div className={`
                                  ${linha.tipoFinanceiro === 'receita' ? 'text-green-600' : 
                                    linha.tipoFinanceiro === 'despesa' ? 'text-red-600' : 
                                    mes.valor >= 0 ? 'text-green-600' : 'text-red-600'}
                                  ${isDestacado ? 'font-bold text-base' : 'text-sm'}
                                  ${isNegrito ? 'font-semibold' : ''}
                                `}>
                                  {mes.valor !== 0 ? (
                                    isTotalizador ? formatarMoedaComSinal(mes.valor) : formatarMoeda(Math.abs(mes.valor))
                                  ) : '-'}
                                </div>
                                {mes.percentual !== undefined && mes.percentual > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    {mes.percentual.toFixed(1)}%
                                  </div>
                                )}
                              </div>
                            </td>
                          ))}
                          
                          <td className="text-right p-2">
                            <div className="space-y-1">
                              <div className={`
                                ${linha.tipoFinanceiro === 'receita' ? 'text-green-600' : 
                                  linha.tipoFinanceiro === 'despesa' ? 'text-red-600' : 
                                  linha.totalPeriodo >= 0 ? 'text-green-600' : 'text-red-600'}
                                ${isDestacado ? 'font-bold text-base' : 'text-sm'}
                                ${isNegrito ? 'font-semibold' : ''}
                              `}>
                                {isTotalizador ? formatarMoedaComSinal(linha.totalPeriodo) : formatarMoeda(Math.abs(linha.totalPeriodo))}
                              </div>
                            </div>
                          </td>
                          
                          <td className="text-center p-2">
                            {linha.percentualMedio !== undefined && linha.percentualMedio > 0 && (
                              <div className={`
                                text-xs text-muted-foreground
                                ${isDestacado ? 'font-semibold' : ''}
                              `}>
                                {linha.percentualMedio.toFixed(1)}%
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Selecione um período para visualizar o relatório comparativo
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </TooltipProvider>
  );
};