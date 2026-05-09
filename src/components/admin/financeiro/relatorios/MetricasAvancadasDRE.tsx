import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, AlertTriangle, Target, DollarSign, Percent } from 'lucide-react';
import type { DadosDRE } from '@/hooks/useDRE';

interface MetricasAvancadasDREProps {
  dados: DadosDRE;
}

export const MetricasAvancadasDRE = ({ dados }: MetricasAvancadasDREProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Cálculos de métricas avançadas
  const margemBruta = dados.totalReceitas > 0 ? (dados.totalReceitas - dados.totalDespesas) / dados.totalReceitas * 100 : 0;
  const margemOperacional = dados.totalReceitas > 0 ? dados.resultadoOperacional / dados.totalReceitas * 100 : 0;
  const ticketMedioReceitas = dados.receitas.length > 0 ? dados.totalReceitas / dados.receitas.length : 0;
  const ticketMedioDespesas = dados.despesas.length > 0 ? dados.totalDespesas / dados.despesas.length : 0;
  
  // ROI simplificado (considerando receitas como retorno e despesas como investimento)
  const roi = dados.totalDespesas > 0 ? ((dados.totalReceitas - dados.totalDespesas) / dados.totalDespesas) * 100 : 0;
  
  // EBITDA simplificado (sem depreciação e amortização específicas)
  const ebitda = dados.resultadoOperacional;
  const margemEbitda = dados.totalReceitas > 0 ? (ebitda / dados.totalReceitas) * 100 : 0;
  
  // Análise de concentração (categorias que representam mais de 20% do total)
  const concentracaoReceitas = dados.receitas.filter(r => (r.valor / dados.totalReceitas) > 0.2);
  const concentracaoDespesas = dados.despesas.filter(d => (d.valor / dados.totalDespesas) > 0.2);
  
  // Eficiência operacional
  const eficienciaOperacional = dados.totalReceitas > 0 ? (dados.totalReceitas / dados.totalDespesas) : 0;
  
  // Status baseado em métricas
  const getMargemStatus = (margem: number) => {
    if (margem >= 20) return { color: 'text-green-600', bg: 'bg-green-100', label: 'Excelente' };
    if (margem >= 10) return { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Boa' };
    if (margem >= 0) return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Regular' };
    return { color: 'text-red-600', bg: 'bg-red-100', label: 'Crítica' };
  };

  const getRoiStatus = (roiValue: number) => {
    if (roiValue >= 30) return { color: 'text-green-600', bg: 'bg-green-100', label: 'Alto' };
    if (roiValue >= 10) return { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Médio' };
    if (roiValue >= 0) return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Baixo' };
    return { color: 'text-red-600', bg: 'bg-red-100', label: 'Negativo' };
  };

  const margemStatus = getMargemStatus(margemBruta);
  const roiStatus = getRoiStatus(roi);

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Margem Bruta</p>
                <div className="text-2xl font-bold">
                  {formatPercentage(margemBruta)}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <Percent className={`h-8 w-8 ${margemStatus.color}`} />
                <Badge className={`${margemStatus.bg} ${margemStatus.color} text-xs mt-1`}>
                  {margemStatus.label}
                </Badge>
              </div>
            </div>
            <Progress value={Math.max(0, Math.min(100, margemBruta + 50))} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ROI</p>
                <div className="text-2xl font-bold">
                  {formatPercentage(roi)}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <Target className={`h-8 w-8 ${roiStatus.color}`} />
                <Badge className={`${roiStatus.bg} ${roiStatus.color} text-xs mt-1`}>
                  {roiStatus.label}
                </Badge>
              </div>
            </div>
            <Progress value={Math.max(0, Math.min(100, roi + 50))} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">EBITDA</p>
                <div className="text-2xl font-bold">
                  {formatCurrency(ebitda)}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <DollarSign className={`h-8 w-8 ${ebitda >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                <span className="text-xs text-muted-foreground">
                  {formatPercentage(margemEbitda)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Eficiência Operacional</p>
                <div className="text-2xl font-bold">
                  {eficienciaOperacional.toFixed(2)}x
                </div>
              </div>
              <div className="flex flex-col items-end">
                {eficienciaOperacional >= 1.5 ? (
                  <TrendingUp className="h-8 w-8 text-green-600" />
                ) : eficienciaOperacional >= 1 ? (
                  <TrendingUp className="h-8 w-8 text-yellow-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-600" />
                )}
                <span className="text-xs text-muted-foreground">
                  {eficienciaOperacional >= 1.5 ? 'Ótima' : eficienciaOperacional >= 1 ? 'Boa' : 'Baixa'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Análise de Tickets Médios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Ticket Médio - Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Valor Médio por Categoria</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(ticketMedioReceitas)}
                </span>
              </div>
              <div className="space-y-2">
                {dados.receitas.map((receita, index) => {
                      const percentualTotal = (receita.valor / dados.totalReceitas) * 100;
                      return (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="truncate">{receita.categoria}</span>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(receita.valor)}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatPercentage(percentualTotal)}
                            </div>
                          </div>
                        </div>
                      );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Ticket Médio - Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Valor Médio por Categoria</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(ticketMedioDespesas)}
                </span>
              </div>
              <div className="space-y-2">
                {dados.despesas.map((despesa, index) => {
                  const percentualTotal = (despesa.valor / dados.totalDespesas) * 100;
                  return (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="truncate">{despesa.categoria}</span>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(despesa.valor)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatPercentage(percentualTotal)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Análise de Concentração */}
      {(concentracaoReceitas.length > 0 || concentracaoDespesas.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Análise de Concentração de Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {concentracaoReceitas.length > 0 && (
                <div>
                  <h4 className="font-semibold text-green-600 mb-3">
                    Receitas Concentradas (&gt;20% do total)
                  </h4>
                  <div className="space-y-2">
                    {concentracaoReceitas.map((receita, index) => {
                      const percentual = (receita.valor / dados.totalReceitas) * 100;
                      return (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm">{receita.categoria}</span>
                          <Badge variant="outline" className="text-yellow-600">
                            {formatPercentage(percentual)}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Alta concentração pode representar risco de dependência
                  </p>
                </div>
              )}
              
              {concentracaoDespesas.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-600 mb-3">
                    Despesas Concentradas (&gt;20% do total)
                  </h4>
                  <div className="space-y-2">
                    {concentracaoDespesas.map((despesa, index) => {
                      const percentual = (despesa.valor / dados.totalDespesas) * 100;
                      return (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm">{despesa.categoria}</span>
                          <Badge variant="outline" className="text-yellow-600">
                            {formatPercentage(percentual)}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Concentração de custos pode indicar oportunidades de otimização
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};