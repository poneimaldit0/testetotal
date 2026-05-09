import { CSRitualSemanal } from '@/types/customerSuccess';
import { gerarDadosEvolucao } from '@/utils/calcularMetricasCS';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

interface CSEvolucaoGraficoProps {
  rituais: CSRitualSemanal[];
}

const chartConfig = {
  inscricoes: {
    label: 'Inscrições',
    color: 'hsl(var(--chart-1))',
  },
  visitas: {
    label: 'Visitas',
    color: 'hsl(var(--chart-2))',
  },
  orcamentos: {
    label: 'Orçamentos',
    color: 'hsl(var(--chart-3))',
  },
  contratos: {
    label: 'Contratos',
    color: 'hsl(var(--chart-4))',
  },
};

export function CSEvolucaoGrafico({ rituais }: CSEvolucaoGraficoProps) {
  const dados = gerarDadosEvolucao(rituais);

  if (dados.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📉 Evolução Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Complete pelo menos 2 semanas para ver o gráfico de evolução.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">📉 Evolução Acumulada por Semana</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <LineChart data={dados} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="semana" 
              tickFormatter={(v) => `S${v}`}
              className="text-xs"
            />
            <YAxis className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="inscricoes"
              stroke="var(--color-inscricoes)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="visitas"
              stroke="var(--color-visitas)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="orcamentos"
              stroke="var(--color-orcamentos)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="contratos"
              stroke="var(--color-contratos)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
