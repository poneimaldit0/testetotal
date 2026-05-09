import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CalendarDays, Loader2, Snowflake, Thermometer, Flame, ClipboardCheck, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRelatorioAvaliacoesLeads, MetricasAvaliacoesLeads, AvaliacaoLeadDetalhada } from '@/hooks/useRelatorioAvaliacoesLeads';

export function RelatorioAvaliacoesLeads() {
  const { carregando, buscarMetricasAvaliacoes, buscarListaAvaliacoes } = useRelatorioAvaliacoesLeads();
  
  const [dataInicio, setDataInicio] = useState(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filtrosAplicados, setFiltrosAplicados] = useState(false);
  
  const [metricas, setMetricas] = useState<MetricasAvaliacoesLeads | null>(null);
  const [lista, setLista] = useState<AvaliacaoLeadDetalhada[]>([]);

  const carregarDados = useCallback(async () => {
    const [metricasData, listaData] = await Promise.all([
      buscarMetricasAvaliacoes(dataInicio, dataFim),
      buscarListaAvaliacoes(dataInicio, dataFim)
    ]);
    
    setMetricas(metricasData);
    setLista(listaData);
    setFiltrosAplicados(true);
  }, [dataInicio, dataFim, buscarMetricasAvaliacoes, buscarListaAvaliacoes]);

  const getClassificacao = (pontuacao: number) => {
    if (pontuacao <= 3) return { label: 'Frio', icon: Snowflake, color: 'bg-blue-100 text-blue-700' };
    if (pontuacao <= 6) return { label: 'Morno', icon: Thermometer, color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Quente', icon: Flame, color: 'bg-red-100 text-red-700' };
  };

  const dadosGrafico = metricas ? [
    { name: 'Frios (0-3)', value: metricas.total_frios, color: 'hsl(210, 100%, 70%)' },
    { name: 'Mornos (4-6)', value: metricas.total_mornos, color: 'hsl(45, 100%, 60%)' },
    { name: 'Quentes (7-10)', value: metricas.total_quentes, color: 'hsl(0, 80%, 60%)' }
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dataInicio">Data Início</Label>
          <Input
            id="dataInicio"
            type="date"
            value={dataInicio}
            onChange={(e) => {
              setDataInicio(e.target.value);
              setFiltrosAplicados(false);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dataFim">Data Fim</Label>
          <Input
            id="dataFim"
            type="date"
            value={dataFim}
            onChange={(e) => {
              setDataFim(e.target.value);
              setFiltrosAplicados(false);
            }}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={carregarDados} className="w-full" disabled={carregando}>
            {carregando ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CalendarDays className="h-4 w-4 mr-2" />
            )}
            Aplicar Filtros
          </Button>
        </div>
      </div>

      {!filtrosAplicados ? (
        <div className="text-center py-12">
          <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Defina as datas e clique em "Aplicar Filtros" para visualizar o relatório
          </p>
        </div>
      ) : carregando ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Avaliações</p>
                    <p className="text-3xl font-bold">{metricas?.total_avaliacoes || 0}</p>
                  </div>
                  <ClipboardCheck className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Média de Pontuação</p>
                    <p className="text-3xl font-bold">{metricas?.media_pontuacao || 0}<span className="text-lg text-muted-foreground">/10</span></p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Leads Frios</p>
                    <p className="text-3xl font-bold text-blue-600">{metricas?.percentual_frios || 0}%</p>
                    <p className="text-xs text-muted-foreground">{metricas?.total_frios || 0} leads</p>
                  </div>
                  <Snowflake className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Leads Quentes</p>
                    <p className="text-3xl font-bold text-red-600">{metricas?.percentual_quentes || 0}%</p>
                    <p className="text-xs text-muted-foreground">{metricas?.total_quentes || 0} leads</p>
                  </div>
                  <Flame className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Distribuição */}
          {dadosGrafico.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuição por Classificação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosGrafico}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {dadosGrafico.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabela de Avaliações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lista de Avaliações</CardTitle>
            </CardHeader>
            <CardContent>
              {lista.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma avaliação encontrada no período selecionado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Orçamento</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-center">Pontuação</TableHead>
                      <TableHead className="text-center">Classificação</TableHead>
                      <TableHead>Avaliado por</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lista.map((avaliacao) => {
                      const classificacao = getClassificacao(avaliacao.pontuacao_total);
                      const IconeClass = classificacao.icon;
                      
                      return (
                        <TableRow key={avaliacao.id}>
                          <TableCell className="font-medium">
                            {avaliacao.codigo_orcamento || 'N/A'}
                          </TableCell>
                          <TableCell>{avaliacao.cliente_nome}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="font-bold">
                              {avaliacao.pontuacao_total}/10
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={classificacao.color}>
                              <IconeClass className="h-3 w-3 mr-1" />
                              {classificacao.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{avaliacao.avaliado_por_nome || 'Sistema'}</TableCell>
                          <TableCell>
                            {format(new Date(avaliacao.data_avaliacao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
