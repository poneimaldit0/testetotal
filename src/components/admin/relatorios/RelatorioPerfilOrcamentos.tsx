import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, BarChartHorizontal, TrendingUp, Users, Clock } from 'lucide-react';
import { useRelatoriosAdmin, RelatorioPerfilOrcamentos as IRelatorioPerfilOrcamentos } from '@/hooks/useRelatoriosAdmin';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface Props {
  dataInicio: string;
  dataFim: string;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--muted))'];

export function RelatorioPerfilOrcamentos({ dataInicio, dataFim }: Props) {
  const { buscarPerfilOrcamentos, loading } = useRelatoriosAdmin();
  const [dados, setDados] = useState<IRelatorioPerfilOrcamentos[]>([]);

  useEffect(() => {
    if (dataInicio && dataFim) {
      carregarDados();
    }
  }, [dataInicio, dataFim]);

  const carregarDados = async () => {
    try {
      const resultado = await buscarPerfilOrcamentos(dataInicio, dataFim);
      setDados(resultado);
    } catch (error) {
      console.error('Erro ao carregar perfil de orçamentos:', error);
    }
  };

  const exportarDados = () => {
    if (dados.length === 0) return;

    const csvContent = [
      'Métrica,Valor,Percentual',
      ...dados.flatMap(item => [
        `Total de Orçamentos,${item.total_orcamentos},-`,
        `Tamanho Médio (m²),${item.tamanho_medio},-`,
        `Tamanho Mediano (m²),${item.tamanho_mediano},-`,
        `0-10m²,${item.faixa_0_10},${item.perc_0_10}%`,
        `10-30m²,${item.faixa_10_30},${item.perc_10_30}%`,
        `30-60m²,${item.faixa_30_60},${item.perc_30_60}%`,
        `60-100m²,${item.faixa_60_100},${item.perc_60_100}%`,
        `100-150m²,${item.faixa_100_150},${item.perc_100_150}%`,
        `Acima de 150m²,${item.faixa_acima_150},${item.perc_acima_150}%`,
        `Imediato,${item.prazo_imediato},${item.perc_prazo_imediato}%`,
        `Até 3 meses,${item.prazo_3_meses},${item.perc_prazo_3_meses}%`,
        `3-6 meses,${item.prazo_6_meses},${item.perc_prazo_6_meses}%`,
        `6-9 meses,${item.prazo_9_meses},${item.perc_prazo_9_meses}%`,
        `9-12 meses,${item.prazo_12_meses},${item.perc_prazo_12_meses}%`,
        `Flexível,${item.prazo_flexivel},${item.perc_prazo_flexivel}%`,
        `Status Aberto,${item.status_abertos},${item.perc_abertos}%`,
        `Status Fechado,${item.status_fechados},${item.perc_fechados}%`
      ])
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `perfil_orcamentos_${dataInicio}_${dataFim}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <p className="text-muted-foreground">Nenhum dado encontrado para o período selecionado.</p>
        </CardContent>
      </Card>
    );
  }

  const dadosPerfil = dados[0];

  // Dados para gráfico de tamanhos
  const dadosTamanhos = [
    { nome: '0-10m²', valor: dadosPerfil.faixa_0_10, percentual: dadosPerfil.perc_0_10 },
    { nome: '10-30m²', valor: dadosPerfil.faixa_10_30, percentual: dadosPerfil.perc_10_30 },
    { nome: '30-60m²', valor: dadosPerfil.faixa_30_60, percentual: dadosPerfil.perc_30_60 },
    { nome: '60-100m²', valor: dadosPerfil.faixa_60_100, percentual: dadosPerfil.perc_60_100 },
    { nome: '100-150m²', valor: dadosPerfil.faixa_100_150, percentual: dadosPerfil.perc_100_150 },
    { nome: '>150m²', valor: dadosPerfil.faixa_acima_150, percentual: dadosPerfil.perc_acima_150 }
  ].filter(item => item.valor > 0);

  // Dados para gráfico de prazos
  const dadosPrazos = [
    { nome: 'Imediato', valor: dadosPerfil.prazo_imediato, percentual: dadosPerfil.perc_prazo_imediato },
    { nome: 'Até 3 meses', valor: dadosPerfil.prazo_3_meses, percentual: dadosPerfil.perc_prazo_3_meses },
    { nome: '3-6 meses', valor: dadosPerfil.prazo_6_meses, percentual: dadosPerfil.perc_prazo_6_meses },
    { nome: '6-9 meses', valor: dadosPerfil.prazo_9_meses, percentual: dadosPerfil.perc_prazo_9_meses },
    { nome: '9-12 meses', valor: dadosPerfil.prazo_12_meses, percentual: dadosPerfil.perc_prazo_12_meses },
    { nome: 'Flexível', valor: dadosPerfil.prazo_flexivel, percentual: dadosPerfil.perc_prazo_flexivel }
  ].filter(item => item.valor > 0);

  return (
    <div className="space-y-6">
      {/* Header com botão de exportar */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Perfil dos Orçamentos</h3>
          <p className="text-sm text-muted-foreground">
            Análise detalhada do perfil dos orçamentos no período selecionado
          </p>
        </div>
        <Button onClick={exportarDados} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Cards com métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Orçamentos</p>
                <p className="text-2xl font-bold">{dadosPerfil.total_orcamentos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-chart-2" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tamanho Médio</p>
                <p className="text-2xl font-bold">{dadosPerfil.tamanho_medio}m²</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChartHorizontal className="h-5 w-5 text-chart-3" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tamanho Mediano</p>
                <p className="text-2xl font-bold">{dadosPerfil.tamanho_mediano}m²</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-chart-4" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Obras Imediatas</p>
                <p className="text-2xl font-bold">{dadosPerfil.perc_prazo_imediato}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de distribuição por tamanho */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Tamanho do Imóvel</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                valor: {
                  label: "Quantidade",
                  color: "hsl(var(--chart-1))"
                }
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosTamanhos}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ nome, percentual }) => `${nome}: ${percentual}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="valor"
                  >
                    {dadosTamanhos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico de distribuição por prazo */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Prazo de Início</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                valor: {
                  label: "Quantidade",
                  color: "hsl(var(--chart-2))"
                }
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosPrazos}>
                  <XAxis 
                    dataKey="nome" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Bar dataKey="valor" fill="hsl(var(--chart-2))" />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value, name) => [`${value} (${dadosPrazos.find(d => d.valor === value)?.percentual}%)`, 'Quantidade']}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top categorias */}
      {dadosPerfil.top_categorias && dadosPerfil.top_categorias.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Categorias Mais Solicitadas</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                quantidade: {
                  label: "Quantidade",
                  color: "hsl(var(--chart-3))"
                }
              }}
              className="h-[400px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={dadosPerfil.top_categorias.slice(0, 10)} 
                  layout="horizontal"
                  margin={{ left: 100 }}
                >
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="categoria" 
                    type="category" 
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Bar dataKey="quantidade" fill="hsl(var(--chart-3))" />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value, name, props) => [
                      `${value} (${props.payload.percentual}%)`, 
                      'Quantidade'
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabela detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Detalhados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Faixas de tamanho */}
            <div>
              <h4 className="font-medium mb-3">Faixas de Tamanho</h4>
              <div className="space-y-2">
                {dadosTamanhos.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 rounded bg-muted/50">
                    <span className="text-sm">{item.nome}</span>
                    <div className="text-right">
                      <div className="text-sm font-medium">{item.valor}</div>
                      <div className="text-xs text-muted-foreground">{item.percentual}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prazos */}
            <div>
              <h4 className="font-medium mb-3">Prazos de Início</h4>
              <div className="space-y-2">
                {dadosPrazos.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 rounded bg-muted/50">
                    <span className="text-sm">{item.nome}</span>
                    <div className="text-right">
                      <div className="text-sm font-medium">{item.valor}</div>
                      <div className="text-xs text-muted-foreground">{item.percentual}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <h4 className="font-medium mb-3">Status dos Orçamentos</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                  <span className="text-sm">Abertos</span>
                  <div className="text-right">
                    <div className="text-sm font-medium">{dadosPerfil.status_abertos}</div>
                    <div className="text-xs text-muted-foreground">{dadosPerfil.perc_abertos}%</div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                  <span className="text-sm">Fechados</span>
                  <div className="text-right">
                    <div className="text-sm font-medium">{dadosPerfil.status_fechados}</div>
                    <div className="text-xs text-muted-foreground">{dadosPerfil.perc_fechados}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}