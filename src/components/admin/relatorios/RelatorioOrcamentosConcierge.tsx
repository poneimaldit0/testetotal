import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Cell } from 'recharts';
import { FilterX, Users, TrendingUp, Calendar, Award, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RelatorioOrcamentosConciergeData {
  mes: string;
  gestor_conta_id: string;
  gestor_nome: string;
  total_orcamentos: number;
}

interface RelatorioOrcamentosConciergeProps {
  dataInicio?: string;
  dataFim?: string;
  onDataInicioChange?: (value: string) => void;
  onDataFimChange?: (value: string) => void;
}

// Cores para os concierges no gráfico
const CORES_CONCIERGE = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)', // verde
  'hsl(262, 83%, 58%)', // roxo
  'hsl(38, 92%, 50%)',  // amarelo
  'hsl(346, 77%, 49%)', // rosa
  'hsl(199, 89%, 48%)', // azul claro
  'hsl(24, 95%, 53%)',  // laranja
  'hsl(173, 80%, 40%)', // teal
  'hsl(291, 64%, 42%)', // magenta
  'hsl(47, 84%, 49%)',  // dourado
];

// Cor especial para "Sem Gestor"
const COR_SEM_GESTOR = 'hsl(0, 84%, 60%)'; // vermelho

// Helper para obter cor do concierge
const getCorConcierge = (nome: string, idx: number): string => {
  if (nome === 'Sem Gestor') return COR_SEM_GESTOR;
  return CORES_CONCIERGE[idx % CORES_CONCIERGE.length];
};

export const RelatorioOrcamentosConcierge = ({
  dataInicio: dataInicioProps,
  dataFim: dataFimProps,
  onDataInicioChange,
  onDataFimChange
}: RelatorioOrcamentosConciergeProps) => {
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState<RelatorioOrcamentosConciergeData[]>([]);
  const [filtrosAplicados, setFiltrosAplicados] = useState(false);
  
  // Datas padrão: ano atual
  const [dataInicioLocal, setDataInicioLocal] = useState(
    dataInicioProps || format(startOfYear(new Date()), 'yyyy-MM-dd')
  );
  const [dataFimLocal, setDataFimLocal] = useState(
    dataFimProps || format(new Date(), 'yyyy-MM-dd')
  );

  const dataInicio = dataInicioProps ?? dataInicioLocal;
  const dataFim = dataFimProps ?? dataFimLocal;

  const handleDataInicioChange = (value: string) => {
    if (onDataInicioChange) {
      onDataInicioChange(value);
    } else {
      setDataInicioLocal(value);
    }
    setFiltrosAplicados(false);
  };

  const handleDataFimChange = (value: string) => {
    if (onDataFimChange) {
      onDataFimChange(value);
    } else {
      setDataFimLocal(value);
    }
    setFiltrosAplicados(false);
  };

  const buscarDados = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('relatorio_orcamentos_por_concierge', {
        p_data_inicio: dataInicio,
        p_data_fim: dataFim
      });

      if (error) {
        console.error('Erro ao buscar relatório:', error);
        toast.error('Erro ao carregar relatório de apropriações');
        return;
      }

      setDados(data || []);
      setFiltrosAplicados(true);
    } catch (error) {
      console.error('Erro ao buscar relatório:', error);
      toast.error('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  // Processa dados para o gráfico de barras empilhadas
  const { dadosGrafico, concierges, chartConfig } = useMemo(() => {
    if (dados.length === 0) return { dadosGrafico: [], concierges: [], chartConfig: {} as ChartConfig };

    // Lista única de concierges
    const conciergeLista = [...new Set(dados.map(d => d.gestor_nome))].sort();
    
    // Lista única de meses
    const meses = [...new Set(dados.map(d => d.mes))].sort();

    // Monta dados para o gráfico
    const dadosChart = meses.map(mes => {
      const mesFormatado = format(new Date(mes + 'T12:00:00'), 'MMM/yy', { locale: ptBR });
      const entry: Record<string, string | number> = { mes: mesFormatado, mesOriginal: mes };
      
      conciergeLista.forEach(concierge => {
        const registro = dados.find(d => d.mes === mes && d.gestor_nome === concierge);
        entry[concierge] = registro?.total_orcamentos || 0;
      });
      
      return entry;
    });

    // Config para o chart - "Sem Gestor" primeiro na lista para destaque
    const conciergeOrdenado = conciergeLista.includes('Sem Gestor') 
      ? ['Sem Gestor', ...conciergeLista.filter(c => c !== 'Sem Gestor')]
      : conciergeLista;

    const config: ChartConfig = {};
    conciergeOrdenado.forEach((nome, idx) => {
      config[nome] = {
        label: nome,
        color: getCorConcierge(nome, idx)
      };
    });

    return { dadosGrafico: dadosChart, concierges: conciergeLista, chartConfig: config };
  }, [dados]);

  // Métricas de resumo
  const metricas = useMemo(() => {
    if (dados.length === 0) return null;

    const total = dados.reduce((acc, d) => acc + d.total_orcamentos, 0);
    const mesesUnicos = [...new Set(dados.map(d => d.mes))].length;
    const media = mesesUnicos > 0 ? Math.round(total / mesesUnicos) : 0;
    
    // Concierge com mais apropriações
    const porConcierge = dados.reduce((acc, d) => {
      acc[d.gestor_nome] = (acc[d.gestor_nome] || 0) + d.total_orcamentos;
      return acc;
    }, {} as Record<string, number>);
    
    const topConcierge = Object.entries(porConcierge).sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      media,
      mesesAnalisados: mesesUnicos,
      topConcierge: topConcierge ? { nome: topConcierge[0], quantidade: topConcierge[1] } : null
    };
  }, [dados]);

  // Tabela pivot: meses x concierges
  const tabelaPivot = useMemo(() => {
    if (dados.length === 0) return { linhas: [], colunas: [] };

    const meses = [...new Set(dados.map(d => d.mes))].sort().reverse();
    const colunas = [...new Set(dados.map(d => d.gestor_nome))].sort();
    
    const linhas = meses.map(mes => {
      const mesFormatado = format(new Date(mes + 'T12:00:00'), 'MMM/yyyy', { locale: ptBR });
      const row: Record<string, number | string> = { mes: mesFormatado };
      let totalMes = 0;
      
      colunas.forEach(concierge => {
        const registro = dados.find(d => d.mes === mes && d.gestor_nome === concierge);
        const valor = registro?.total_orcamentos || 0;
        row[concierge] = valor;
        totalMes += valor;
      });
      
      row.total = totalMes;
      return row;
    });

    return { linhas, colunas };
  }, [dados]);

  // Exportar CSV
  const exportarCSV = () => {
    if (dados.length === 0) return;

    const { linhas, colunas } = tabelaPivot;
    const cabecalho = ['Mês', ...colunas, 'Total'];
    
    const csvLinhas = linhas.map(linha => {
      const valores = [
        linha.mes,
        ...colunas.map(c => String(linha[c] || 0)),
        String(linha.total || 0)
      ];
      return valores.join(';');
    });

    const csv = [cabecalho.join(';'), ...csvLinhas].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_apropriacoes_concierge_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    
    toast.success('Relatório exportado com sucesso!');
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => handleDataInicioChange(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input
                id="dataFim"
                type="date"
                value={dataFim}
                onChange={(e) => handleDataFimChange(e.target.value)}
              />
            </div>
            <Button 
              onClick={buscarDados} 
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? 'Carregando...' : 'Aplicar Filtros'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!filtrosAplicados ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FilterX className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aplique os filtros para visualizar o relatório</h3>
            <p className="text-muted-foreground text-center">
              Selecione o período desejado e clique em "Aplicar Filtros" para gerar o relatório de apropriações por concierge.
            </p>
          </CardContent>
        </Card>
      ) : dados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dado encontrado</h3>
            <p className="text-muted-foreground text-center">
              Não há orçamentos apropriados no período selecionado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cards de Resumo */}
          {metricas && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Apropriados</p>
                      <p className="text-2xl font-bold">{metricas.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Média Mensal</p>
                      <p className="text-2xl font-bold">{metricas.media}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-purple-500/10">
                      <Calendar className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Meses Analisados</p>
                      <p className="text-2xl font-bold">{metricas.mesesAnalisados}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-yellow-500/10">
                      <Award className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Top Concierge</p>
                      <p className="text-lg font-bold truncate">{metricas.topConcierge?.nome}</p>
                      <p className="text-sm text-muted-foreground">{metricas.topConcierge?.quantidade} apropriações</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Gráfico de Barras Empilhadas */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução Mensal por Concierge</CardTitle>
              <CardDescription>
                Distribuição de orçamentos apropriados por mês e concierge
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosGrafico} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="mes" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    {concierges.map((concierge, idx) => (
                      <Bar
                        key={concierge}
                        dataKey={concierge}
                        stackId="a"
                        fill={getCorConcierge(concierge, idx)}
                        name={concierge}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Tabela Detalhada */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tabela Detalhada</CardTitle>
                <CardDescription>
                  Quantidade de orçamentos apropriados por mês e concierge
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportarCSV}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background">Mês</TableHead>
                      {tabelaPivot.colunas.map(col => (
                        <TableHead 
                          key={col} 
                          className={`text-center whitespace-nowrap ${col === 'Sem Gestor' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : ''}`}
                        >
                          {col}
                        </TableHead>
                      ))}
                      <TableHead className="text-center font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tabelaPivot.linhas.map((linha, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="sticky left-0 bg-background font-medium">
                          {linha.mes}
                        </TableCell>
                        {tabelaPivot.colunas.map(col => {
                          const valor = linha[col] as number;
                          const isSemGestor = col === 'Sem Gestor';
                          return (
                            <TableCell 
                              key={col} 
                              className={`text-center ${isSemGestor ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
                            >
                              {valor > 0 ? (
                                <Badge 
                                  variant={isSemGestor ? "destructive" : valor >= 20 ? "default" : "secondary"}
                                  className={isSemGestor ? "animate-pulse" : ""}
                                >
                                  {valor}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-bold">
                            {linha.total}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default RelatorioOrcamentosConcierge;
