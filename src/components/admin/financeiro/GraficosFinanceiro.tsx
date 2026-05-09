import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ComposedChart
} from 'recharts';
import type { DashboardFinanceiro } from '@/types/financeiro';

interface GraficosFinanceiroProps {
  dashboard: DashboardFinanceiro;
}

export const GraficosFinanceiro = ({ dashboard }: GraficosFinanceiroProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Dados para gráfico temporal de receitas vs despesas mensais
  const dadosReceitasDespesasMensais = dashboard.receitasDespesasMensais.length > 0 
    ? dashboard.receitasDespesasMensais 
    : [{ mes: 'Sem dados', receitas: 0, despesas: 0, saldoLiquido: 0 }];

  // Dados para gráfico de pizza (Distribuição)
  const dadosPizza = [
    { name: 'A Receber', value: dashboard.totalReceber, color: '#22c55e' },
    { name: 'A Pagar', value: dashboard.totalPagar, color: '#ef4444' }
  ].filter(item => item.value > 0);

  // Dados para projeção de fluxo de caixa baseado em contas pendentes
  const dadosProjecao = dashboard.projecaoFluxoCaixa.length > 0 
    ? dashboard.projecaoFluxoCaixa 
    : [{ mes: 'Sem dados', entrada: 0, saida: 0, saldo: 0, saldoAcumulado: 0 }];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico Temporal de Receitas vs Despesas */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Receitas vs Despesas Mensais (Próximos {dashboard.periodoSelecionado} dias)</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard.receitasDespesasMensais.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={dadosReceitasDespesasMensais}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  formatter={(value, name) => [
                    formatCurrency(Number(value)), 
                    name === 'receitas' ? 'Receitas' : 
                    name === 'despesas' ? 'Despesas' : 'Saldo Líquido'
                  ]}
                  labelFormatter={(label) => `Mês: ${label}`}
                />
                <Bar dataKey="receitas" fill="#22c55e" name="Receitas" />
                <Bar dataKey="despesas" fill="#ef4444" name="Despesas" />
                <Line 
                  type="monotone" 
                  dataKey="saldoLiquido" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="Saldo Líquido"
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <p>Não há dados suficientes para exibir o gráfico temporal</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Pizza - Distribuição */}
      {dadosPizza.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Valores</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={dadosPizza}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dadosPizza.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Projeção do Fluxo de Caixa */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Projeção do Fluxo de Caixa (Próximos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard.projecaoFluxoCaixa.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={dadosProjecao}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  formatter={(value, name) => [
                    formatCurrency(Number(value)), 
                    name === 'entrada' ? 'Entradas' : 
                    name === 'saida' ? 'Saídas' : 'Saldo Acumulado'
                  ]}
                  labelFormatter={(label) => `Mês: ${label}`}
                />
                <Bar dataKey="entrada" fill="#22c55e" name="Entradas" />
                <Bar dataKey="saida" fill="#ef4444" name="Saídas" />
                <Line 
                  type="monotone" 
                  dataKey="saldoAcumulado" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="Saldo Acumulado"
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <p>Não há contas pendentes para projetar o fluxo de caixa</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};