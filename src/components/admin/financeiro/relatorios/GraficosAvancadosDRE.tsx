import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, ComposedChart, Area, AreaChart } from 'recharts';
import type { DadosDRE } from '@/hooks/useDRE';

interface GraficosAvancadosDREProps {
  dados: DadosDRE;
}

export const GraficosAvancadosDRE = ({ dados }: GraficosAvancadosDREProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Cores personalizadas
  const COLORS_RECEITAS = ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'];
  const COLORS_DESPESAS = ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'];

  // Dados para gráfico de barras comparativo
  const dadosComparativo = [...dados.receitas, ...dados.despesas].map(item => ({
    categoria: item.categoria,
    receitas: dados.receitas.find(r => r.categoria === item.categoria)?.valor || 0,
    despesas: dados.despesas.find(d => d.categoria === item.categoria)?.valor || 0,
    saldo: (dados.receitas.find(r => r.categoria === item.categoria)?.valor || 0) - 
           (dados.despesas.find(d => d.categoria === item.categoria)?.valor || 0)
  }));

  // Dados para gráfico de evolução (simulado baseado nas categorias)
  const dadosEvolucao = dados.receitas.map((receita, index) => ({
    categoria: receita.categoria,
    valor: receita.valor,
    percentual: (receita.valor / dados.totalReceitas) * 100,
    crescimento: Math.random() * 20 - 10 // Simulando crescimento entre -10% e +10%
  }));

  // Dados para análise de rentabilidade
  const dadosRentabilidade = dados.receitas.map(receita => {
    const despesaCorrespondente = dados.despesas.find(d => d.categoria === receita.categoria);
    const lucro = receita.valor - (despesaCorrespondente?.valor || 0);
    const margem = receita.valor > 0 ? (lucro / receita.valor) * 100 : 0;
    
    return {
      categoria: receita.categoria,
      receita: receita.valor,
      despesa: despesaCorrespondente?.valor || 0,
      lucro,
      margem
    };
  });

  // Dados para gráfico waterfall (cascata)
  const dadosWaterfall = [
    { nome: 'Receita Total', valor: dados.totalReceitas, tipo: 'positivo' },
    ...dados.despesas.map(despesa => ({
      nome: despesa.categoria,
      valor: -despesa.valor,
      tipo: 'negativo'
    })),
    { nome: 'Resultado Final', valor: dados.resultadoOperacional, tipo: dados.resultadoOperacional >= 0 ? 'positivo' : 'negativo' }
  ];

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.dataKey}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip para porcentagem
  const PercentTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{`${label}`}</p>
          <p style={{ color: payload[0].color }}>
            {`Valor: ${formatCurrency(payload[0].payload.valor)}`}
          </p>
          <p style={{ color: payload[0].color }}>
            {`Percentual: ${formatPercentage(payload[0].value)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Gráfico de Barras Comparativo */}
      <Card>
        <CardHeader>
          <CardTitle>Receitas vs Despesas por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={dadosComparativo} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="categoria" 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="receitas" fill="#22c55e" name="Receitas" />
              <Bar dataKey="despesas" fill="#ef4444" name="Despesas" />
              <Bar dataKey="saldo" fill="#3b82f6" name="Saldo" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráficos de Pizza Lado a Lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Distribuição de Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dados.receitas.map(receita => ({
                    name: receita.categoria,
                    value: (receita.valor / dados.totalReceitas) * 100,
                    valor: receita.valor
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                >
                  {dados.receitas.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS_RECEITAS[index % COLORS_RECEITAS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PercentTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Distribuição de Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dados.despesas.map(despesa => ({
                    name: despesa.categoria,
                    value: (despesa.valor / dados.totalDespesas) * 100,
                    valor: despesa.valor
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                >
                  {dados.despesas.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS_DESPESAS[index % COLORS_DESPESAS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PercentTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Rentabilidade por Categoria */}
      <Card>
        <CardHeader>
          <CardTitle>Análise de Rentabilidade por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={dadosRentabilidade} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="categoria" 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis yAxisId="left" tickFormatter={formatCurrency} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar yAxisId="left" dataKey="receita" fill="#22c55e" name="Receita" />
              <Bar yAxisId="left" dataKey="despesa" fill="#ef4444" name="Despesa" />
              <Line yAxisId="right" type="monotone" dataKey="margem" stroke="#8884d8" strokeWidth={3} name="Margem %" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico Waterfall (Cascata) */}
      <Card>
        <CardHeader>
          <CardTitle>Análise de Contribuição (Waterfall)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={dadosWaterfall} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="nome" 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="valor" 
                fill="#3b82f6"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Área Chart de Tendência */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Participação das Receitas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dadosEvolucao} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="categoria" 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tickFormatter={(value) => `${value}%`} />
              <Tooltip content={<PercentTooltip />} />
              <Area 
                type="monotone" 
                dataKey="percentual" 
                stackId="1" 
                stroke="#22c55e" 
                fill="#22c55e" 
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};