import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingDown, TrendingUp, Users, Clock, Target } from 'lucide-react';
import { useRelatorioLTChurn } from '@/hooks/useRelatorioLTChurn';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  filtrosAplicados?: boolean;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function RelatorioLTChurn({ filtrosAplicados = false }: Props) {
  const { loading, dados, buscarRelatorio, limparDados } = useRelatorioLTChurn();
  const [dataInicio, setDataInicio] = useState('2024-01-01');
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [agrupamento, setAgrupamento] = useState<'mensal' | 'trimestral' | 'anual'>('mensal');

  useEffect(() => {
    console.log('🔍 [RelatorioLTChurn] useEffect triggered', { filtrosAplicados, dataInicio, dataFim, agrupamento });
    // Carregar dados sempre, independente de filtrosAplicados
    buscarRelatorio({ dataInicio, dataFim, agrupamento });
  }, [dataInicio, dataFim, agrupamento, buscarRelatorio]);

  const aplicarFiltros = () => {
    console.log('🔍 [RelatorioLTChurn] Aplicando filtros manualmente', { dataInicio, dataFim, agrupamento });
    buscarRelatorio({ dataInicio, dataFim, agrupamento });
  };

  return (
    <div className="space-y-6">
      {/* Controles de Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros do Relatório</CardTitle>
          <CardDescription>Configure o período e tipo de agrupamento para análise</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input
                id="dataFim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Agrupamento</Label>
              <Select value={agrupamento} onValueChange={(value: 'mensal' | 'trimestral' | 'anual') => setAgrupamento(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={aplicarFiltros} className="w-full">
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!loading && !dados && (
        <div className="text-center py-8">
          <div className="flex flex-col items-center space-y-2">
            <Target className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nenhum dado encontrado para o período selecionado
            </p>
          </div>
        </div>
      )}

      {!loading && dados && (
        <>
          {/* Métricas Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <Users className="h-4 w-4 mr-2 text-primary" />
                  Total de Fornecedores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{dados.total_fornecedores}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                  Fornecedores Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">{dados.fornecedores_ativos}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <TrendingDown className="h-4 w-4 mr-2 text-red-600" />
                  Fornecedores Churned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">{dados.fornecedores_churned}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-blue-600" />
                  LT Médio Geral
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">{dados.lt_medio_geral} dias</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <Target className="h-4 w-4 mr-2 text-purple-600" />
                  Churn Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">{dados.churn_rate_periodo}%</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-orange-600" />
                  LT Médio Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-700">{dados.lt_medio_ativos} dias</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Curva de Sobrevivência */}
            {dados.curva_sobrevivencia && dados.curva_sobrevivencia.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Curva de Sobrevivência</CardTitle>
                  <CardDescription>Percentual de fornecedores que permanecem ativos ao longo do tempo</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      taxa_sobrevivencia: {
                        label: "Taxa de Sobrevivência (%)",
                        color: "hsl(var(--chart-1))",
                      },
                    }}
                    className="h-80"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dados.curva_sobrevivencia}>
                        <XAxis 
                          dataKey="dias" 
                          type="number"
                          scale="linear"
                          domain={[0, 'dataMax']}
                          tickFormatter={(value) => `${value}d`}
                        />
                        <YAxis 
                          tickFormatter={(value) => `${value}%`}
                        />
                        <ChartTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length > 0) {
                              const data = payload[0].payload;
                              return (
                                <div className="rounded-lg border bg-background p-2 shadow-md">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col">
                                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                                        Dias
                                      </span>
                                      <span className="font-bold text-muted-foreground">
                                        {data.dias}
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                                        Taxa
                                      </span>
                                      <span className="font-bold">
                                        {data.taxa_sobrevivencia}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      Sobreviventes
                                    </span>
                                    <span className="font-bold">
                                      {data.sobreviventes} fornecedores
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="taxa_sobrevivencia" 
                          stroke="hsl(var(--chart-1))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {/* Churn Rate por Coorte */}
            {dados.coortes_dados && dados.coortes_dados.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Churn Rate por Coorte</CardTitle>
                  <CardDescription>Taxa de churn por período de cadastro</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      churn_rate: {
                        label: "Churn Rate (%)",
                        color: "hsl(var(--chart-2))",
                      },
                    }}
                    className="h-80"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dados.coortes_dados}>
                        <XAxis dataKey="coorte" />
                        <YAxis tickFormatter={(value) => `${value}%`} />
                        <ChartTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length > 0) {
                              const data = payload[0].payload;
                              return (
                                <div className="rounded-lg border bg-background p-2 shadow-md">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col">
                                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                                        Coorte
                                      </span>
                                      <span className="font-bold text-muted-foreground">
                                        {data.coorte}
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                                        Churn Rate
                                      </span>
                                      <span className="font-bold">
                                        {data.churn_rate}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="flex flex-col">
                                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                                        Total
                                      </span>
                                      <span className="font-bold">
                                        {data.total_cadastrados}
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                                        Ativos
                                      </span>
                                      <span className="font-bold text-green-600">
                                        {data.ainda_ativos}
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                                        Churned
                                      </span>
                                      <span className="font-bold text-red-600">
                                        {data.churned}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="churn_rate" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {/* Distribuição de Lifetime */}
            {dados.distribuicao_lt?.faixas && dados.distribuicao_lt.faixas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Lifetime</CardTitle>
                  <CardDescription>Como se distribui o tempo de vida dos fornecedores</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      quantidade: {
                        label: "Quantidade",
                        color: "hsl(var(--chart-3))",
                      },
                    }}
                    className="h-80"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dados.distribuicao_lt.faixas}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ faixa, percentual }) => `${faixa}: ${percentual}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="quantidade"
                        >
                          {dados.distribuicao_lt.faixas.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length > 0) {
                              const data = payload[0].payload;
                              return (
                                <div className="rounded-lg border bg-background p-2 shadow-md">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col">
                                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                                        Faixa
                                      </span>
                                      <span className="font-bold text-muted-foreground">
                                        {data.faixa}
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                                        Percentual
                                      </span>
                                      <span className="font-bold">
                                        {data.percentual}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      Quantidade
                                    </span>
                                    <span className="font-bold">
                                      {data.quantidade} fornecedores
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {/* LT Médio por Coorte */}
            {dados.coortes_dados && dados.coortes_dados.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Lifetime Médio por Coorte</CardTitle>
                  <CardDescription>Tempo médio de permanência por período de cadastro</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      lt_medio: {
                        label: "LT Médio (dias)",
                        color: "hsl(var(--chart-4))",
                      },
                    }}
                    className="h-80"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dados.coortes_dados}>
                        <XAxis dataKey="coorte" />
                        <YAxis tickFormatter={(value) => `${value}d`} />
                        <ChartTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length > 0) {
                              const data = payload[0].payload;
                              return (
                                <div className="rounded-lg border bg-background p-2 shadow-md">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col">
                                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                                        Coorte
                                      </span>
                                      <span className="font-bold text-muted-foreground">
                                        {data.coorte}
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                                        LT Médio
                                      </span>
                                      <span className="font-bold">
                                        {data.lt_medio} dias
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="lt_medio" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Análise por Coorte - Tabela Detalhada */}
          {dados.coortes_dados && dados.coortes_dados.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Análise Detalhada por Coorte</CardTitle>
                <CardDescription>Visão completa do comportamento por período de cadastro</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coorte</TableHead>
                      <TableHead className="text-center">Total Cadastrados</TableHead>
                      <TableHead className="text-center">Ainda Ativos</TableHead>
                      <TableHead className="text-center">Churned</TableHead>
                      <TableHead className="text-center">Churn Rate</TableHead>
                      <TableHead className="text-center">LT Médio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dados.coortes_dados.map((coorte, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{coorte.coorte}</TableCell>
                        <TableCell className="text-center">{coorte.total_cadastrados}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {coorte.ainda_ativos}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive" className="bg-red-100 text-red-800">
                            {coorte.churned}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={coorte.churn_rate > 50 ? "destructive" : "secondary"}
                            className={
                              coorte.churn_rate > 50 
                                ? "bg-red-100 text-red-800" 
                                : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {coorte.churn_rate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{coorte.lt_medio} dias</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Estatísticas de Distribuição de Lifetime */}
          {dados.distribuicao_lt?.percentis && (
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas de Lifetime</CardTitle>
                <CardDescription>Distribuição dos tempos de vida dos fornecedores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{dados.distribuicao_lt.percentis.p25}</div>
                    <div className="text-sm text-muted-foreground">P25 (dias)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{dados.distribuicao_lt.percentis.p50}</div>
                    <div className="text-sm text-muted-foreground">Mediana (dias)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{dados.distribuicao_lt.percentis.p75}</div>
                    <div className="text-sm text-muted-foreground">P75 (dias)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{dados.distribuicao_lt.percentis.p90}</div>
                    <div className="text-sm text-muted-foreground">P90 (dias)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{dados.distribuicao_lt.percentis.p95}</div>
                    <div className="text-sm text-muted-foreground">P95 (dias)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}