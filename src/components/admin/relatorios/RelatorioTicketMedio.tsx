import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, DollarSign, TrendingUp, BarChartHorizontal, Hash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  dataInicio: string;
  dataFim: string;
}

interface OrcamentoData {
  budget_informado: number;
  created_at: string;
}

interface DadosMensal {
  mes: string;
  mesLabel: string;
  ticketMedio: number;
  ticketMediano: number;
  quantidade: number;
  total: number;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--muted))'];

const FAIXAS = [
  { nome: 'Até R$10k', min: 0, max: 10000 },
  { nome: 'R$10k-30k', min: 10000, max: 30000 },
  { nome: 'R$30k-60k', min: 30000, max: 60000 },
  { nome: 'R$60k-100k', min: 60000, max: 100000 },
  { nome: 'R$100k-200k', min: 100000, max: 200000 },
  { nome: 'Acima R$200k', min: 200000, max: Infinity },
];

function calcularMediano(valores: number[]): number {
  if (valores.length === 0) return 0;
  const sorted = [...valores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function RelatorioTicketMedio({ dataInicio, dataFim }: Props) {
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<OrcamentoData[]>([]);

  useEffect(() => {
    if (dataInicio && dataFim) carregarDados();
  }, [dataInicio, dataFim]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      let allData: OrcamentoData[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('orcamentos')
          .select('budget_informado, created_at')
          .not('budget_informado', 'is', null)
          .gte('created_at', `${dataInicio}T00:00:00`)
          .lte('created_at', `${dataFim}T23:59:59`)
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allData = [...allData, ...data.map(d => ({ budget_informado: d.budget_informado as number, created_at: d.created_at }))];
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      setDados(allData);
    } catch (error) {
      console.error('Erro ao carregar dados de ticket médio:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (dados.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Nenhum orçamento com budget informado encontrado no período.</p>
        </CardContent>
      </Card>
    );
  }

  const valores = dados.map(d => d.budget_informado);
  const totalAcumulado = valores.reduce((s, v) => s + v, 0);
  const ticketMedio = totalAcumulado / valores.length;
  const ticketMediano = calcularMediano(valores);

  // Dados por mês
  const porMes = new Map<string, number[]>();
  dados.forEach(d => {
    const mes = d.created_at.substring(0, 7); // yyyy-MM
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes)!.push(d.budget_informado);
  });

  const dadosMensais: DadosMensal[] = Array.from(porMes.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, vals]) => {
      const total = vals.reduce((s, v) => s + v, 0);
      return {
        mes,
        mesLabel: format(parseISO(`${mes}-01`), 'MMM/yy', { locale: ptBR }),
        ticketMedio: Math.round(total / vals.length),
        ticketMediano: Math.round(calcularMediano(vals)),
        quantidade: vals.length,
        total: Math.round(total),
      };
    });

  // Dados por faixa
  const dadosFaixas = FAIXAS.map(faixa => {
    const count = valores.filter(v => v >= faixa.min && v < faixa.max).length;
    return {
      nome: faixa.nome,
      valor: count,
      percentual: Math.round((count / valores.length) * 100),
    };
  }).filter(f => f.valor > 0);

  const exportarCSV = () => {
    const csvContent = [
      'Mês,Ticket Médio,Ticket Mediano,Quantidade,Total',
      ...dadosMensais.map(d => `${d.mes},${d.ticketMedio},${d.ticketMediano},${d.quantidade},${d.total}`),
      '',
      `Geral,${Math.round(ticketMedio)},${Math.round(ticketMediano)},${valores.length},${Math.round(totalAcumulado)}`
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ticket_medio_${dataInicio}_${dataFim}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Ticket Médio dos Orçamentos</h3>
          <p className="text-sm text-muted-foreground">
            Análise baseada no budget informado pelos clientes
          </p>
        </div>
        <Button onClick={exportarCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">{formatarMoeda(ticketMedio)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChartHorizontal className="h-5 w-5 text-chart-2" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ticket Mediano</p>
                <p className="text-2xl font-bold">{formatarMoeda(ticketMediano)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Hash className="h-5 w-5 text-chart-3" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Orçamentos com Budget</p>
                <p className="text-2xl font-bold">{valores.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-chart-4" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Acumulado</p>
                <p className="text-2xl font-bold">{formatarMoeda(totalAcumulado)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ticket Médio por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ ticketMedio: { label: "Ticket Médio", color: "hsl(var(--chart-1))" } }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosMensais}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mesLabel" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Bar dataKey="ticketMedio" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => [formatarMoeda(value), 'Ticket Médio']}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Faixa de Valor</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ valor: { label: "Quantidade", color: "hsl(var(--chart-2))" } }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosFaixas}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ nome, percentual }) => `${nome}: ${percentual}%`}
                    outerRadius={80}
                    dataKey="valor"
                  >
                    {dadosFaixas.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela mês a mês */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
                <TableHead className="text-right">Ticket Mediano</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dadosMensais.map((d) => (
                <TableRow key={d.mes}>
                  <TableCell className="font-medium capitalize">{d.mesLabel}</TableCell>
                  <TableCell className="text-right">{d.quantidade}</TableCell>
                  <TableCell className="text-right">{formatarMoeda(d.ticketMedio)}</TableCell>
                  <TableCell className="text-right">{formatarMoeda(d.ticketMediano)}</TableCell>
                  <TableCell className="text-right">{formatarMoeda(d.total)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted/50">
                <TableCell>Total Geral</TableCell>
                <TableCell className="text-right">{valores.length}</TableCell>
                <TableCell className="text-right">{formatarMoeda(ticketMedio)}</TableCell>
                <TableCell className="text-right">{formatarMoeda(ticketMediano)}</TableCell>
                <TableCell className="text-right">{formatarMoeda(totalAcumulado)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
