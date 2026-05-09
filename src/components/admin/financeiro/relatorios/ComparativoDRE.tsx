import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useDRE, type DadosDRE, type ComparativoDRE as ComparativoDREType } from '@/hooks/useDRE';

interface ComparativoDREProps {
  dadosAtuais: DadosDRE;
  periodo: { inicio: string; fim: string };
}

export const ComparativoDRE = ({ dadosAtuais, periodo }: ComparativoDREProps) => {
  const [dadosComparativo, setDadosComparativo] = useState<ComparativoDREType | null>(null);
  const [periodoComparacao, setPeriodoComparacao] = useState({
    inicio: '',
    fim: ''
  });
  const { loading, buscarComparativoDRE } = useDRE();

  useEffect(() => {
    // Calcular período anterior automaticamente (mês anterior)
    const inicioAtual = new Date(periodo.inicio);
    const mesAnterior = new Date(inicioAtual);
    mesAnterior.setMonth(mesAnterior.getMonth() - 1);
    
    const inicioPeriodoAnterior = new Date(mesAnterior.getFullYear(), mesAnterior.getMonth(), 1);
    const fimPeriodoAnterior = new Date(mesAnterior.getFullYear(), mesAnterior.getMonth() + 1, 0);
    
    setPeriodoComparacao({
      inicio: inicioPeriodoAnterior.toISOString().split('T')[0],
      fim: fimPeriodoAnterior.toISOString().split('T')[0]
    });
  }, [periodo]);

  const gerarComparativo = async () => {
    if (!periodoComparacao.inicio || !periodoComparacao.fim) return;
    
    const comparativo = await buscarComparativoDRE(
      periodo,
      periodoComparacao
    );
    
    if (comparativo) {
      setDadosComparativo(comparativo);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const signal = value > 0 ? '+' : '';
    return `${signal}${value.toFixed(1)}%`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Seleção do período de comparação */}
      <Card>
        <CardHeader>
          <CardTitle>Configurar Comparativo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inicio-comparacao">Data Início (Comparação)</Label>
              <Input
                id="inicio-comparacao"
                type="date"
                value={periodoComparacao.inicio}
                onChange={(e) => setPeriodoComparacao(prev => ({ 
                  ...prev, 
                  inicio: e.target.value 
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fim-comparacao">Data Fim (Comparação)</Label>
              <Input
                id="fim-comparacao"
                type="date"
                value={periodoComparacao.fim}
                onChange={(e) => setPeriodoComparacao(prev => ({ 
                  ...prev, 
                  fim: e.target.value 
                }))}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={gerarComparativo}
                disabled={loading || !periodoComparacao.inicio || !periodoComparacao.fim}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TrendingUp className="h-4 w-4" />
                )}
                Comparar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultado do comparativo */}
      {dadosComparativo && (
        <div className="space-y-6">
          {/* Resumo comparativo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Receitas</p>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(dadosComparativo.periodo1.totalReceitas)}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={dadosComparativo.variacao.receitas >= 0 ? "default" : "destructive"}
                      className="gap-1"
                    >
                      {dadosComparativo.variacao.receitas >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {formatPercentage(dadosComparativo.variacao.receitas)}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  vs {formatCurrency(dadosComparativo.periodo2.totalReceitas)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Despesas</p>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(dadosComparativo.periodo1.totalDespesas)}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={dadosComparativo.variacao.despesas <= 0 ? "default" : "destructive"}
                      className="gap-1"
                    >
                      {dadosComparativo.variacao.despesas <= 0 ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : (
                        <TrendingUp className="h-3 w-3" />
                      )}
                      {formatPercentage(dadosComparativo.variacao.despesas)}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  vs {formatCurrency(dadosComparativo.periodo2.totalDespesas)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Resultado</p>
                    <div className={`text-2xl font-bold ${dadosComparativo.periodo1.resultadoOperacional >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(dadosComparativo.periodo1.resultadoOperacional)}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={dadosComparativo.variacao.resultado >= 0 ? "default" : "destructive"}
                      className="gap-1"
                    >
                      {dadosComparativo.variacao.resultado >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {formatPercentage(dadosComparativo.variacao.resultado)}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  vs {formatCurrency(dadosComparativo.periodo2.resultadoOperacional)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela comparativa detalhada */}
          <Card>
            <CardHeader>
              <CardTitle>Análise Detalhada</CardTitle>
              <div className="text-sm text-muted-foreground">
                Período Atual: {formatDate(dadosComparativo.periodo1.periodo.inicio)} até {formatDate(dadosComparativo.periodo1.periodo.fim)}
                <br />
                Período Comparação: {formatDate(dadosComparativo.periodo2.periodo.inicio)} até {formatDate(dadosComparativo.periodo2.periodo.fim)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Receitas detalhadas */}
                <div>
                  <h4 className="font-semibold text-green-600 mb-3">Receitas por Categoria</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">Categoria</th>
                          <th className="text-right p-3 font-medium">Período Atual</th>
                          <th className="text-right p-3 font-medium">Período Anterior</th>
                          <th className="text-center p-3 font-medium">Variação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dadosComparativo.periodo1.receitas.map((receita, index) => {
                          const receitaAnterior = dadosComparativo.periodo2.receitas.find(r => r.categoria === receita.categoria);
                          const valorAnterior = receitaAnterior?.valor || 0;
                          const variacao = valorAnterior > 0 ? ((receita.valor - valorAnterior) / valorAnterior) * 100 : 0;
                          
                          return (
                            <tr key={index} className="border-t hover:bg-muted/30">
                              <td className="p-3">{receita.categoria}</td>
                              <td className="p-3 text-right font-medium">
                                {formatCurrency(receita.valor)}
                              </td>
                              <td className="p-3 text-right">
                                {formatCurrency(valorAnterior)}
                              </td>
                              <td className="p-3 text-center">
                                <Badge variant={variacao >= 0 ? "default" : "destructive"} className="gap-1">
                                  {variacao >= 0 ? (
                                    <TrendingUp className="h-3 w-3" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3" />
                                  )}
                                  {formatPercentage(variacao)}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Despesas detalhadas */}
                <div>
                  <h4 className="font-semibold text-red-600 mb-3">Despesas por Categoria</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">Categoria</th>
                          <th className="text-right p-3 font-medium">Período Atual</th>
                          <th className="text-right p-3 font-medium">Período Anterior</th>
                          <th className="text-center p-3 font-medium">Variação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dadosComparativo.periodo1.despesas.map((despesa, index) => {
                          const despesaAnterior = dadosComparativo.periodo2.despesas.find(d => d.categoria === despesa.categoria);
                          const valorAnterior = despesaAnterior?.valor || 0;
                          const variacao = valorAnterior > 0 ? ((despesa.valor - valorAnterior) / valorAnterior) * 100 : 0;
                          
                          return (
                            <tr key={index} className="border-t hover:bg-muted/30">
                              <td className="p-3">{despesa.categoria}</td>
                              <td className="p-3 text-right font-medium">
                                {formatCurrency(despesa.valor)}
                              </td>
                              <td className="p-3 text-right">
                                {formatCurrency(valorAnterior)}
                              </td>
                              <td className="p-3 text-center">
                                <Badge variant={variacao <= 0 ? "default" : "destructive"} className="gap-1">
                                  {variacao <= 0 ? (
                                    <TrendingDown className="h-3 w-3" />
                                  ) : (
                                    <TrendingUp className="h-3 w-3" />
                                  )}
                                  {formatPercentage(variacao)}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!dadosComparativo && !loading && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">
              Configure o período de comparação e clique em "Comparar"
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};