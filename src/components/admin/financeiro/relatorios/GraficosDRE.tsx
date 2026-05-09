import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import type { DadosDRE } from '@/hooks/useDRE';

interface GraficosDREProps {
  dados: DadosDRE;
}

export const GraficosDRE = ({ dados }: GraficosDREProps) => {
  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Dados para gráfico de pizza de receitas
  const dadosReceitasPizza = dados.receitas.map(receita => ({
    name: receita.categoria,
    value: receita.valor,
    percentage: ((receita.valor / dados.totalReceitas) * 100).toFixed(1)
  }));

  // Dados para gráfico de pizza de despesas
  const dadosDespesasPizza = dados.despesas.map(despesa => ({
    name: despesa.categoria,
    value: despesa.valor,
    percentage: ((despesa.valor / dados.totalDespesas) * 100).toFixed(1)
  }));

  // Dados para gráfico de barras comparativo
  const dadosComparativo = [
    {
      categoria: 'Receitas',
      valor: dados.totalReceitas,
      tipo: 'receita'
    },
    {
      categoria: 'Despesas',
      valor: dados.totalDespesas,
      tipo: 'despesa'
    },
    {
      categoria: 'Resultado',
      valor: dados.resultadoOperacional,
      tipo: dados.resultadoOperacional >= 0 ? 'lucro' : 'prejuizo'
    }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm">
            {`${payload[0].name}: ${formatCurrency(payload[0].value)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">{formatCurrency(data.value)}</p>
          <p className="text-xs text-muted-foreground">{data.percentage}% do total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Gráfico Resumo */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dadosComparativo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="categoria" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="valor" 
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Receitas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Distribuição de Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            {dadosReceitasPizza.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dadosReceitasPizza}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                  >
                    {dadosReceitasPizza.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Nenhuma receita encontrada no período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Despesas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Distribuição de Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            {dadosDespesasPizza.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dadosDespesasPizza}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                  >
                    {dadosDespesasPizza.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Nenhuma despesa encontrada no período
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};